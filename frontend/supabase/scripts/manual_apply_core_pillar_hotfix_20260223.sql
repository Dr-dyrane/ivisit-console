-- MANUAL PATCH: Core pillar fixes already merged locally into 0007_security / 0008_emergency_logic / 0100_core_rpcs
-- Purpose:
-- 1) Org admin finance visibility (payments + wallet_ledger)
-- 2) Duplicate active request guard in validate_emergency_request/create_emergency_v4
-- 3) Conflict-safe approve_cash_payment responses
-- 4) Pricing hierarchy in calculate_emergency_cost_v2: hospital pricing -> hospital base -> admin/global pricing -> hardcoded
--
-- Apply in Supabase SQL Editor against the linked project, then test flows again.

BEGIN;
-- Finance visibility policy backfill (merged into 0007_security pillar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'payments'
          AND policyname = 'Org Admins see org payments'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Org Admins see org payments"
            ON public.payments
            FOR SELECT
            USING (
                organization_id = public.p_get_current_org_id()
                OR public.p_is_admin()
            )
        $policy$;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'wallet_ledger'
          AND policyname = 'Users see own patient ledger'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Users see own patient ledger"
            ON public.wallet_ledger
            FOR SELECT
            USING (
                wallet_id IN (
                    SELECT pw.id
                    FROM public.patient_wallets pw
                    WHERE pw.user_id = auth.uid()
                )
                OR public.p_is_admin()
            )
        $policy$;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'wallet_ledger'
          AND policyname = 'Org Admins see own org ledger'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Org Admins see own org ledger"
            ON public.wallet_ledger
            FOR SELECT
            USING (
                wallet_id IN (
                    SELECT ow.id
                    FROM public.organization_wallets ow
                    WHERE ow.organization_id = public.p_get_current_org_id()
                )
                OR public.p_is_admin()
            )
        $policy$;
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.validate_emergency_request(
    p_user_id UUID,
    p_request_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_hospital_id UUID;
    v_patient_location JSONB;
    v_hospital_available BOOLEAN;
    v_service_type TEXT;
    v_conflict RECORD;
    v_result JSONB;
BEGIN
    -- Extract required fields
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_patient_location := p_request_data->'patient_location';
    v_service_type := p_request_data->>'service_type';
    
    -- Validate hospital exists and is available
    SELECT (available_beds > 0 AND status = 'active') INTO v_hospital_available
    FROM public.hospitals 
    WHERE id = v_hospital_id;
    
    IF NOT v_hospital_available THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Hospital not available',
            'code', 'HOSPITAL_UNAVAILABLE'
        );
    END IF;
    
    -- Validate patient location
    IF v_patient_location IS NULL OR 
       v_patient_location->>'lat' IS NULL OR 
       v_patient_location->>'lng' IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid patient location',
            'code', 'INVALID_LOCATION'
        );
    END IF;
    
    -- Check for active duplicate requests by service type (no time window loophole)
    IF v_service_type IN ('ambulance', 'bed') THEN
        SELECT id, display_id, status
        INTO v_conflict
        FROM public.emergency_requests
        WHERE user_id = p_user_id
          AND service_type = v_service_type
          AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1;

        IF v_conflict.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'valid', false,
                'code', CASE
                    WHEN v_service_type = 'ambulance' THEN 'ACTIVE_AMBULANCE_EXISTS'
                    ELSE 'ACTIVE_BED_EXISTS'
                END,
                'error', format(
                    'User already has an active %s request (%s, status=%s). Complete or cancel it first.',
                    v_service_type,
                    COALESCE(v_conflict.display_id, v_conflict.id::TEXT),
                    v_conflict.status
                ),
                'conflicting_request_id', v_conflict.id,
                'conflicting_display_id', v_conflict.display_id,
                'conflicting_status', v_conflict.status
            );
        END IF;
    ELSIF EXISTS (
        SELECT 1 FROM public.emergency_requests
        WHERE user_id = p_user_id
          AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
          AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Duplicate emergency request',
            'code', 'DUPLICATE_EMERGENCY'
        );
    END IF;
    
    v_result := jsonb_build_object(
        'valid', true,
        'hospital_id', v_hospital_id,
        'patient_location', v_patient_location
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_emergency_v4(
    p_user_id UUID,
    p_request_data JSONB,
    p_payment_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request_id UUID;
    v_display_id TEXT;
    v_visit_id TEXT;
    v_payment_id UUID;
    v_fee_amount NUMERIC;
    v_total_amount NUMERIC;
    v_requires_approval BOOLEAN := FALSE;
    v_hospital_id UUID;
    v_organization_id UUID;
    v_patient_location GEOMETRY;
    v_service_type TEXT;
    v_initial_status TEXT;
    v_conflict RECORD;
BEGIN
    -- 1. Extract and Resolve IDs
    v_hospital_id := (p_request_data->>'hospital_id')::UUID;
    v_service_type := p_request_data->>'service_type';
    SELECT organization_id INTO v_organization_id FROM public.hospitals WHERE id = v_hospital_id;
    
    -- 2. Physical Location Parse
    v_patient_location := ST_SetSRID(ST_MakePoint(
        (p_request_data->'patient_location'->>'lng')::DOUBLE PRECISION,
        (p_request_data->'patient_location'->>'lat')::DOUBLE PRECISION
    ), 4326);

    v_initial_status := CASE WHEN p_payment_data->>'method' = 'cash' THEN 'pending_approval' ELSE 'in_progress' END;

    -- 2b. Prevent duplicate active requests of the same service type before insert
    IF v_service_type IN ('ambulance', 'bed') THEN
        SELECT id, display_id, status
        INTO v_conflict
        FROM public.emergency_requests
        WHERE user_id = p_user_id
          AND service_type = v_service_type
          AND status IN ('pending_approval', 'in_progress', 'accepted', 'arrived')
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1;

        IF v_conflict.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', CASE
                    WHEN v_service_type = 'ambulance' THEN 'ACTIVE_AMBULANCE_EXISTS'
                    ELSE 'ACTIVE_BED_EXISTS'
                END,
                'error', format(
                    'User already has an active %s request (%s, status=%s). Complete or cancel it first.',
                    v_service_type,
                    COALESCE(v_conflict.display_id, v_conflict.id::TEXT),
                    v_conflict.status
                ),
                'conflicting_request_id', v_conflict.id,
                'conflicting_display_id', v_conflict.display_id,
                'conflicting_status', v_conflict.status
            );
        END IF;
    END IF;
    
    -- 3. Create the Emergency Request
    INSERT INTO public.emergency_requests (
        user_id, hospital_id, service_type, hospital_name, specialty, 
        ambulance_type, patient_location, patient_snapshot, status
    ) VALUES (
        p_user_id, v_hospital_id, v_service_type,
        p_request_data->>'hospital_name', p_request_data->>'specialty',
        p_request_data->>'ambulance_type', v_patient_location, 
        p_request_data->'patient_snapshot',
        v_initial_status
    ) RETURNING id, display_id INTO v_request_id, v_display_id;

    -- 4. Create Visit Record (Medical History)
    BEGIN
        INSERT INTO public.visits (
            user_id, hospital_id, request_id, status, 
            date, time, type
        ) VALUES (
            p_user_id, v_hospital_id, v_request_id, 'pending',
            TO_CHAR(NOW(), 'YYYY-MM-DD'),
            TO_CHAR(NOW(), 'HH24:MI:SS'),
            'emergency'
        ) RETURNING display_id INTO v_visit_id;
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking visit creation
        RAISE NOTICE 'Non-blocking visit creation failure: %', SQLERRM;
    END;

    -- 5. Process Payment Information
    IF p_payment_data IS NOT NULL THEN
        v_total_amount := (p_payment_data->>'total_amount')::NUMERIC;
        v_fee_amount := (p_payment_data->>'fee_amount')::NUMERIC;
        IF v_fee_amount IS NULL THEN v_fee_amount := v_total_amount * 0.025; END IF;

        INSERT INTO public.payments (
            user_id, emergency_request_id, organization_id, amount, currency, 
            payment_method, status, metadata
        ) VALUES (
            p_user_id, v_request_id, v_organization_id, v_total_amount, 
            p_payment_data->>'currency', p_payment_data->>'method',
            CASE WHEN p_payment_data->>'method' = 'cash' THEN 'pending' ELSE 'completed' END,
            jsonb_build_object('fee_amount', v_fee_amount, 'method_id', p_payment_data->>'method_id')
        ) RETURNING id INTO v_payment_id;

        IF p_payment_data->>'method' = 'cash' THEN v_requires_approval := TRUE; END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'display_id', v_display_id,
        'visit_id', v_visit_id,
        'payment_id', v_payment_id,
        'requires_approval', v_requires_approval,
        'emergency_status', CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'in_progress' END
    );
