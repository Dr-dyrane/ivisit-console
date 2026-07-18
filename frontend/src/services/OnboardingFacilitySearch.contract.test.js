import {
  filterOnboardingFacilityCandidates,
  isDemoOnboardingFacility,
} from '../../supabase/functions/search-onboarding-facilities/demoFacilityFilter';

const candidate = {
  id: 'facility-1',
  name: 'North Hospital',
  claimable: true,
};

describe('onboarding facility demo isolation', () => {
  it('preserves discovered real facilities', () => {
    const provenance = {
      id: candidate.id,
      place_id: 'mapbox:real-facility',
      provider_source: 'mapbox_places',
      verification_status: 'pending',
      features: ['provider_discovered'],
    };

    expect(isDemoOnboardingFacility(provenance)).toBe(false);
    expect(filterOnboardingFacilityCandidates([candidate], [provenance]))
      .toEqual([candidate]);
  });

  it.each([
    { place_id: 'demo:owner:slot:1' },
    { place_id: 'e2e:run:facility' },
    { provider_source: 'demo_bootstrap' },
    { verification_status: 'demo_verified' },
    { features: ['demo_seed'] },
    { features: ['demo_owner:review'] },
    { features: ['demo_expires_at:9999999999999'] },
    { features: ['demo_scope:review-run'] },
  ])('excludes disposable demo provenance %#', (marker) => {
    const provenance = {
      id: candidate.id,
      place_id: null,
      provider_source: 'manual_seed',
      verification_status: 'pending',
      features: [],
      ...marker,
    };

    expect(isDemoOnboardingFacility(provenance)).toBe(true);
    expect(filterOnboardingFacilityCandidates([candidate], [provenance]))
      .toEqual([]);
  });

  it('fails closed when provenance is incomplete', () => {
    expect(() => filterOnboardingFacilityCandidates([candidate], []))
      .toThrow('FACILITY_PROVENANCE_INCOMPLETE');
  });
});
