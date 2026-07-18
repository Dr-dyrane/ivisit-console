const DEMO_FEATURE_PREFIXES = [
  'demo_owner:',
  'demo_expires_at:',
  'demo_scope:',
];

const DEMO_FEATURE_FLAGS = new Set([
  'demo_seed',
  'demo_verified',
  'demo_complete',
  'demo_shared',
  'ivisit_demo',
]);

const toTextArray = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
    : []
);

export const isDemoOnboardingFacility = (facility) => {
  if (!facility || typeof facility !== 'object') return false;

  const placeId = String(facility.place_id || '').trim().toLowerCase();
  const providerSource = String(facility.provider_source || '').trim().toLowerCase();
  const verificationStatus = String(facility.verification_status || '').trim().toLowerCase();
  const features = toTextArray(facility.features);

  return (
    placeId.startsWith('demo:')
    || placeId.startsWith('e2e:')
    || providerSource === 'demo_bootstrap'
    || verificationStatus.startsWith('demo')
    || features.some((feature) => (
      DEMO_FEATURE_FLAGS.has(feature)
      || DEMO_FEATURE_PREFIXES.some((prefix) => feature.startsWith(prefix))
    ))
  );
};

export const filterOnboardingFacilityCandidates = (
  candidates,
  provenanceRows,
) => {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const provenanceById = new Map(
    (Array.isArray(provenanceRows) ? provenanceRows : [])
      .filter((row) => row?.id)
      .map((row) => [row.id, row]),
  );

  for (const candidate of safeCandidates) {
    if (!candidate?.id || !provenanceById.has(candidate.id)) {
      throw new Error('FACILITY_PROVENANCE_INCOMPLETE');
    }
  }

  return safeCandidates.filter(
    (candidate) => !isDemoOnboardingFacility(provenanceById.get(candidate.id)),
  );
};
