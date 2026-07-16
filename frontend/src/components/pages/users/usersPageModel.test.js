import { Ambulance, Stethoscope, UserRound } from 'lucide-react';
import {
  formatLastSignIn,
  formatPayoutMethod,
  getFleetAssignmentMeta,
  getOnboardingStatusMeta,
  getProviderTypeIcon,
  getRoleMeta,
  getUserInitials,
  getUsersProjection,
  getUsersSignal,
  hasActiveUserFilters,
  isFleetProviderType,
  normalizeUsersStats,
  resolveUsersRoleFilter,
  resolveUsersVerifiedFilter,
  toUsersAnalyticsShape,
} from './usersPageModel';

// U+00B7 masked-digit separator the payout formatter renders (ASCII-only source).
const PAYOUT_MASK = String.fromCharCode(183).repeat(4);

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
    expect(hasActiveUserFilters({ onboarding_status: 'all' })).toBe(false);
    expect(hasActiveUserFilters({ onboarding_status: 'pending' })).toBe(true);
    expect(hasActiveUserFilters({ created_at: { start: '2026-07-01' } })).toBe(true);
  });

  it('maps the sheet verification vocabulary to the read filter without inventing a state', () => {
    expect(resolveUsersVerifiedFilter({ bvn_verified: 'verified' })).toBe(true);
    expect(resolveUsersVerifiedFilter({ bvn_verified: 'unverified' })).toBe(false);
    expect(resolveUsersVerifiedFilter({ bvn_verified: 'all' })).toBeUndefined();
    expect(resolveUsersVerifiedFilter({})).toBeUndefined();
  });

  it('keeps the DB onboarding vocabulary and humanizes unknown keys without coercion', () => {
    expect(getOnboardingStatusMeta('pending').label).toBe('Onboarding pending');
    expect(getOnboardingStatusMeta('complete').label).toBe('Onboarding complete');
    expect(getOnboardingStatusMeta('skipped').label).toBe('Onboarding skipped');
    // Unknown value stays its raw humanized key in the muted tone.
    expect(getOnboardingStatusMeta('in_review')).toEqual({
      label: 'Onboarding in review',
      tone: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
    });
    // Null and empty resolve to an honest absence, not a default stage.
    expect(getOnboardingStatusMeta(null)).toBeNull();
    expect(getOnboardingStatusMeta('')).toBeNull();
  });

  it('resolves sign-in recency only from a parseable timestamp', () => {
    expect(formatLastSignIn(null)).toBeNull();
    expect(formatLastSignIn('not-a-date')).toBeNull();
    expect(formatLastSignIn(new Date(Date.now() - 120000).toISOString())).toBe('2m ago');
  });

  it('projects onboarding and sign-in truth onto the row projection honestly', () => {
    const projected = getUsersProjection({
      full_name: 'Ada Lovelace',
      onboarding_status: 'pending',
      last_sign_in_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    });
    expect(projected.onboardingMeta.label).toBe('Onboarding pending');
    expect(projected.lastSignIn).toBe('2h ago');

    const absent = getUsersProjection({ full_name: 'No Auth Data' });
    expect(absent.onboardingMeta).toBeNull();
    expect(absent.lastSignIn).toBeNull();
  });

  it('renders payout readiness presence-only: brand + last4, hidden when unpopulated', () => {
    expect(formatPayoutMethod({ payout_method_brand: 'visa', payout_method_last4: '4242' }))
      .toBe(`Visa ${PAYOUT_MASK} 4242`);
    // Partial presence renders only what exists -- nothing is fabricated.
    expect(formatPayoutMethod({ payout_method_brand: 'visa', payout_method_last4: null })).toBe('Visa');
    expect(formatPayoutMethod({ payout_method_brand: null, payout_method_last4: '4242' }))
      .toBe(`${PAYOUT_MASK} 4242`);
    // Production norm today: both columns null -> null, the rail hides the line.
    expect(formatPayoutMethod({ payout_method_brand: '', payout_method_last4: '   ' })).toBeNull();
    expect(formatPayoutMethod({})).toBeNull();
    expect(formatPayoutMethod(null)).toBeNull();
  });

  it('projects payout readiness for providers only and never a raw Stripe identifier', () => {
    const row = {
      role: 'provider',
      payout_method_brand: 'visa',
      payout_method_last4: '4242',
      payout_method_id: 'pm_1RawSecret',
      stripe_account_id: 'acct_1RawSecret',
      stripe_customer_id: 'cus_1RawSecret',
    };
    const projected = getUsersProjection(row);
    expect(projected.payoutMethod).toBe(`Visa ${PAYOUT_MASK} 4242`);
    expect(projected.payoutMethod).not.toContain('RawSecret');
    expect(JSON.stringify(projected)).not.toContain('RawSecret');
    // Unpopulated provider rows and non-provider rows stay honestly absent.
    expect(getUsersProjection({ role: 'provider' }).payoutMethod).toBeNull();
    expect(getUsersProjection({ ...row, role: 'patient' }).payoutMethod).toBeNull();
  });

  it('keeps the fleet persona predicate aligned with the provider-type icon', () => {
    expect(isFleetProviderType('driver')).toBe(true);
    expect(isFleetProviderType('paramedic')).toBe(true);
    expect(isFleetProviderType('ambulance_service')).toBe(true);
    expect(isFleetProviderType('doctor')).toBe(false);
    expect(isFleetProviderType(null)).toBe(false);
  });

  it('shows the fleet chip only for assigned driver-type profiles, presence-first', () => {
    const assigned = getFleetAssignmentMeta({
      provider_type: 'driver',
      assigned_ambulance_id: '11111111-1111-4111-8111-111111111111',
      assigned_ambulance_label: 'Alpha 1',
    });
    expect(assigned).toMatchObject({ label: 'Assigned Alpha 1' });
    // Unresolved label (RLS-blocked lookup) degrades to presence-only wording
    // -- never the raw assignment UUID.
    const presenceOnly = getFleetAssignmentMeta({
      provider_type: 'paramedic',
      assigned_ambulance_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(presenceOnly.label).toBe('Fleet assigned');
    expect(presenceOnly.label).not.toContain('1111');
    // No assignment, blank assignment, or non-driver persona -> no chip.
    expect(getFleetAssignmentMeta({ provider_type: 'driver' })).toBeNull();
    expect(getFleetAssignmentMeta({ provider_type: 'driver', assigned_ambulance_id: '   ' })).toBeNull();
    expect(getFleetAssignmentMeta({ provider_type: 'doctor', assigned_ambulance_id: 'amb-1' })).toBeNull();
    expect(getFleetAssignmentMeta(null)).toBeNull();
    // The projection carries the same meta for the rail.
    expect(getUsersProjection({
      provider_type: 'driver',
      assigned_ambulance_id: 'amb-1',
    }).fleetAssignment).toMatchObject({ label: 'Fleet assigned' });
    expect(getUsersProjection({ provider_type: 'doctor' }).fleetAssignment).toBeNull();
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
