import {
  buildMobileDoctorKpis,
  buildMobileDoctorTotals,
  coarseAlpha,
  getDoctorStatusPill,
  getFacility,
  getMobileDoctorDetail,
  getMobileDoctorScopeCount,
  getStatus,
  hasActiveDoctorFilters,
} from './mobileDoctorsModel';

describe('mobile staff model characterization', () => {
  it('keeps availability and assignment readiness separate', () => {
    const unavailable = { status: 'available', is_available: false };
    expect(getStatus(unavailable)).toBe('unavailable');
    expect(getDoctorStatusPill(unavailable).label).toBe('Unavailable for assignment');
    expect(getStatus({ status: 'invited' })).toBe('invited');
  });

  it('uses server KPI totals before loaded-window fallbacks', () => {
    const sourceDoctors = [
      { id: 'd1', status: 'available' },
      { id: 'd2', status: 'busy' },
    ];
    const totals = buildMobileDoctorTotals({
      statistics: { total: 322, available: 321, onCall: 0, busy: 1 },
      sourceDoctors,
    });

    expect(totals).toEqual({ all: 322, available: 321, onCall: 0, busy: 1 });
    expect(buildMobileDoctorKpis(totals).map((item) => item.value)).toEqual([322, 321, 0, 1]);
    expect(getMobileDoctorScopeCount({ totals, activeKpi: 'busy' })).toBe(1);
  });

  it('keeps facility labels separate from record identity', () => {
    const doctor = {
      id: 'doctor-uuid',
      profile_id: 'profile-uuid',
      hospital_id: 'hospital-uuid',
      organization_id: 'organization-uuid',
      hospitals: { id: 'hospital-uuid', name: 'Central Hospital' },
    };

    expect(getFacility(doctor)).toBe('Central Hospital');
    expect(getMobileDoctorDetail(doctor)).toMatchObject({
      facility: 'Central Hospital',
      name: 'Unknown staff',
    });
    expect(doctor.id).toBe('doctor-uuid');
    expect(doctor.profile_id).toBe('profile-uuid');
    expect(doctor.hospital_id).toBe('hospital-uuid');
    expect(doctor.organization_id).toBe('organization-uuid');
  });

  it('keeps directory grouping bounded and title-insensitive', () => {
    expect(coarseAlpha('Dr. Ada Lovelace')).toBe('A-F');
    expect(coarseAlpha('Prof. Grace Hopper')).toBe('G-L');
    expect(coarseAlpha('123')).toBe('#');
  });

  it('tracks the mobile KPI and date filter axes', () => {
    expect(hasActiveDoctorFilters({})).toBe(false);
    expect(hasActiveDoctorFilters({ kpiFilter: 'available' })).toBe(true);
    expect(hasActiveDoctorFilters({ created_at: { end: '2026-07-13' } })).toBe(true);
  });
});
