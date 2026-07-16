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

// ADOPT-30 hardening (strictly more protective): 'comment' joins the banned
// terms so rating_comment -- patient-authored free text -- can never be
// quietly adopted into a generic visit read.
const GENERIC_BANNED_CONTENT = /notes|summary|prescriptions|message|attachment|consult|media|comment/i;

describe('visits privacy projections', () => {
  it('keeps generic history allowlisted and outside scheduled-care source rows', () => {
    const query = createFilterBuilder();
    applyGenericVisitSourceScope(query);

    expect(GENERIC_VISIT_SELECT).not.toContain('*');
    expect(GENERIC_VISIT_SELECT).not.toMatch(GENERIC_BANNED_CONTENT);
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

  // ADOPT-30 (user-ratified privacy decision): numeric/financial outcome
  // columns are operator-visible; patient-authored free text is not. The
  // projection adopts rating, rated_at, tip_amount, tip_currency, tipped_at
  // and NOTHING else from the post-completion group.
  it('adopts post-completion outcome columns without patient-authored text', () => {
    ['rating', 'rated_at', 'tip_amount', 'tip_currency', 'tipped_at'].forEach((column) => {
      expect(GENERIC_VISIT_SELECT).toMatch(new RegExp(`\\b${column}\\b`));
      expect(GENERIC_VISIT_WITH_PATIENT_SELECT).toMatch(new RegExp(`\\b${column}\\b`));
    });

    // The hardened ban is non-vacuous: it catches the forbidden column by name,
    // so a future adoption of rating_comment fails the regex pin above too.
    expect('rating_comment').toMatch(GENERIC_BANNED_CONTENT);

    [GENERIC_VISIT_SELECT, GENERIC_VISIT_WITH_PATIENT_SELECT].forEach((select) => {
      expect(select).not.toContain('rating_comment');
      expect(select).not.toContain('tip_payment_id');
    });
  });

  // Boundary parser discipline for the adopted outcome columns: junk collapses
  // to null with the raw value preserved nowhere.
  it('normalizes rating and tip evidence at the boundary with honest nulls', () => {
    const normalized = normalizeVisitForUI({
      id: 'visit-rated',
      rating: 4,
      rated_at: '2026-07-15T10:00:00.000Z',
      tip_amount: 500,
      tip_currency: ' ngn ',
      tipped_at: '2026-07-15T11:00:00.000Z',
    });
    expect(normalized.rating).toBe(4);
    expect(normalized.rated_at).toBe('2026-07-15T10:00:00.000Z');
    expect(normalized.tip_amount).toBe(500);
    expect(normalized.tip_currency).toBe('NGN');
    expect(normalized.tipped_at).toBe('2026-07-15T11:00:00.000Z');

    // 1..5 range guard, including the Number('') === 0 trap.
    expect(normalizeVisitForUI({ id: 'v', rating: '' }).rating).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', rating: 0 }).rating).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', rating: 6 }).rating).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', rating: 'junk' }).rating).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', rating: true }).rating).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', rating: '5' }).rating).toBe(5);

    // Tips must be finite positive; currency is a trimmed uppercase code.
    expect(normalizeVisitForUI({ id: 'v', tip_amount: 0 }).tip_amount).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', tip_amount: -10 }).tip_amount).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', tip_amount: '' }).tip_amount).toBeNull();
    expect(normalizeVisitForUI({ id: 'v', tip_currency: '   ' }).tip_currency).toBeNull();

    const empty = normalizeVisitForUI({ id: 'visit-empty' });
    ['rating', 'rated_at', 'tip_amount', 'tip_currency', 'tipped_at'].forEach((key) => {
      expect(empty[key]).toBeNull();
    });

    // Even a leaked forbidden field never survives the boundary.
    const leaked = normalizeVisitForUI({
      id: 'visit-leak',
      rating_comment: 'patient free text',
      tip_payment_id: 'payment-1',
    });
    expect(leaked.rating_comment).toBeUndefined();
    expect(leaked.tip_payment_id).toBeUndefined();
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
