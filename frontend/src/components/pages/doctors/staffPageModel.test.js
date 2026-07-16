import {
  buildStaffPanelContext,
  buildStaffQueryFilter,
  buildStaffStats,
  getEffectiveStaffStatus,
  getStaffCaseload,
  getStaffIdentity,
  getStaffProjection,
  getStaffSignal,
  getStaffStatusMeta,
  hasActiveStaffFilters,
  resolveStaffStatusFilter,
} from './staffPageModel';

describe('staff page model characterization', () => {
  it('keeps KPI and sheet status intersections explicit', () => {
    expect(resolveStaffStatusFilter({
      kpiFilter: 'busy',
      status: ['available'],
    })).toEqual({
      status: 'busy',
      forceEmpty: true,
      statsStatus: ['available'],
    });

    expect(resolveStaffStatusFilter({
      kpiFilter: 'busy',
      status: ['available', 'busy'],
    })).toEqual({
      status: 'busy',
      forceEmpty: false,
      statsStatus: ['available', 'busy'],
    });
  });

  it('builds the exact bounded desktop query without changing identity scope', () => {
    expect(buildStaffQueryFilter({
      filters: {
        kpiFilter: 'busy',
        search: 'Ada',
        status: ['busy'],
        specialization: ['general'],
        created_at: { start: '2026-07-01', end: '2026-07-13' },
      },
      isMobile: false,
      currentPage: 3,
      itemsPerPage: 20,
      offset: 40,
      sortConfig: { key: 'created_at', direction: 'asc' },
    })).toEqual({
      limit: 20,
      offset: 40,
      quiet: true,
      status: 'busy',
      forceEmpty: false,
      statsStatus: ['busy'],
      sortKey: 'created_at',
      sortDirection: 'asc',
      search: 'Ada',
      specialization: ['general'],
      created_at: { start: '2026-07-01', end: '2026-07-13' },
    });
  });

  it('keeps mobile paging cumulative from offset zero', () => {
    const query = buildStaffQueryFilter({
      filters: { kpiFilter: 'all' },
      isMobile: true,
      currentPage: 3,
      itemsPerPage: 20,
      offset: 40,
      sortConfig: { key: 'created_at', direction: 'desc' },
    });

    expect(query.limit).toBe(60);
    expect(query.offset).toBe(0);
  });

  it('preserves exact server totals and the mobile onCall alias', () => {
    expect(buildStaffStats({
      staffStats: {
        total: '322',
        available: '321',
        on_call: '1',
        busy: '0',
        off_duty: '0',
      },
      count: 20,
    })).toEqual({
      total: 322,
      available: 321,
      on_call: 1,
      onCall: 1,
      busy: 0,
      off_duty: 0,
    });
  });

  it('keeps doctor, profile, facility, and organization identities distinct', () => {
    const staff = {
      id: 'doctor-uuid',
      profile_id: 'profile-uuid',
      hospital_id: 'hospital-uuid',
      organization_id: 'organization-uuid',
      hospitals: { id: 'hospital-uuid', organization_id: 'other-org-uuid' },
    };

    expect(getStaffIdentity(staff)).toEqual({
      doctorId: 'doctor-uuid',
      profileId: 'profile-uuid',
      facilityId: 'hospital-uuid',
      organizationId: 'organization-uuid',
    });
    expect(getStaffIdentity({ hospitals: { organization_id: 'joined-org-uuid' } }).organizationId)
      .toBe('joined-org-uuid');
  });

  it('does not masquerade unknown or unavailable staff as available', () => {
    expect(getEffectiveStaffStatus({ status: 'available', is_available: false })).toBe('unavailable');
    expect(getStaffStatusMeta('invited').label).toBe('Invited');
    expect(getStaffStatusMeta('credential_review').label).toBe('Credential Review');
    expect(getStaffProjection({ status: 'credential_review' }).statusMeta.label).toBe('Credential Review');
  });

  it('keeps failed-empty and route-panel projections honest', () => {
    expect(getStaffSignal({
      stats: { total: 0 },
      kpiFilter: 'all',
      loadError: 'Staff could not load.',
      hasAny: false,
    })).toMatchObject({
      tone: 'danger',
      label: 'Load failed',
      headline: 'Staff did not load',
    });

    const rows = [1, 2, 3, 4, 5].map((index) => ({ id: `doctor-${index}` }));
    const context = buildStaffPanelContext({
      stats: { total: 5 },
      staffRows: rows,
      focusedStaff: rows[2],
      loading: false,
      count: 5,
      canManage: true,
    });

    expect(context.recent).toEqual(rows.slice(0, 4));
    expect(context.focusedStaff).toBe(rows[2]);
    expect(context.canManage).toBe(true);
  });

  it('renders caseload only when both sides of the ratio are real (hide-when-null)', () => {
    expect(getStaffCaseload({ current_patients: 3, max_patients: 10 })).toBe('3/10');
    expect(getStaffCaseload({ current_patients: 0, max_patients: 10 })).toBe('0/10');
    expect(getStaffCaseload({ current_patients: '3', max_patients: '10' })).toBe('3/10');
    expect(getStaffCaseload({ current_patients: 3, max_patients: 0 })).toBeNull();
    expect(getStaffCaseload({ current_patients: 3, max_patients: null })).toBeNull();
    expect(getStaffCaseload({ current_patients: null, max_patients: 10 })).toBeNull();
    expect(getStaffCaseload({ current_patients: -1, max_patients: 10 })).toBeNull();
    expect(getStaffCaseload({ current_patients: '', max_patients: 10 })).toBeNull();
    expect(getStaffCaseload({ current_patients: 3, max_patients: ' ' })).toBeNull();
    expect(getStaffCaseload({ current_patients: 'abc', max_patients: 10 })).toBeNull();
    expect(getStaffCaseload({})).toBeNull();
    expect(getStaffCaseload(null)).toBeNull();

    expect(getStaffProjection({ current_patients: 3, max_patients: 10 }).caseload).toBe('3/10');
    expect(getStaffProjection({}).caseload).toBeNull();
  });

  it('recognizes only committed filter axes', () => {
    expect(hasActiveStaffFilters({ kpiFilter: 'busy' })).toBe(false);
    expect(hasActiveStaffFilters({ search: 'Ada' })).toBe(true);
    expect(hasActiveStaffFilters({ created_at: { start: '2026-07-01' } })).toBe(true);
  });
});
