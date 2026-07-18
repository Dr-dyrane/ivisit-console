#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const frontendRoot = path.resolve(__dirname, '..', '..');

const argumentValue = (name, argv = process.argv.slice(2)) => (
  argv.find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const isDemoProvenance = (facility) => {
  const placeId = String(facility?.place_id || '').toLowerCase();
  const features = Array.isArray(facility?.features)
    ? facility.features.map((feature) => String(feature).toLowerCase())
    : [];
  return (
    placeId.startsWith('demo:')
    || placeId.startsWith('e2e:')
    || features.some((feature) => feature.startsWith('demo_'))
  );
};

async function main(argv = process.argv.slice(2)) {
  dotenv.config({ path: path.join(frontendRoot, '.env'), quiet: true });

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
  );
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Console Supabase test environment');
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const expectedProjectRef = argumentValue('project-ref', argv);
  if (!expectedProjectRef || expectedProjectRef !== projectRef) {
    throw new Error(`Refusing live test. Pass --project-ref=${projectRef}`);
  }

  const runId = `onboarding-search-${Date.now().toString(36)}`;
  const email = `${runId}@ivisit-demo.local`;
  const password = `Ivisit-${runId}-A9!`;
  const demoName = `[DEMO ${runId}] Claim Search Fixture`;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId = null;
  let demoFacilityId = null;

  try {
    const { data: realRows, error: realError } = await admin
      .from('hospitals')
      .select('id,name,place_id,features,provider_source')
      .not('place_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (realError) throw realError;
    const realFacility = (realRows || []).find((facility) => (
      facility?.id
      && String(facility?.name || '').trim().length >= 4
      && !isDemoProvenance(facility)
    ));
    assert(realFacility, 'No preserved real facility was available for the control lane');

    const { data: createdUser, error: createUserError } = await admin.auth.admin
      .createUser({ email, password, email_confirm: true });
    if (createUserError) throw createUserError;
    userId = createdUser.user.id;

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      email,
      full_name: 'Onboarding Search Review',
      role: 'patient',
      organization_id: null,
      onboarding_status: 'pending',
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    const { data: demoFacility, error: demoFacilityError } = await admin
      .from('hospitals')
      .insert({
        name: demoName,
        address: '1 Exact Run Lane, Utqiagvik, Alaska',
        provider_type: 'hospital',
        provider_source: 'manual_seed',
        place_id: `e2e:${runId}:facility`,
        features: [
          `demo_owner:${runId}`,
          `demo_scope:${runId}`,
          `demo_expires_at:${Date.now() + 60 * 60 * 1000}`,
        ],
        latitude: 71.2906,
        longitude: -156.7887,
        status: 'available',
        verified: false,
        verification_status: 'pending',
        organization_id: null,
      })
      .select('id')
      .single();
    if (demoFacilityError) throw demoFacilityError;
    demoFacilityId = demoFacility.id;

    const { error: signInError } = await userClient.auth
      .signInWithPassword({ email, password });
    if (signInError) throw signInError;

    const { data: directDemo, error: directDemoError } = await userClient
      .rpc('search_onboarding_facilities', { p_query: demoName.slice(0, 80) });
    if (directDemoError) throw directDemoError;
    assert(
      (directDemo || []).some((facility) => facility.id === demoFacilityId),
      'Control RPC did not expose the exact demo fixture',
    );

    const { data: filteredDemo, error: filteredDemoError } = await userClient
      .functions.invoke('search-onboarding-facilities', {
        body: { query: demoName.slice(0, 80) },
      });
    if (filteredDemoError) throw filteredDemoError;
    assert(
      Array.isArray(filteredDemo?.data)
      && !filteredDemo.data.some((facility) => facility.id === demoFacilityId),
      'Demo facility leaked through onboarding search',
    );

    const realQuery = String(realFacility.name).trim().slice(0, 80);
    const { data: directReal, error: directRealError } = await userClient
      .rpc('search_onboarding_facilities', { p_query: realQuery });
    if (directRealError) throw directRealError;
    assert(
      (directReal || []).some((facility) => facility.id === realFacility.id),
      'Control RPC did not return the preserved real facility',
    );

    const { data: filteredReal, error: filteredRealError } = await userClient
      .functions.invoke('search-onboarding-facilities', {
        body: { query: realQuery },
      });
    if (filteredRealError) throw filteredRealError;
    assert(
      Array.isArray(filteredReal?.data)
      && filteredReal.data.some((facility) => facility.id === realFacility.id),
      'Onboarding search removed a preserved real facility',
    );

    console.log(JSON.stringify({
      ok: true,
      runId,
      projectRef,
      demoExcluded: demoFacilityId,
      realPreserved: realFacility.id,
    }, null, 2));
  } finally {
    if (demoFacilityId) {
      const { error } = await admin.from('hospitals').delete().eq('id', demoFacilityId);
      if (error) throw error;
    }
    if (userId) {
      await admin.from('profiles').delete().eq('id', userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }

    if (demoFacilityId) {
      const { data, error } = await admin
        .from('hospitals')
        .select('id')
        .eq('id', demoFacilityId);
      if (error) throw error;
      assert((data || []).length === 0, 'Demo facility cleanup residue remains');
    }
    if (userId) {
      const { data: profiles, error: profileLookupError } = await admin
        .from('profiles')
        .select('id')
        .eq('id', userId);
      if (profileLookupError) throw profileLookupError;
      assert((profiles || []).length === 0, 'Disposable onboarding profile remains');

      const { data: authLookup, error: authLookupError } = await admin.auth.admin
        .getUserById(userId);
      assert(
        Boolean(authLookupError) || !authLookup?.user,
        'Disposable onboarding Auth identity remains',
      );
    }
  }
}

main().catch((error) => {
  console.error(`[test-onboarding-search-demo-exclusion] ${error.message}`);
  process.exit(1);
});