EXCEPTION
    WHEN unique_violation THEN
        IF POSITION('emergency_requests_one_active_ambulance_per_user_idx' IN SQLERRM) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ACTIVE_AMBULANCE_EXISTS',
                'error', 'User already has another active ambulance request (pending_approval/in_progress/accepted/arrived). Complete or cancel it first.'
            );
        ELSIF POSITION('emergency_requests_one_active_bed_per_user_idx' IN SQLERRM) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ACTIVE_BED_EXISTS',
                'error', 'User already has another active bed request (pending_approval/in_progress/accepted/arrived). Complete or cancel it first.'
            );
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_cash_payment(p_payment_id UUID, p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_request RECORD;
    v_conflict RECORD;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_patient_wallet_id UUID;
    v_fee_amount NUMERIC;
    v_assigned_ambulance_id UUID;
    v_responder_name TEXT;
    v_responder_phone TEXT;
    v_responder_vehicle_type TEXT;
    v_responder_vehicle_plate TEXT;
BEGIN
    -- 1. Verify Payment & Resolve Data
    SELECT p.*, (p.metadata->>'fee_amount')::NUMERIC as calculated_fee
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id AND p.status = 'pending';

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pending payment not found',
            'code', 'PENDING_PAYMENT_NOT_FOUND'
        );
    END IF;

    -- 1b. Verify request and linkage
    SELECT id, display_id, user_id, service_type, status
    INTO v_request
    FROM public.emergency_requests
    WHERE id = p_request_id;

    IF v_request.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Emergency request not found',
            'code', 'REQUEST_NOT_FOUND'
        );
    END IF;

    IF v_payment.emergency_request_id IS NOT NULL AND v_payment.emergency_request_id <> p_request_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment does not belong to the provided emergency request',
            'code', 'PAYMENT_REQUEST_MISMATCH'
        );
    END IF;

    -- 1c. Pre-check conflicts so we don't hit a raw unique-index violation during approve
    IF v_request.service_type IN ('ambulance', 'bed') THEN
        SELECT id, display_id, status
        INTO v_conflict
        FROM public.emergency_requests
        WHERE user_id = v_request.user_id
          AND service_type = v_request.service_type
          AND id <> v_request.id
          AND status IN ('in_progress', 'accepted', 'arrived')
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1;

        IF v_conflict.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', CASE
                    WHEN v_request.service_type = 'ambulance' THEN 'ACTIVE_AMBULANCE_EXISTS'
                    ELSE 'ACTIVE_BED_EXISTS'
                END,
                'error', format(
                    'Patient already has an active %s request (%s, status=%s). Complete or cancel it first.',
                    v_request.service_type,
                    COALESCE(v_conflict.display_id, v_conflict.id::TEXT),
                    v_conflict.status
                ),
                'conflicting_request_id', v_conflict.id,
                'conflicting_display_id', v_conflict.display_id,
                'conflicting_status', v_conflict.status
            );
        END IF;
    END IF;

    -- 2. Guard: Auto-provision Org Wallet if missing
    SELECT id, balance INTO v_org_wallet_id, v_org_balance
    FROM public.organization_wallets
    WHERE organization_id = v_payment.organization_id;

    IF v_org_wallet_id IS NULL AND v_payment.organization_id IS NOT NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (v_payment.organization_id, 0)
        RETURNING id, balance INTO v_org_wallet_id, v_org_balance;
    END IF;

    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1;

    -- 3. Check for Platform Fee
    v_fee_amount := COALESCE(v_payment.ivisit_fee_amount, v_payment.calculated_fee, 0);

    -- 4. Execute Ledger Operations (only if fee > 0)
    IF v_fee_amount > 0 THEN
        IF v_org_balance < v_fee_amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Organization balance insufficient for platform fee',
                'code', 'ORG_BALANCE_INSUFFICIENT'
            );
        END IF;

        -- Deduct from Org
        UPDATE public.organization_wallets SET balance = balance - v_fee_amount, updated_at = NOW() WHERE id = v_org_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_org_wallet_id, -v_fee_amount, 'debit', 'iVisit Platform Fee (Cash Payment)', p_payment_id);

        -- Credit Platform
        UPDATE public.ivisit_main_wallet SET balance = balance + v_fee_amount, last_updated = NOW() WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, v_fee_amount, 'credit', 'Platform Fee (Cash Payment)', p_payment_id);
    END IF;

    -- 5. Finalize Statuses
    UPDATE public.payments SET status = 'completed', processed_at = NOW(), updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests
    SET status = 'accepted', payment_status = 'completed', updated_at = NOW()
    WHERE id = p_request_id;
    UPDATE public.visits SET status = 'active', updated_at = NOW() WHERE request_id = p_request_id;

    -- 5b. Backfill responder snapshot fields for ambulance approvals after auto-dispatch trigger runs.
    -- This keeps mobile waiting/dispatch UI from seeing ambulance_id without responder metadata.
    IF v_request.service_type = 'ambulance' THEN
        UPDATE public.emergency_requests er
        SET
            responder_id = COALESCE(er.responder_id, a.profile_id),
            responder_name = COALESCE(
                NULLIF(BTRIM(er.responder_name), ''),
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(a.call_sign), ''),
                NULLIF(BTRIM(a.vehicle_number), ''),
                NULLIF(BTRIM(a.type), ''),
                'Responder'
            ),
            responder_phone = COALESCE(
                NULLIF(BTRIM(er.responder_phone), ''),
                NULLIF(BTRIM(p.phone), '')
            ),
            responder_vehicle_type = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_type), ''),
                NULLIF(BTRIM(a.type), '')
            ),
            responder_vehicle_plate = COALESCE(
                NULLIF(BTRIM(er.responder_vehicle_plate), ''),
                NULLIF(BTRIM(a.license_plate), ''),
                NULLIF(BTRIM(a.vehicle_number), '')
            ),
            updated_at = NOW()
        FROM public.ambulances a
        LEFT JOIN public.profiles p ON p.id = a.profile_id
        WHERE er.id = p_request_id
          AND er.ambulance_id = a.id;
    END IF;

    SELECT
        ambulance_id,
        responder_name,
        responder_phone,
        responder_vehicle_type,
        responder_vehicle_plate
    INTO
        v_assigned_ambulance_id,
        v_responder_name,
        v_responder_phone,
        v_responder_vehicle_type,
        v_responder_vehicle_plate
    FROM public.emergency_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'fee_deducted', v_fee_amount,
        'new_balance', COALESCE((v_org_balance - v_fee_amount), 0),
        'ambulance_id', v_assigned_ambulance_id,
        'responder_name', v_responder_name,
        'responder_phone', v_responder_phone,
        'responder_vehicle_type', v_responder_vehicle_type,
        'responder_vehicle_plate', v_responder_vehicle_plate
    );
