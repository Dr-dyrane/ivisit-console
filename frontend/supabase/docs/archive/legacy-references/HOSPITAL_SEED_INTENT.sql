
>     INSERT INTO public.hospitals (
          name,
          organization_id,
          latitude,
          longitude,
          address,
          status,
          service_types,
          verified,            -- Added verified
          available_beds,      -- Added beds
          ambulances_count     -- Added ambulances
      )
      VALUES (
          'Hemet Valley Medical Center',
          v_org_id,
          33.753201,
          -116.995314,
          '2235 Corinto Court, Hemet, CA',
          'available',         -- Changed from 'active' to 'available' to match RPC filter
          ARRAY['ambulance', 'bed'],
          true,                -- Set verified = true to match RPC filter


