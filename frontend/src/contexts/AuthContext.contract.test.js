import fs from 'fs';

describe('AuthContext startup disclosure contract', () => {
  it('keeps auth startup degradation out of raw browser diagnostics', () => {
    const source = fs.readFileSync('src/contexts/AuthContext.jsx', 'utf8');

    expect(source).toContain('Keep degraded auth startup visible through app state');
    expect(source).toContain("type: 'profile_missing'");
    expect(source).toContain("type: 'profile_unavailable'");
    expect(source).toContain('authError,');
    expect(source).not.toContain("console.error('[AuthContext] Error creating profile:'");
    expect(source).not.toContain("console.error('[AuthContext] Error in profile flow:'");
    expect(source).not.toContain("console.error('[AuthContext] Session fetch error:'");
  });

  it('does not create, promote, or fake profile truth from the browser', () => {
    const authSource = fs.readFileSync('src/contexts/AuthContext.jsx', 'utf8');
    const routeSource = fs.readFileSync('src/components/common/ProtectedRoute.jsx', 'utf8');

    expect(authSource).toContain('.maybeSingle()');
    expect(authSource).toContain('clearCurrentUserCache');
    expect(authSource).toContain('primeCurrentUserCache');
    expect(authSource).not.toContain(".upsert([newProfile]");
    expect(authSource).not.toContain(".update({ role: 'admin' })");
    expect(authSource).not.toContain("display_id: 'USR-OFFLINE'");
    expect(authSource).not.toContain("role: email === 'halodyrane@gmail.com'");
    expect(routeSource).toContain('state={{ reason: authError.type, from: location }}');
    expect(routeSource).toContain('Account not ready');
    expect(routeSource).toContain('Your console profile is not ready yet.');
  });

  it('keeps Requests permissions tied to the backend emergency_requests resource', () => {
    const authSource = fs.readFileSync('src/contexts/AuthContext.jsx', 'utf8');
    const routeSource = fs.readFileSync('src/config/routes.jsx', 'utf8');
    const navigationSource = fs.readFileSync('src/config/navigation.js', 'utf8');

    expect(routeSource).toContain("resource: 'emergency_requests'");
    expect(navigationSource).toContain("label: 'Requests', resource: 'emergency_requests'");
    expect(authSource).toContain("const normalizedResource = resource === 'emergencies' ? 'emergency_requests' : resource;");
    expect(authSource).toContain("const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests', 'drivers', 'staff'];");
    expect(authSource).toContain("const viewable = ['emergency_requests', 'hospitals', 'visits'];");
    expect(authSource).toContain("'emergency_requests',");
  });

  it('deduplicates service-level current-user profile reads', () => {
    const authSource = fs.readFileSync('src/contexts/AuthContext.jsx', 'utf8');
    const authServiceSource = fs.readFileSync('src/services/authService.js', 'utf8');

    expect(authServiceSource).toContain('const CURRENT_USER_CACHE_MS = 60000');
    expect(authServiceSource).toContain('let currentUserPromise = null');
    expect(authServiceSource).toContain('export function clearCurrentUserCache()');
    expect(authServiceSource).toContain('export function primeCurrentUserCache(sessionUser, profile)');
    expect(authServiceSource).toContain("profile.role === 'org_admin'");
    expect(authServiceSource).toContain('Array.isArray(profile.hospital_ids) ? profile.hospital_ids : []');
    expect(authSource).toContain('Array.isArray(scope.facilityIds)');
    expect(authSource).toContain('hospital_ids: facilityIds');
    expect(authSource).toContain(".eq('organization_id', organization.id)");
    expect(authServiceSource).toContain('currentUserCache.userId === session.user.id');
    expect(authServiceSource).toContain('currentUserPromise?.userId === session.user.id');
    expect(authServiceSource).toContain('loadCurrentUserWithProfile(session.user)');
  });

  it('suppresses known Supabase auth lock abort noise at the service boundary', () => {
    const authServiceSource = fs.readFileSync('src/services/authService.js', 'utf8');

    expect(authServiceSource).toContain('function isSupabaseAuthLockAbort(errorLike)');
    expect(authServiceSource).toContain('/AbortError/i.test(`${name} ${message}`)');
    expect(authServiceSource).toContain('/signal is aborted without reason/i.test(message)');
    expect(authServiceSource).toContain('if (!options.quiet && !isSupabaseAuthLockAbort(error)) {');
    expect(authServiceSource).toContain("console.error('Error getting current user:', error);");
  });

  it('clears unscoped React Query truth only when authenticated ownership changes or ends', () => {
    const authSource = fs.readFileSync('src/contexts/AuthContext.jsx', 'utf8');
    const queryClientSource = fs.readFileSync('src/lib/queryClient.js', 'utf8');

    expect(queryClientSource).toContain('export const clearPrincipalScopedQueryCache = () => {');
    expect(queryClientSource).toContain('queryClient.clear();');
    expect(authSource).toContain('previousUserId && nextUserId && previousUserId !== nextUserId');
    expect(authSource).toContain('if (userRef.current) clearPrincipalScopedQueryCache();');
  });
});
