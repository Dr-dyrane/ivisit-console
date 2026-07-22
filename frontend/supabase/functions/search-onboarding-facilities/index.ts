import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { filterOnboardingFacilityCandidates } from './demoFacilityFilter.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const jsonResponse = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: corsHeaders },
);

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return jsonResponse({ error: 'Facility search is unavailable.' }, 401);
  }

  let query = '';
  try {
    const body = await request.json();
    query = String(body?.query || '').trim();
  } catch {
    return jsonResponse({ error: 'Enter a facility name or address.' }, 400);
  }

  if (query.length < 3 || query.length > 80) {
    return jsonResponse({ error: 'Enter 3 to 80 characters.' }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const searchCatalog = () => userClient.rpc(
    'search_onboarding_facilities',
    { p_query: query },
  );

  let { data: candidates, error: searchError } = await searchCatalog();

  if (searchError) {
    return jsonResponse({ error: 'Facility search is unavailable.' }, 403);
  }

  let safeCandidates = Array.isArray(candidates) ? candidates : [];
  if (safeCandidates.length === 0) {
    const directoryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-hospitals`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'directory_search',
        query,
        providerCategory: 'hospital',
        countryCode: 'NG',
        limit: 8,
      }),
    });

    if (!directoryResponse.ok) {
      return jsonResponse({ error: 'Provider directory search is unavailable.' }, 503);
    }

    ({ data: candidates, error: searchError } = await searchCatalog());
    if (searchError) {
      return jsonResponse({ error: 'Facility search is unavailable.' }, 503);
    }
    safeCandidates = Array.isArray(candidates) ? candidates : [];
  }

  if (safeCandidates.length === 0) return jsonResponse({ data: [] });

  const candidateIds = [...new Set(
    safeCandidates.map((candidate) => candidate?.id).filter(Boolean),
  )];
  const { data: provenanceRows, error: provenanceError } = await adminClient
    .from('hospitals')
    .select('id,place_id,features,provider_source,verification_status')
    .in('id', candidateIds);

  if (provenanceError) {
    return jsonResponse({ error: 'Facility search is unavailable.' }, 503);
  }

  try {
    return jsonResponse({
      data: filterOnboardingFacilityCandidates(safeCandidates, provenanceRows),
    });
  } catch {
    return jsonResponse({ error: 'Facility search is unavailable.' }, 503);
  }
});
