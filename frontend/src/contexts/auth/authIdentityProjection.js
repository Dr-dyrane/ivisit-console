import { supabase } from '../../lib/supabase';

const isMissingIdentityProjection = (error) => (
  error?.code === 'PGRST202'
  || error?.code === '42883'
  || /get_console_identity_projection.*does not exist/i.test(String(error?.message || ''))
);

export const loadValidatedProfile = async (userId) => {
  const { data: projection, error: projectionError } = await supabase.rpc('get_console_identity_projection');

  if (!projectionError && projection?.profile) {
    const rawOrganizationId = projection.profile.organization_id || null;
    const scope = projection.organizationScope || {};
    const facilityIds = Array.isArray(scope.facilityIds)
      ? scope.facilityIds.filter(Boolean)
      : scope.primaryFacilityId
        ? [scope.primaryFacilityId]
        : [];
    return {
      ...projection.profile,
      source_organization_id: rawOrganizationId,
      organization_id: scope.organizationId || null,
      hospital_ids: facilityIds,
      organization_scope_state: scope.state || 'unavailable',
      organization_scope: scope,
    };
  }

  if (projectionError && !isMissingIdentityProjection(projectionError)) {
    throw projectionError;
  }

  const { data: rawProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!rawProfile) return null;

  let organization = null;
  let facilityIds = [];
  if (rawProfile.organization_id) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, display_id')
      .eq('id', rawProfile.organization_id)
      .maybeSingle();
    if (error) throw error;
    organization = data;

    if (organization) {
      const { data: facilities, error: facilitiesError } = await supabase
        .from('hospitals')
        .select('id')
        .eq('organization_id', organization.id);
      if (facilitiesError) throw facilitiesError;
      facilityIds = (facilities || []).map((facility) => facility.id).filter(Boolean);
    }
  }

  const scopeState = organization
    ? 'ready'
    : rawProfile.organization_id
      ? 'missing_org'
      : rawProfile.onboarding_status === 'pending' || rawProfile.onboarding_status === 'skipped'
        ? 'pending_onboarding'
        : 'missing_org';

  return {
    ...rawProfile,
    source_organization_id: rawProfile.organization_id || null,
    organization_id: organization?.id || null,
    hospital_ids: facilityIds,
    organization_scope_state: scopeState,
    organization_scope: {
      organizationId: organization?.id || null,
      organizationDisplayId: organization?.display_id || null,
      facilityIds,
      primaryFacilityId: facilityIds[0] || null,
      walletInitialized: null,
      state: scopeState,
    },
  };
};