EXCEPTION
    WHEN unique_violation THEN
        IF POSITION('emergency_requests_one_active_ambulance_per_user_idx' IN SQLERRM) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ACTIVE_AMBULANCE_EXISTS',
                'error', 'Patient already has another active ambulance request (accepted/in-progress/arrived). Complete or cancel it first.'
            );
        ELSIF POSITION('emergency_requests_one_active_bed_per_user_idx' IN SQLERRM) > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ACTIVE_BED_EXISTS',
                'error', 'Patient already has another active bed request (accepted/in-progress/arrived). Complete or cancel it first.'
            );
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calculate_emergency_cost_v2(
    p_service_type TEXT,
    p_hospital_id UUID DEFAULT NULL,
    p_ambulance_type TEXT DEFAULT NULL,
    p_distance_km NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_base_price NUMERIC := 0;
    v_default_base_price NUMERIC := 100;
    v_hospital_service_price NUMERIC := NULL;
    v_hospital_base_price NUMERIC := NULL;
    v_admin_service_price NUMERIC := NULL;
    v_distance_surcharge NUMERIC := 0;
    v_total NUMERIC;
BEGIN
    -- Canonical service defaults (used only when DB pricing rows are missing)
    v_default_base_price := CASE
        WHEN p_service_type IN ('ambulance', 'emergency', 'emergency_transport') THEN 150
        WHEN p_service_type IN ('bed', 'bed_booking') THEN 200
        ELSE 100
    END;

    -- Pricing hierarchy (payment calculation source of truth):
    -- 1) Hospital-specific service_pricing (org/hospital managed)
    -- 2) Hospital.base_price (legacy hospital override)
    -- 3) Global service_pricing (admin baseline, hospital_id IS NULL)
    -- 4) Hardcoded service-type default
    IF p_hospital_id IS NOT NULL THEN
        SELECT h.base_price
        INTO v_hospital_base_price
        FROM public.hospitals h
        WHERE h.id = p_hospital_id;

        SELECT sp.base_price
        INTO v_hospital_service_price
        FROM public.service_pricing sp
        WHERE sp.hospital_id = p_hospital_id
          AND sp.service_type = p_service_type
        ORDER BY sp.updated_at DESC NULLS LAST, sp.created_at DESC
        LIMIT 1;
    END IF;

    SELECT sp.base_price
    INTO v_admin_service_price
    FROM public.service_pricing sp
    WHERE sp.hospital_id IS NULL
      AND sp.service_type = p_service_type
    ORDER BY sp.updated_at DESC NULLS LAST, sp.created_at DESC
    LIMIT 1;

    v_base_price := COALESCE(
        NULLIF(v_hospital_service_price, 0),
        NULLIF(v_hospital_base_price, 0),
        NULLIF(v_admin_service_price, 0),
        v_default_base_price
    );

    IF COALESCE(v_base_price, 0) = 0 THEN
        v_base_price := v_default_base_price;
    END IF;
    
    -- Distance surcharge
    IF p_distance_km > 5 THEN
        v_distance_surcharge := (p_distance_km - 5) * 2;
    END IF;
    
    v_total := v_base_price + v_distance_surcharge;
    
    RETURN jsonb_build_object(
        'base_cost', v_base_price,
        'distance_surcharge', v_distance_surcharge,
        'total_cost', v_total,
        'currency', 'USD'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
COMMIT;
