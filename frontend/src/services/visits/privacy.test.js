import {
  applyGenericVisitSourceScope,
  applyVisitPageFilters,
  GENERIC_VISIT_SELECT,
  GENERIC_VISIT_SOURCE_FILTER,
  GENERIC_VISIT_WITH_PATIENT_SELECT,
  getVisitQueryScopeKey,
} from './pageProjection';
import {
  formatVisitInFacilityTimezone,
  normalizeVisitForUI,
} from './normalization';

const createFilterBuilder = () => {
  const builder = {};
  ['gte', 'in', 'lte', 'or'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  return builder;
};

describe('visits privacy projections', () => {
  it('keeps generic history allowlisted and outside scheduled-care source rows', () => {
    const query = createFilterBuilder();
    applyGenericVisitSourceScope(query);

    expect(GENERIC_VISIT_SELECT).not.toContain('*');
    expect(GENERIC_VISIT_SELECT).not.toMatch(/notes|summary|prescriptions|message|attachment|consult|media/i);
    expect(GENERIC_VISIT_SELECT).toMatch(/\bid\b/);
    expect(GENERIC_VISIT_SELECT).toMatch(/\brequest_id\b/);
    expect(GENERIC_VISIT_WITH_PATIENT_SELECT).toContain('patient:profiles!visits_user_id_fkey');
    expect(query.or).toHaveBeenCalledWith(GENERIC_VISIT_SOURCE_FILTER);
    expect(GENERIC_VISIT_SOURCE_FILTER).toBe([
      'request_id.not.is.null',
      'care_mode.is.null',
      'care_mode.not.in.(in_person,telemedicine_async)',
    ].join(','));
  });

  it('searches only safe generic row labels and never notes', () => {
    const query = createFilterBuilder();
    applyVisitPageFilters(query, { search: '  VIS-10,%  ' });

    expect(query.or).toHaveBeenCalledWith([
      'display_id.ilike.%VIS-10%',
      'type.ilike.%VIS-10%',
      'hospital_name.ilike.%VIS-10%',
      'doctor_name.ilike.%VIS-10%',
      'room_number.ilike.%VIS-10%',
    ].join(','));
    expect(query.or.mock.calls.flat().join(' ')).not.toMatch(/notes|summary|message|consult/i);
  });

  it('keys page snapshots on every server filter, including care_mode', () => {
    const base = {
      filters: {
        search: 'visit',
        status: ['scheduled'],
        visit_type: ['checkup'],
        care_mode: ['in_person'],
        date: { start: '2026-07-01', end: '2026-07-31' },
      },
      kpiFilter: 'scheduled',
      sortConfig: { key: 'scheduled_start_at', direction: 'asc' },
      viewMode: 'scheduled',
    };

    expect(getVisitQueryScopeKey(base)).not.toBe(getVisitQueryScopeKey({
      ...base,
      filters: { ...base.filters, care_mode: ['telemedicine_async'] },
    }));
    expect(getVisitQueryScopeKey(base)).toBe(getVisitQueryScopeKey({
      ...base,
      filters: {
        date: { end: '2026-07-31', start: '2026-07-01' },
        care_mode: ['in_person'],
        visit_type: ['checkup'],
        status: ['scheduled'],
        search: 'visit',
      },
    }));
  });

  it('keeps patient and doctor identities in separate projections', () => {
    const normalized = normalizeVisitForUI({
      id: 'visit-1',
      user_id: 'patient-1',
      doctor_id: 'doctor-1',
      patient: { id: 'patient-1', full_name: 'Patient One' },
      doctor_record: { id: 'doctor-1', profile_id: 'doctor-profile-1', name: 'Doctor One' },
    });

    expect(normalized.patient).toEqual({ id: 'patient-1', full_name: 'Patient One' });
    expect(normalized.assignedDoctor).toMatchObject({
      id: 'doctor-1',
      profile_id: 'doctor-profile-1',
      name: 'Doctor One',
    });
    expect(normalized.assignedDoctor.id).not.toBe(normalized.patient.id);
  });

  it('never fabricates UTC when scheduled timezone truth is missing or invalid', () => {
    const visit = { scheduled_start_at: '2026-07-15T16:00:00.000Z' };

    expect(formatVisitInFacilityTimezone(visit)).toBe('Timezone unavailable');
    expect(formatVisitInFacilityTimezone({
      ...visit,
      scheduled_timezone: 'Invalid/Timezone',
    })).toBe('Timezone unavailable');
    expect(formatVisitInFacilityTimezone({
      ...visit,
      scheduled_timezone: 'America/Los_Angeles',
    })).toMatch(/PDT|PST/);
  });
});
