import { Ambulance, Stethoscope, UserRound } from 'lucide-react';
import {
  getProviderTypeIcon,
  getRoleMeta,
  getUserInitials,
  getUsersProjection,
  getUsersSignal,
  hasActiveUserFilters,
  normalizeUsersStats,
  resolveUsersRoleFilter,
  toUsersAnalyticsShape,
} from './usersPageModel';

describe('usersPageModel', () => {
  it('keeps role and provider persona vocabulary stable', () => {
    expect(getRoleMeta('org_admin').label).toBe('Org admin');
    expect(getRoleMeta('clinical_reviewer').label).toBe('Clinical Reviewer');
    expect(getProviderTypeIcon('paramedic')).toBe(Ambulance);
    expect(getProviderTypeIcon('physician')).toBe(Stethoscope);
    expect(getProviderTypeIcon(null)).toBe(UserRound);
  });

  it('projects identity fields without inventing organization ownership', () => {
    expect(getUsersProjection({
      full_name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'provider',
      provider_type: 'doctor',
      organization_id: 'org-1',
      bvn_verified: true,
    }, { 'org-1': 'iVisit Clinic' })).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'provider',
      providerType: 'doctor',
      organization: 'iVisit Clinic',
      verified: true,
    });

    expect(getUsersProjection({ organization_id: 'missing' }).organization).toBe('Independent');
  });

  it('composes the KPI role with the sheet role fail-closed', () => {
    expect(resolveUsersRoleFilter({ kpiFilter: 'provider' })).toEqual({
      role: 'provider',
      forceEmpty: false,
    });
    expect(resolveUsersRoleFilter({ kpiFilter: 'provider', role: ['org_admin'] })).toEqual({
      role: 'provider',
      forceEmpty: true,
    });
    expect(resolveUsersRoleFilter({ kpiFilter: 'all', role: ['provider', 'org_admin'] })).toEqual({
      role: ['provider', 'org_admin'],
      forceEmpty: false,
    });
  });

  it('recognizes only meaningful user filters', () => {
    expect(hasActiveUserFilters({ kpiFilter: 'provider' })).toBe(false);
    expect(hasActiveUserFilters({ search: 'ada' })).toBe(true);
    expect(hasActiveUserFilters({ bvn_verified: 'all' })).toBe(false);
    expect(hasActiveUserFilters({ created_at: { start: '2026-07-01' } })).toBe(true);
  });

  it('rejects partial or malformed statistics instead of presenting zero', () => {
    expect(normalizeUsersStats({
      total: '12',
      provider: '4',
      org_admin: 2,
      patient: 6,
      verified: 8,
    })).toEqual({ total: 12, provider: 4, org_admin: 2, patient: 6, verified: 8 });
    expect(normalizeUsersStats({ total: 12, provider: undefined })).toBeNull();
    expect(normalizeUsersStats(null)).toBeNull();
  });

  it('maps the exact directory counts to the analytics modal user keys', () => {
    expect(toUsersAnalyticsShape({
      total: 12,
      provider: 4,
      org_admin: 2,
      patient: 6,
      verified: 8,
    })).toEqual({
      total: 12,
      totalUsers: 12,
      totalProfiles: 12,
      verifiedUsers: 8,
      roleDistribution: { provider: 4, org_admin: 2, patient: 6 },
    });
    expect(toUsersAnalyticsShape(null)).toBeNull();
    expect(toUsersAnalyticsShape({ total: 12 })).toBeNull();
  });

  it('keeps degraded and scoped signal copy deterministic', () => {
    expect(getUsersSignal({ loadError: 'failed', hasAny: true }).headline).toBe('Showing saved users');
    expect(getUsersSignal({ statisticsError: 'failed', hasAny: false }).headline).toBe('User totals need a retry');
    expect(getUsersSignal({
      stats: { total: 4, provider: 2, org_admin: 1, patient: 1, verified: 3 },
      kpiFilter: 'provider',
      hasAny: true,
    })).toMatchObject({ label: 'Providers', headline: '2 providers' });
  });

  it('keeps compact initials stable', () => {
    expect(getUserInitials('Ada Lovelace')).toBe('AL');
    expect(getUserInitials('Prince')).toBe('P');
    expect(getUserInitials('')).toBe('U');
  });
});
