import {
  CAPACITY_SOURCE_UNAVAILABLE,
  getAnalyticsCapacityPresentation,
} from './analyticsCapacityModel';

describe('analytics capacity presentation', () => {
  it('fails closed when the source is incomplete', () => {
    expect(getAnalyticsCapacityPresentation({
      sourceReady: false,
      capacity: { sourceComplete: false },
    })).toEqual(expect.objectContaining({
      label: 'Bed capacity',
      value: CAPACITY_SOURCE_UNAVAILABLE,
    }));
  });

  it('distinguishes no hospitals from missing capacity reports', () => {
    expect(getAnalyticsCapacityPresentation({
      sourceReady: true,
      capacity: { sourceComplete: true, facilityCount: 0 },
    }).value).toBe('No hospitals');

    expect(getAnalyticsCapacityPresentation({
      sourceReady: true,
      capacity: {
        sourceComplete: true,
        population: 'demo',
        facilityCount: 12,
        reportingFacilities: 0,
      },
    })).toEqual({
      label: 'Capacity reports',
      value: '0 of 12',
      detail: 'No valid bed capacity reports from 12 demo hospitals.',
    });
  });

  it('reports availability with its facility coverage', () => {
    expect(getAnalyticsCapacityPresentation({
      sourceReady: true,
      capacity: {
        sourceComplete: true,
        population: 'live',
        facilityCount: 521,
        reportingFacilities: 1,
        available: 13,
        total: 50,
        coverageComplete: false,
      },
    })).toEqual({
      label: 'Reported bed availability',
      value: '26%',
      detail: '13 of 50 beds reported available; 1 of 521 hospitals reporting.',
    });
  });
});
