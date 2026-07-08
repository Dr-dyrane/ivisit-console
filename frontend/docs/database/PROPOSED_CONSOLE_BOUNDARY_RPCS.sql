-- =============================================================================
-- PROPOSAL -- for ivisit-app review + placement in supabase/migrations.
-- DO NOT run from the console repo. Console calls these; console does not own
-- this schema. The ivisit-app schema owner reviews, adjusts to house style, and
-- places these into the correct pillar file (per MODULE_SCHEMA_BIBLE.md).
-- =============================================================================
--
-- Authored by: ivisit-console (data-sync remediation lane)
-- Source of truth reviewed BEFORE drafting (do not re-derive; cite when placing):
--   * supabase/migrations/20260219010000_core_rpcs.sql
--       - update_hospital_by_admin (JSONB array parse via jsonb_array_elements_text)
--       - console_complete_emergency / console_cancel_emergency
--         (auth.uid() actor guard, role/org guard, FOR UPDATE, canonicalize_*,
--          idempotent already_* short-circuit, JSONB {success,...} return)
--       - rate_visit (visits UPDATE + NOT FOUND -> {success:false})
--       - approve_cash_payment (the fee-debit half: organization_wallets FOR UPDATE,
--         wallet_ledger debit + platform credit, payments.metadata fee stamp)
--   * supabase/migrations/20260219000100_identity.sql   -> medical_profiles shape
--   * supabase/migrations/20260219000300_logistics.sql  -> visits shape
--   * supabase/migrations/20260219000400_finance.sql    -> wallet_ledger / payments shape
--   * supabase/migrations/20260219000200_org_structure.sql -> hospitals (has org_admin_id)
--   * supabase/migrations/20260219000700_security.sql   -> p_is_admin / p_get_current_org_id / p_is_console_allowed
--   * supabase/docs/MODULE_SCHEMA_BIBLE.md, API_REFERENCE.md, CONTRIBUTING.md,
--     TESTING.md, SCHEMA_SNAPSHOT.md, console/api_reference.json, console/sync_guide.md
--
-- REUSE-VS-NEW DECISION (checked against supabase/docs/API_REFERENCE.md, the
-- authoritative RPC index regenerated 2026-05-18, and console/api_reference.json):
--   None of the 7 functions below currently exist in the schema. The nearest
--   existing console-facing RPCs are:
--     - update_hospital_by_admin(UUID, JSONB)  -- edits hospital columns, but has
--       NO org_admin_id assignment path (that is the Facility-lane gap; see fn 7).
--     - rate_visit(UUID, SMALLINT, TEXT)       -- patient rating only; not a
--       console clinical/status write (see fns 1-4).
--     - approve_cash_payment(UUID, UUID)       -- does the fee debit inline as part
--       of cash approval; there is no standalone idempotent fee-debit entry point
--       for console-side reconciliation/backfill (see fn 6).
--   => All 7 are GENUINELY NEW. No reuse candidate covers them. If the schema
--      owner disagrees and an equivalent already exists under another name,
--      prefer REUSE and delete the corresponding block here.
--
-- HOUSE-STYLE NOTES the owner should apply on placement (per the docs):
--   * MODULE_SCHEMA_BIBLE.md "RPC Ownership Model": core_rpcs is the API/facade
--     boundary for app/console; existing console_* RPCs live there. Suggested
--     placement: fns 1-7 in 20260219010000_core_rpcs.sql (Module 12: Console &
--     Admin Logic), keeping any domain rules delegated to the owner pillar.
--       - Table owners for reference: visits -> logistics(0003),
--         medical_profiles -> identity(0001), wallet_ledger -> finance(0004),
--         hospitals -> org_structure(0002).
--   * CONTRIBUTING.md "RBAC Consolidation Rule": prefer p_is_console_allowed() /
--     p_is_admin() helpers over hardcoded role-string lists. Role literals below
--     mirror console_complete_emergency verbatim; collapse into a helper if the
--     owner prefers.
--   * CONTRIBUTING.md #9 "wallet_ledger is append-only" + "Financial ops log to
--     wallet_ledger synchronously": fn 6 only INSERTs ledger rows (never UPDATE/
--     DELETE) and runs synchronously inside the same txn as the balance move.
--   * Add an SCC-### change-control item before landing (Change Control Rules #1),
--     then run the hard gates in TESTING.md (see "TEST EXPECTATIONS" below).
--
-- TEST EXPECTATIONS (from supabase/docs/TESTING.md -- run after placement):
--   * fns 1-4 (visits):   npm run hardening:visits-surface-field-guard
--                         npm run hardening:visits-runtime-confidence
--                         (E2E must exercise completed / cancelled lifecycle;
--                          automation-contract-guard covers sync_emergency_to_visit)
--   * fn 5 (medical):     npm run hardening:medical-profiles-surface-field-guard
--                         (runtime-crud-batch already covers medical_profiles)
--   * fn 6 (wallet fee):  npm run hardening:wallet-ledger-surface-field-guard
--                         npm run hardening:cash-fee-contract-guard
--                         npm run hardening:runtime-data-integrity
--                         (fee ledger coherence; idempotency = no double debit)
--   * fn 7 (hospital):    npm run hardening:hospitals-surface-field-guard
--   * ALL: npm run hardening:cleanup-dry-run-guard
--          npm run hardening:contract-drift-guard   (must report no RPC drift)
--          node supabase/tests/scripts/test_runner.js comprehensive_system  (100%)
--   * Zero-Leak Rule: any test rows must use the patterned identifiers and be
--     cleaned via cleanup_test_side_effects.js --apply before commit.
--
-- CONVENTIONS every function below mirrors (do not strip on placement):
--   SECURITY DEFINER; p_-prefixed args; RETURNS JSONB shaped {success, ...};
--   actor guard v_actor_id := auth.uid(); service_role short-circuit via
--   request.jwt.claims; org/role guard via p_is_admin()/p_get_current_org_id();
--   FOR UPDATE row locks on mutated rows; idempotent already_* short-circuits;
--   and the mandatory trailing:
--     REVOKE ALL ON FUNCTION public.<fn>(<sig>) FROM PUBLIC, anon;
--     GRANT EXECUTE ON FUNCTION public.<fn>(<sig>) TO authenticated, service_role;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. console_update_visit(p_visit_id UUID, p_payload JSONB) -> JSONB
--    Console clinical/detail edit of a visit. Mirrors update_hospital_by_admin's
--    JSONB parse discipline (COALESCE scalars; jsonb_array_elements_text for
--    TEXT[] fields) and the console_* actor/role/org guard. Only touches whitelisted
--    columns. Replaces console visitsService.updateVisit direct .update().
--    Owner note: array fields use "present-key" semantics -- an array is only
--    overwritten when the payload actually carries that key, so partial edits do
--    not wipe preparation/prescriptions.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_update_visit(
    p_visit_id UUID,
    p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_visit_hospital_id UUID;
    v_hospital_org_id UUID;
    v_preparation TEXT[];
    v_prescriptions TEXT[];
    v_updated public.visits%ROWTYPE;
BEGIN
    IF p_visit_id IS NULL THEN
        RAISE EXCEPTION 'visit id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT v.hospital_id, h.organization_id
    INTO v_visit_hospital_id, v_hospital_org_id
    FROM public.visits v
    LEFT JOIN public.hospitals h ON h.id = v.hospital_id
    WHERE v.id = p_visit_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    -- Guard: super admin OR org_admin/dispatcher of the visit's hospital org.
    IF NOT v_is_admin THEN
        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_hospital_org_id IS DISTINCT FROM v_actor_org_id THEN
                RAISE EXCEPTION 'Unauthorized: You do not manage this visit';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized: insufficient role to edit visit';
        END IF;
    END IF;

    -- Extract arrays safely, only when the payload carries the key (present-key
    -- semantics), so partial edits never clobber existing arrays.
    IF p_payload ? 'preparation' THEN
        SELECT COALESCE(array_agg(x), '{}') INTO v_preparation
        FROM jsonb_array_elements_text(p_payload->'preparation') t(x);
    END IF;
    IF p_payload ? 'prescriptions' THEN
        SELECT COALESCE(array_agg(x), '{}') INTO v_prescriptions
        FROM jsonb_array_elements_text(p_payload->'prescriptions') t(x);
    END IF;

    UPDATE public.visits
    SET
        notes = COALESCE(p_payload->>'notes', notes),
        summary = COALESCE(p_payload->>'summary', summary),
        doctor_name = COALESCE(p_payload->>'doctor_name', doctor_name),
        specialty = COALESCE(p_payload->>'specialty', specialty),
        date = COALESCE(p_payload->>'date', date),
        time = COALESCE(p_payload->>'time', time),
        type = COALESCE(p_payload->>'type', type),
        cost = COALESCE(p_payload->>'cost', cost),
        room_number = COALESCE(p_payload->>'room_number', room_number),
        estimated_duration = COALESCE(p_payload->>'estimated_duration', estimated_duration),
        meeting_link = COALESCE(p_payload->>'meeting_link', meeting_link),
        next_visit = COALESCE(p_payload->>'next_visit', next_visit),
        preparation = CASE WHEN p_payload ? 'preparation' THEN v_preparation ELSE preparation END,
        prescriptions = CASE WHEN p_payload ? 'prescriptions' THEN v_prescriptions ELSE prescriptions END,
        updated_at = NOW()
    WHERE id = p_visit_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object('success', true, 'visit', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 2. console_complete_visit(p_visit_id UUID, p_summary TEXT, p_prescriptions TEXT[]) -> JSONB
--    Sets status='completed', writes summary + prescriptions. Idempotent: a second
--    call returns {success:true, already_completed:true} (mirrors
--    console_complete_emergency's already_completed short-circuit). Replaces
--    console visitsService.completeVisit direct .update().
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_complete_visit(
    p_visit_id UUID,
    p_summary TEXT DEFAULT NULL,
    p_prescriptions TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_hospital_org_id UUID;
    v_status TEXT;
    v_updated public.visits%ROWTYPE;
BEGIN
    IF p_visit_id IS NULL THEN
        RAISE EXCEPTION 'visit id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT v.status, h.organization_id
    INTO v_status, v_hospital_org_id
    FROM public.visits v
    LEFT JOIN public.hospitals h ON h.id = v.hospital_id
    WHERE v.id = p_visit_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_hospital_org_id IS DISTINCT FROM v_actor_org_id THEN
                RAISE EXCEPTION 'Unauthorized: You do not manage this visit';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized: insufficient role to complete visit';
        END IF;
    END IF;

    IF v_status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true);
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot complete a cancelled visit';
    END IF;

    UPDATE public.visits
    SET status = 'completed',
        summary = COALESCE(NULLIF(BTRIM(p_summary), ''), summary),
        prescriptions = CASE
            WHEN p_prescriptions IS NOT NULL AND array_length(p_prescriptions, 1) IS NOT NULL
            THEN p_prescriptions
            ELSE prescriptions
        END,
        updated_at = NOW()
    WHERE id = p_visit_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object('success', true, 'visit', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 3. console_cancel_visit(p_visit_id UUID, p_reason TEXT) -> JSONB
--    Sets status='cancelled'. APPENDS the cancel reason to notes (never clobbers
--    existing notes -- the console's direct .update() currently overwrites notes,
--    which this fixes). Idempotent: {success:true, already_cancelled:true}.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_cancel_visit(
    p_visit_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_hospital_org_id UUID;
    v_status TEXT;
    v_note_line TEXT;
    v_updated public.visits%ROWTYPE;
BEGIN
    IF p_visit_id IS NULL THEN
        RAISE EXCEPTION 'visit id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT v.status, h.organization_id
    INTO v_status, v_hospital_org_id
    FROM public.visits v
    LEFT JOIN public.hospitals h ON h.id = v.hospital_id
    WHERE v.id = p_visit_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_hospital_org_id IS DISTINCT FROM v_actor_org_id THEN
                RAISE EXCEPTION 'Unauthorized: You do not manage this visit';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized: insufficient role to cancel visit';
        END IF;
    END IF;

    IF v_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'already_cancelled', true);
    END IF;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot cancel a completed visit';
    END IF;

    v_note_line := 'Cancelled' ||
        CASE WHEN NULLIF(BTRIM(p_reason), '') IS NOT NULL
             THEN ': ' || BTRIM(p_reason)
             ELSE ''
        END;

    UPDATE public.visits
    SET status = 'cancelled',
        -- APPEND, never clobber: preserve prior notes on their own line.
        notes = CASE
            WHEN NULLIF(BTRIM(notes), '') IS NULL THEN v_note_line
            ELSE notes || E'\n' || v_note_line
        END,
        updated_at = NOW()
    WHERE id = p_visit_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object(
        'success', true,
        'reason', p_reason,
        'visit', to_jsonb(v_updated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 4. console_mark_visit_no_show(p_visit_id UUID) -> JSONB
--    Sets a whitelisted no-show status. Console currently writes status='no-show'
--    directly (visitsService.markVisitAsNoShow). Kept as an explicit whitelisted
--    write so the (recommended) visits.status CHECK constraint -- see REVIEW NOTES
--    (b) -- can include the canonical no-show token the owner settles on.
--    Idempotent: {success:true, already_no_show:true}.
--    NOTE for owner: pick ONE canonical token ('no_show' vs 'no-show') and align
--    the CHECK, this function, and the console projection to it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_mark_visit_no_show(
    p_visit_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_is_admin BOOLEAN := public.p_is_admin();
    v_hospital_org_id UUID;
    v_status TEXT;
    -- Whitelisted target token. Align with the visits.status CHECK the owner adds.
    v_no_show_status CONSTANT TEXT := 'no-show';
    v_updated public.visits%ROWTYPE;
BEGIN
    IF p_visit_id IS NULL THEN
        RAISE EXCEPTION 'visit id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT role, organization_id
    INTO v_actor_role, v_actor_org_id
    FROM public.profiles
    WHERE id = v_actor_id;

    SELECT v.status, h.organization_id
    INTO v_status, v_hospital_org_id
    FROM public.visits v
    LEFT JOIN public.hospitals h ON h.id = v.hospital_id
    WHERE v.id = p_visit_id
    FOR UPDATE OF v;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Visit not found');
    END IF;

    IF NOT v_is_admin THEN
        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_hospital_org_id IS DISTINCT FROM v_actor_org_id THEN
                RAISE EXCEPTION 'Unauthorized: You do not manage this visit';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unauthorized: insufficient role to mark no-show';
        END IF;
    END IF;

    IF v_status = v_no_show_status THEN
        RETURN jsonb_build_object('success', true, 'already_no_show', true);
    END IF;

    IF v_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot mark a % visit as no-show', v_status;
    END IF;

    UPDATE public.visits
    SET status = v_no_show_status,
        updated_at = NOW()
    WHERE id = p_visit_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object('success', true, 'visit', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 5. console_mutate_medical_profile_array(
--        p_user_id UUID, p_field TEXT, p_operation TEXT, p_value TEXT) -> JSONB
--    Single-statement TEXT[] mutation on medical_profiles. Replaces the console's
--    read-modify-write (getUserMedicalProfile -> mutate in JS -> update), which is
--    racy. Field whitelist: 'allergies' | 'conditions' | 'medications'.
--    'add'    = dedup append (skip if already present)
--    'remove' = array_remove
--    Upserts the row on user_id (medical_profiles.user_id is the PK) so a missing
--    profile row is created rather than silently dropping the write.
--    All array work happens in ONE UPDATE/INSERT (no read-modify-write in SQL).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_mutate_medical_profile_array(
    p_user_id UUID,
    p_field TEXT,
    p_operation TEXT,
    p_value TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_is_admin BOOLEAN := public.p_is_admin();
    v_field TEXT := LOWER(BTRIM(COALESCE(p_field, '')));
    v_operation TEXT := LOWER(BTRIM(COALESCE(p_operation, '')));
    v_value TEXT := BTRIM(COALESCE(p_value, ''));
    v_updated public.medical_profiles%ROWTYPE;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Guard: super admin, or the subject editing their own medical profile.
    IF NOT v_is_admin AND v_actor_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: cannot edit another user''s medical profile';
    END IF;

    -- Field whitelist (prevents arbitrary column injection via dynamic SQL).
    IF v_field NOT IN ('allergies', 'conditions', 'medications') THEN
        RAISE EXCEPTION 'Unsupported medical profile array field: %', p_field;
    END IF;

    IF v_operation NOT IN ('add', 'remove') THEN
        RAISE EXCEPTION 'Unsupported operation (expected add|remove): %', p_operation;
    END IF;

    IF v_value = '' THEN
        RAISE EXCEPTION 'value is required';
    END IF;

    -- Ensure a row exists to mutate (upsert on the user_id PK). No-op array on insert.
    INSERT INTO public.medical_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Single-statement array mutation per whitelisted field. Static SQL branches
    -- (no dynamic column name) keep the whitelist airtight.
    IF v_field = 'allergies' THEN
        UPDATE public.medical_profiles
        SET allergies = CASE
                WHEN v_operation = 'add'
                    THEN (CASE WHEN COALESCE(allergies, '{}') @> ARRAY[v_value]
                               THEN allergies
                               ELSE array_append(COALESCE(allergies, '{}'), v_value) END)
                ELSE array_remove(COALESCE(allergies, '{}'), v_value)
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_updated;
    ELSIF v_field = 'conditions' THEN
        UPDATE public.medical_profiles
        SET conditions = CASE
                WHEN v_operation = 'add'
                    THEN (CASE WHEN COALESCE(conditions, '{}') @> ARRAY[v_value]
                               THEN conditions
                               ELSE array_append(COALESCE(conditions, '{}'), v_value) END)
                ELSE array_remove(COALESCE(conditions, '{}'), v_value)
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_updated;
    ELSE  -- 'medications'
        UPDATE public.medical_profiles
        SET medications = CASE
                WHEN v_operation = 'add'
                    THEN (CASE WHEN COALESCE(medications, '{}') @> ARRAY[v_value]
                               THEN medications
                               ELSE array_append(COALESCE(medications, '{}'), v_value) END)
                ELSE array_remove(COALESCE(medications, '{}'), v_value)
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_updated;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'field', v_field,
        'operation', v_operation,
        'profile', to_jsonb(v_updated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 6. console_record_wallet_fee_debit(p_payment_id UUID) -> JSONB
--    Mirrors the fee-debit HALF of approve_cash_payment (core_rpcs) as a standalone,
--    idempotent entry point for console-side fee reconciliation / backfill.
--    Idempotent on (reference_id = p_payment_id, transaction_type = 'debit') under
--    FOR UPDATE. Stamps payments.metadata.ledger_debited = true so a re-run is a
--    cheap no-op even if the ledger index is later changed. Append-only ledger.
--    Companion unique index (below) is REQUIRED for the ON CONFLICT-free idempotency
--    guard to be race-safe under concurrency.
--    Owner note: this deliberately does NOT change emergency/visit status -- it only
--    settles the platform fee ledger + org/platform wallet balances for a payment
--    whose fee was computed but never debited. Fee resolution mirrors
--    approve_cash_payment exactly (ivisit_fee_amount -> metadata.fee_amount ->
--    metadata.fee -> percentage fallback).
-- -----------------------------------------------------------------------------

-- Companion idempotency index (place with the wallet_ledger table in finance pillar):
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_reference_txn_type_uidx
    ON public.wallet_ledger (reference_id, transaction_type)
    WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.console_record_wallet_fee_debit(
    p_payment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
    v_actor_org_id UUID;
    v_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    v_is_service_role BOOLEAN := COALESCE(v_claims->>'role', '') = 'service_role';
    v_payment RECORD;
    v_org_wallet_id UUID;
    v_org_balance NUMERIC;
    v_platform_wallet_id UUID;
    v_fee_percentage NUMERIC;
    v_fee_amount NUMERIC;
    v_already_debited BOOLEAN;
BEGIN
    IF p_payment_id IS NULL THEN
        RAISE EXCEPTION 'payment id is required';
    END IF;

    -- Lock the payment row for the duration of the fee settlement.
    SELECT
        p.*,
        NULLIF((p.metadata->>'fee_amount')::NUMERIC, 0) AS calculated_fee,
        NULLIF((p.metadata->>'fee')::NUMERIC, 0) AS legacy_calculated_fee
    INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;

    -- Guard: service_role, super admin, or org_admin/dispatcher of the payment org.
    IF NOT v_is_service_role THEN
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        SELECT role, organization_id
        INTO v_actor_role, v_actor_org_id
        FROM public.profiles
        WHERE id = v_actor_id;

        IF v_actor_role NOT IN ('admin', 'org_admin', 'dispatcher') THEN
            RAISE EXCEPTION 'Unauthorized: insufficient role for fee debit';
        END IF;

        IF v_actor_role IN ('org_admin', 'dispatcher') THEN
            IF v_actor_org_id IS NULL OR v_actor_org_id IS DISTINCT FROM v_payment.organization_id THEN
                RAISE EXCEPTION 'Unauthorized: payment outside actor organization';
            END IF;
        END IF;
    END IF;

    -- Idempotency: if a debit ledger row already references this payment, no-op.
    -- FOR UPDATE on the ledger row(s) serialises concurrent callers; the partial
    -- unique index above makes a duplicate INSERT impossible even under a race.
    SELECT EXISTS (
        SELECT 1
        FROM public.wallet_ledger wl
        WHERE wl.reference_id = p_payment_id
          AND wl.transaction_type = 'debit'
        FOR UPDATE
    ) INTO v_already_debited;

    IF v_already_debited OR COALESCE((v_payment.metadata->>'ledger_debited')::BOOLEAN, false) THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_debited', true,
            'payment_id', p_payment_id
        );
    END IF;

    IF v_payment.organization_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment has no organization to debit');
    END IF;

    -- Fee resolution mirrors approve_cash_payment exactly.
    SELECT ivisit_fee_percentage
    INTO v_fee_percentage
    FROM public.organizations
    WHERE id = v_payment.organization_id;

    v_fee_amount := COALESCE(
        NULLIF(v_payment.ivisit_fee_amount, 0),
        v_payment.calculated_fee,
        v_payment.legacy_calculated_fee,
        ROUND(COALESCE(v_payment.amount, 0) * (COALESCE(v_fee_percentage, 2.5) / 100.0), 2),
        0
    );

    IF v_fee_amount <= 0 THEN
        -- Nothing to debit; still stamp so the console stops retrying.
        UPDATE public.payments
        SET metadata = COALESCE(metadata, '{}'::jsonb)
                       || jsonb_build_object('ledger_debited', true, 'fee_amount', 0),
            updated_at = NOW()
        WHERE id = p_payment_id;

        RETURN jsonb_build_object('success', true, 'fee_deducted', 0, 'already_debited', false);
    END IF;

    -- Lock org + platform wallets, then move balances and log the ledger (append-only).
    SELECT id, balance INTO v_org_wallet_id, v_org_balance
    FROM public.organization_wallets
    WHERE organization_id = v_payment.organization_id
    FOR UPDATE;

    IF v_org_wallet_id IS NULL THEN
        INSERT INTO public.organization_wallets (organization_id, balance)
        VALUES (v_payment.organization_id, 0)
        RETURNING id, balance INTO v_org_wallet_id, v_org_balance;
    END IF;

    IF v_org_balance < v_fee_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization balance insufficient for platform fee');
    END IF;

    SELECT id INTO v_platform_wallet_id FROM public.ivisit_main_wallet LIMIT 1 FOR UPDATE;

    UPDATE public.organization_wallets
    SET balance = balance - v_fee_amount,
        updated_at = NOW()
    WHERE id = v_org_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
    VALUES (v_org_wallet_id, -v_fee_amount, 'debit', 'iVisit Platform Fee (Console Reconcile)', p_payment_id);

    IF v_platform_wallet_id IS NOT NULL THEN
        UPDATE public.ivisit_main_wallet
        SET balance = balance + v_fee_amount,
            last_updated = NOW()
        WHERE id = v_platform_wallet_id;
        INSERT INTO public.wallet_ledger (wallet_id, amount, transaction_type, description, reference_id)
        VALUES (v_platform_wallet_id, v_fee_amount, 'credit', 'Platform Fee (Console Reconcile)', p_payment_id);
    END IF;

    UPDATE public.payments
    SET ivisit_fee_amount = v_fee_amount,
        metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object('ledger_debited', true, 'fee_amount', v_fee_amount, 'fee', v_fee_amount),
        updated_at = NOW()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'fee_deducted', v_fee_amount,
        'new_balance', COALESCE(v_org_balance - v_fee_amount, 0),
        'payment_id', p_payment_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 7. console_assign_hospital_to_admin(p_hospital_id UUID, p_org_admin_id UUID) -> JSONB
--    The gap the Facility lane found: update_hospital_by_admin edits hospital
--    columns but has NO org_admin_id write path, so console cannot (re)assign a
--    hospital's managing org admin. hospitals.org_admin_id REFERENCES profiles(id)
--    already exists (org_structure pillar). Admin-only. Passing NULL clears the
--    assignment. Keeps hospital.organization_id in sync with the assignee's org
--    when the assignee has one (so RLS/org-scoped guards stay coherent).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.console_assign_hospital_to_admin(
    p_hospital_id UUID,
    p_org_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_admin_role TEXT;
    v_admin_org_id UUID;
    v_hospital_exists BOOLEAN;
    v_updated public.hospitals%ROWTYPE;
BEGIN
    IF p_hospital_id IS NULL THEN
        RAISE EXCEPTION 'hospital id is required';
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Admin-only (assigning who manages a facility is a platform-admin action).
    IF NOT public.p_is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only a super admin can assign a hospital admin';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.hospitals WHERE id = p_hospital_id)
    INTO v_hospital_exists;

    IF NOT v_hospital_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hospital not found');
    END IF;

    -- Validate the assignee (when provided): must be an existing profile with a
    -- manager-tier role; capture their org to keep organization_id coherent.
    IF p_org_admin_id IS NOT NULL THEN
        SELECT role, organization_id
        INTO v_admin_role, v_admin_org_id
        FROM public.profiles
        WHERE id = p_org_admin_id;

        IF v_admin_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Assignee profile not found');
        END IF;

        IF v_admin_role NOT IN ('admin', 'org_admin') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Assignee must be an admin or org_admin',
                'assignee_role', v_admin_role
            );
        END IF;
    END IF;

    UPDATE public.hospitals
    SET org_admin_id = p_org_admin_id,
        -- Keep org scope coherent: adopt the assignee's org when they have one;
        -- otherwise leave organization_id untouched (COALESCE, do not wipe).
        organization_id = COALESCE(v_admin_org_id, organization_id),
        updated_at = NOW()
    WHERE id = p_hospital_id
    RETURNING * INTO v_updated;

    RETURN jsonb_build_object(
        'success', true,
        'hospital_id', p_hospital_id,
        'org_admin_id', p_org_admin_id,
        'hospital', to_jsonb(v_updated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- REVIEW NOTES (NOT SQL to run here -- flagged for the ivisit-app owner)
-- =============================================================================
--
-- (a) update_hospital_by_admin should COALESCE its array fields.
--     Today (core_rpcs ~L238-278) it hard-sets specialties/service_types/features
--     from the payload arrays UNCONDITIONALLY:
--         specialties  = v_specialties;
--         service_types = v_service_types;
--         features      = v_features;
--     Because the array extraction defaults missing keys to '{}', any partial edit
--     that omits those keys WIPES the existing arrays. Recommend switching to
--     present-key semantics like console_update_visit does here, e.g.:
--         specialties = CASE WHEN payload ? 'specialties' THEN v_specialties ELSE specialties END,
--     (or COALESCE(payload->'specialties'-derived, specialties)). Same for
--     service_types and features. This is a pre-existing data-loss bug, not new.
--
-- (b) [NEEDS-RLS/SCHEMA] items from
--     ivisit-console/frontend/docs/database/DATA_SYNC_REMEDIATION_AUDIT.md
--     (Section 3.C). These are owner-side and must NOT be run from the console repo;
--     listed here so the owner can land them alongside the RPCs above:
--
--       * Operator SELECT visibility: visits + medical_profiles currently have no
--         admin/org-scoped SELECT policy, so console operators see only their own
--         rows ("all rows look like admin" symptom). Fix = add an admin/org-scoped
--         SELECT policy on each, OR route all operator reads through SECURITY
--         DEFINER RPCs. (The write RPCs above already bypass RLS as DEFINER; reads
--         still need a policy or a DEFINER read RPC.)
--
--       * Realtime publication: add the wallet/finance + identity tables the
--         console subscribes to but that are absent from the supabase_realtime
--         publication -- wallet_ledger, organization_wallets, ivisit_main_wallet,
--         insurance_billing, subscribers, profiles. Extend the existing
--         supabase_realtime publication loop in 0009_automations (do NOT create a
--         new publication).
--
--       * visits.status CHECK: visits.status is free-text (DEFAULT 'upcoming', NO
--         CHECK -- confirmed SCHEMA_SNAPSHOT.md L502), while app writes
--         'upcoming'/'active' and console writes 'completed'/'cancelled'/'no-show'.
--         Add ONE canonical enum/CHECK covering the union, then align fn 4's
--         v_no_show_status token and the console projection to the chosen spelling.
--
-- =============================================================================
-- GRANTS (mandatory trailing block -- one REVOKE + one GRANT per function).
-- Mirrors the REVOKE/GRANT convention at the tail of 20260219010000_core_rpcs.sql.
-- =============================================================================

REVOKE ALL ON FUNCTION public.console_update_visit(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_complete_visit(UUID, TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_cancel_visit(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_mark_visit_no_show(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_mutate_medical_profile_array(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_record_wallet_fee_debit(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.console_assign_hospital_to_admin(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.console_update_visit(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_complete_visit(UUID, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_cancel_visit(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_mark_visit_no_show(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_mutate_medical_profile_array(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_record_wallet_fee_debit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.console_assign_hospital_to_admin(UUID, UUID) TO authenticated, service_role;

-- =============================================================================
-- END PROPOSAL. DO NOT run from the console repo.
-- =============================================================================
