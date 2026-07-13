import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { clearPrincipalScopedQueryCache } from '../lib/queryClient';
import { DynamicAuthSkeleton } from '../components/ui/skeleton';
import {
  discardUnpersistedProfileAvatar,
  updateProfile as updateProfileService,
  uploadProfileAvatar,
} from '../services/profilesService';
import { clearCurrentUserCache, primeCurrentUserCache, updatePassword as updatePasswordService } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Role hierarchy: admin > org_admin > sponsor > provider > viewer
const ROLE_HIERARCHY = {
  admin: 5,
  org_admin: 4,
  sponsor: 3,
  provider: 2,
  viewer: 1,
};

export const ASSURANCE_STATUS = Object.freeze({
  CHECKING: 'checking',
  SATISFIED: 'satisfied',
  MFA_REQUIRED: 'mfa_required',
  ERROR: 'error',
  SIGNED_OUT: 'signed_out',
});

const AUTH_OPERATION_TIMEOUT_MS = 10000;

const createAssuranceState = (status = ASSURANCE_STATUS.CHECKING, overrides = {}) => ({
  status,
  currentLevel: null,
  nextLevel: null,
  checkedUserId: null,
  error: null,
  ...overrides,
});

const createMfaChallengeState = (overrides = {}) => ({
  status: 'idle',
  userId: null,
  factorId: null,
  challengeId: null,
  error: null,
  ...overrides,
});

export const classifyAssuranceLevel = (assurance) => {
  const currentLevel = assurance?.currentLevel;
  const nextLevel = assurance?.nextLevel;
  const knownLevels = ['aal1', 'aal2'];

  if (!knownLevels.includes(currentLevel) || !knownLevels.includes(nextLevel)) {
    return ASSURANCE_STATUS.ERROR;
  }

  if (currentLevel === 'aal1' && nextLevel === 'aal2') {
    return ASSURANCE_STATUS.MFA_REQUIRED;
  }

  if (currentLevel === nextLevel) {
    return ASSURANCE_STATUS.SATISFIED;
  }

  return ASSURANCE_STATUS.ERROR;
};

const withAuthTimeout = (operation) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Auth operation timed out')), AUTH_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timeoutId));
};

const isMissingIdentityProjection = (error) => (
  error?.code === 'PGRST202'
  || error?.code === '42883'
  || /get_console_identity_projection.*does not exist/i.test(String(error?.message || ''))
);

const loadValidatedProfile = async (userId) => {
  const { data: projection, error: projectionError } = await supabase.rpc('get_console_identity_projection');

  if (!projectionError && projection?.profile) {
    const rawOrganizationId = projection.profile.organization_id || null;
    const scope = projection.organizationScope || {};
    const facilityIds = Array.isArray(scope.facilityIds)
      ? scope.facilityIds.filter(Boolean)
      : scope.primaryFacilityId
        ? [scope.primaryFacilityId]
        : [];
    return {
      ...projection.profile,
      source_organization_id: rawOrganizationId,
      organization_id: scope.organizationId || null,
      hospital_ids: facilityIds,
      organization_scope_state: scope.state || 'unavailable',
      organization_scope: scope,
    };
  }

  if (projectionError && !isMissingIdentityProjection(projectionError)) {
    throw projectionError;
  }

  // Deployment-order fallback for environments that have not received the
  // projection RPC yet. Scope is still proved against organizations before use.
  const { data: rawProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!rawProfile) return null;

  let organization = null;
  let facilityIds = [];
  if (rawProfile.organization_id) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, display_id')
      .eq('id', rawProfile.organization_id)
      .maybeSingle();
    if (error) throw error;
    organization = data;

    if (organization) {
      const { data: facilities, error: facilitiesError } = await supabase
        .from('hospitals')
        .select('id')
        .eq('organization_id', organization.id);
      if (facilitiesError) throw facilitiesError;
      facilityIds = (facilities || []).map((facility) => facility.id).filter(Boolean);
    }
  }

  const scopeState = organization
    ? 'ready'
    : rawProfile.organization_id
      ? 'missing_org'
      : rawProfile.onboarding_status === 'pending' || rawProfile.onboarding_status === 'skipped'
        ? 'pending_onboarding'
        : 'missing_org';

  return {
    ...rawProfile,
    source_organization_id: rawProfile.organization_id || null,
    organization_id: organization?.id || null,
    hospital_ids: facilityIds,
    organization_scope_state: scopeState,
    organization_scope: {
      organizationId: organization?.id || null,
      organizationDisplayId: organization?.display_id || null,
      facilityIds,
      primaryFacilityId: facilityIds[0] || null,
      walletInitialized: null,
      state: scopeState,
    },
  };
};

export const AuthProvider = ({ children, pathname = "/" }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [assuranceState, setAssuranceState] = useState(() => createAssuranceState());
  const [mfaChallenge, setMfaChallenge] = useState(() => createMfaChallengeState());
  const userRef = React.useRef(null);
  const profileRef = React.useRef(null);
  const loadedProfileUserIdRef = React.useRef(null);
  const assuranceRef = React.useRef(createAssuranceState());
  const mfaChallengeRef = React.useRef(createMfaChallengeState());
  const assuranceRequestRef = React.useRef(null);
  const challengeRequestRef = React.useRef(null);
  const verifyRequestRef = React.useRef(null);

  const setUserState = useCallback((newUser) => {
    const previousUserId = userRef.current?.id || null;
    const nextUserId = newUser?.id || null;
    if (previousUserId && nextUserId && previousUserId !== nextUserId) {
      clearPrincipalScopedQueryCache();
    }
    userRef.current = newUser;
    setUser(newUser);
  }, []);

  const setProfileState = useCallback((newProfile) => {
    profileRef.current = newProfile;
    setProfile(newProfile);
  }, []);

  const setCanonicalAssuranceState = useCallback((nextState) => {
    assuranceRef.current = nextState;
    setAssuranceState(nextState);
  }, []);

  const setCanonicalMfaChallenge = useCallback((nextState) => {
    mfaChallengeRef.current = nextState;
    setMfaChallenge(nextState);
  }, []);

  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Ref to track active fetch to prevent loops
  const activeFetchRef = React.useRef(null);

  const fetchProfile = useCallback(async (userId, email, sessionUser = null, options = {}) => {
    // Prevent concurrent fetches for same user
    if (
      activeFetchRef.current === userId ||
      (!options.force && profileRef.current?.id === userId) ||
      (!options.force && loadedProfileUserIdRef.current === userId)
    ) {
      return;
    }

    try {
      activeFetchRef.current = userId;
      setAuthError(null);

      const data = await withAuthTimeout(loadValidatedProfile(userId));

      if (data) {
        loadedProfileUserIdRef.current = userId;
        primeCurrentUserCache(sessionUser || { id: userId, email }, data);
        setProfileState(data);
        return data;
      } else {
        clearCurrentUserCache();
        loadedProfileUserIdRef.current = null;
        setProfileState(null);
        setAuthError({
          type: 'profile_missing',
          message: 'Your console profile is not ready yet.',
        });
        return null;
      }
    } catch {
      // Keep degraded auth startup visible through app state, not raw browser diagnostics.
      clearCurrentUserCache();
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      setAuthError({
        type: 'profile_unavailable',
        message: 'We could not load your console profile.',
      });
      return null;
    } finally {
      activeFetchRef.current = null;
      setLoading(false);
      setInitializing(false);
    }
  }, [setProfileState]);

  const resetMfaChallenge = useCallback(() => {
    challengeRequestRef.current = null;
    verifyRequestRef.current = null;
    setCanonicalMfaChallenge(createMfaChallengeState());
  }, [setCanonicalMfaChallenge]);

  const readAssuranceLevel = useCallback(async (userId, options = {}) => {
    if (!userId) {
      const signedOutState = createAssuranceState(ASSURANCE_STATUS.SIGNED_OUT);
      setCanonicalAssuranceState(signedOutState);
      return signedOutState;
    }

    const inFlight = assuranceRequestRef.current;
    if (inFlight?.userId === userId) return inFlight.promise;

    const current = assuranceRef.current;
    if (
      !options.force
      && current.checkedUserId === userId
      && [ASSURANCE_STATUS.SATISFIED, ASSURANCE_STATUS.MFA_REQUIRED].includes(current.status)
    ) {
      return current;
    }

    if (userRef.current?.id === userId) {
      setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.CHECKING, {
        checkedUserId: userId,
      }));
    }

    const promise = (async () => {
      try {
        const { data, error } = await withAuthTimeout(
          supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        );
        if (error) throw error;

        const status = classifyAssuranceLevel(data);
        if (status === ASSURANCE_STATUS.ERROR) {
          throw new Error('Unrecognized assurance level');
        }

        const nextState = createAssuranceState(status, {
          currentLevel: data.currentLevel,
          nextLevel: data.nextLevel,
          checkedUserId: userId,
        });
        if (userRef.current?.id === userId) setCanonicalAssuranceState(nextState);
        return nextState;
      } catch {
        const failedState = createAssuranceState(ASSURANCE_STATUS.ERROR, {
          checkedUserId: userId,
          error: 'We could not confirm your account security. Try again.',
        });
        if (userRef.current?.id === userId) setCanonicalAssuranceState(failedState);
        return failedState;
      }
    })();

    assuranceRequestRef.current = { userId, promise };
    try {
      return await promise;
    } finally {
      if (assuranceRequestRef.current?.promise === promise) {
        assuranceRequestRef.current = null;
      }
    }
  }, [setCanonicalAssuranceState]);

  const refreshAssurance = useCallback(async (options = {}) => {
    const sessionUser = options.sessionUser || userRef.current;
    if (!sessionUser?.id) {
      const signedOutState = createAssuranceState(ASSURANCE_STATUS.SIGNED_OUT);
      setCanonicalAssuranceState(signedOutState);
      setLoading(false);
      setInitializing(false);
      return signedOutState;
    }

    const userChanged = userRef.current?.id !== sessionUser.id;
    if (userChanged) {
      clearCurrentUserCache();
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      resetMfaChallenge();
    }

    setUserState(sessionUser);
    setLoading(true);

    let nextState = await readAssuranceLevel(sessionUser.id, { force: options.force });
    if (userRef.current?.id !== sessionUser.id) return nextState;

    if (
      options.requireAal2
      && (nextState.status !== ASSURANCE_STATUS.SATISFIED || nextState.currentLevel !== 'aal2')
    ) {
      nextState = createAssuranceState(ASSURANCE_STATUS.ERROR, {
        currentLevel: nextState.currentLevel,
        nextLevel: nextState.nextLevel,
        checkedUserId: sessionUser.id,
        error: 'We could not confirm the completed security check. Try again.',
      });
      setCanonicalAssuranceState(nextState);
    }

    if (nextState.status === ASSURANCE_STATUS.SATISFIED) {
      await fetchProfile(
        sessionUser.id,
        sessionUser.email,
        sessionUser,
        { force: Boolean(options.forceProfile) }
      );
    } else {
      clearCurrentUserCache();
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      setAuthError(null);
    }

    setLoading(false);
    setInitializing(false);
    return nextState;
  }, [
    fetchProfile,
    readAssuranceLevel,
    resetMfaChallenge,
    setCanonicalAssuranceState,
    setProfileState,
    setUserState,
  ]);

  const beginMfaChallenge = useCallback(async (options = {}) => {
    const sessionUser = userRef.current;
    if (!sessionUser?.id) {
      const unavailableState = createMfaChallengeState({
        status: 'error',
        error: 'Your session ended. Sign in again.',
      });
      setCanonicalMfaChallenge(unavailableState);
      return unavailableState;
    }

    let currentAssurance = assuranceRef.current;
    if (currentAssurance.status !== ASSURANCE_STATUS.MFA_REQUIRED) {
      currentAssurance = await refreshAssurance({ sessionUser, force: true });
      if (currentAssurance.status !== ASSURANCE_STATUS.MFA_REQUIRED) {
        return createMfaChallengeState({
          status: currentAssurance.status === ASSURANCE_STATUS.SATISFIED ? 'idle' : 'error',
          userId: sessionUser.id,
          error: currentAssurance.error,
        });
      }
    }

    const inFlight = challengeRequestRef.current;
    if (inFlight?.userId === sessionUser.id) return inFlight.promise;

    const currentChallenge = mfaChallengeRef.current;
    if (
      !options.force
      && currentChallenge.userId === sessionUser.id
      && currentChallenge.status === 'ready'
    ) {
      return currentChallenge;
    }

    const startingState = createMfaChallengeState({
      status: 'starting',
      userId: sessionUser.id,
    });
    setCanonicalMfaChallenge(startingState);

    const promise = (async () => {
      try {
        const { data: factors, error: factorsError } = await withAuthTimeout(
          supabase.auth.mfa.listFactors()
        );
        if (factorsError) throw factorsError;

        const factorList = [
          ...(Array.isArray(factors?.totp) ? factors.totp : []),
          ...(Array.isArray(factors?.all) ? factors.all : []),
        ];
        const verifiedFactor = factorList.find((factor) => (
          factor.status === 'verified'
          && (factor.factorType === 'totp' || factor.factor_type === 'totp')
        ));
        if (!verifiedFactor?.id) throw new Error('Verified factor unavailable');

        const { data: challenge, error: challengeError } = await withAuthTimeout(
          supabase.auth.mfa.challenge({ factorId: verifiedFactor.id })
        );
        if (challengeError || !challenge?.id) throw challengeError || new Error('Challenge unavailable');

        const readyState = createMfaChallengeState({
          status: 'ready',
          userId: sessionUser.id,
          factorId: verifiedFactor.id,
          challengeId: challenge.id,
        });
        if (userRef.current?.id === sessionUser.id) setCanonicalMfaChallenge(readyState);
        return readyState;
      } catch {
        const failedState = createMfaChallengeState({
          status: 'error',
          userId: sessionUser.id,
          error: 'We could not start the security check. Try again or sign out.',
        });
        if (userRef.current?.id === sessionUser.id) setCanonicalMfaChallenge(failedState);
        return failedState;
      }
    })();

    challengeRequestRef.current = { userId: sessionUser.id, promise };
    try {
      return await promise;
    } finally {
      if (challengeRequestRef.current?.promise === promise) {
        challengeRequestRef.current = null;
      }
    }
  }, [refreshAssurance, setCanonicalMfaChallenge]);

  const verifyMfa = useCallback(async (code) => {
    const normalizedCode = String(code || '').replace(/\D/g, '').slice(0, 6);
    const sessionUser = userRef.current;
    const challenge = mfaChallengeRef.current;

    if (normalizedCode.length !== 6) {
      return { ok: false, error: 'Enter the 6-digit code.' };
    }
    if (
      !sessionUser?.id
      || challenge.userId !== sessionUser.id
      || !challenge.factorId
      || !challenge.challengeId
    ) {
      return { ok: false, error: 'This security check expired. Start a new check.' };
    }

    const inFlight = verifyRequestRef.current;
    if (inFlight?.userId === sessionUser.id) return inFlight.promise;

    setCanonicalMfaChallenge({ ...challenge, status: 'verifying', error: null });

    const promise = (async () => {
      try {
        const { error: verifyError } = await withAuthTimeout(
          supabase.auth.mfa.verify({
            factorId: challenge.factorId,
            challengeId: challenge.challengeId,
            code: normalizedCode,
          })
        );
        if (verifyError) throw verifyError;

        const verifiedAssurance = await refreshAssurance({
          sessionUser,
          force: true,
          requireAal2: true,
        });
        if (verifiedAssurance.status !== ASSURANCE_STATUS.SATISFIED) {
          const failedState = createMfaChallengeState({
            status: 'error',
            userId: sessionUser.id,
            error: verifiedAssurance.error || 'We could not confirm the security check. Try again.',
          });
          setCanonicalMfaChallenge(failedState);
          return { ok: false, error: failedState.error };
        }

        resetMfaChallenge();
        return { ok: true, assurance: verifiedAssurance };
      } catch {
        const retryState = {
          ...challenge,
          status: 'ready',
          error: 'That code could not be verified. Try again or start a new check.',
        };
        if (userRef.current?.id === sessionUser.id) setCanonicalMfaChallenge(retryState);
        return { ok: false, error: retryState.error };
      }
    })();

    verifyRequestRef.current = { userId: sessionUser.id, promise };
    try {
      return await promise;
    } finally {
      if (verifyRequestRef.current?.promise === promise) {
        verifyRequestRef.current = null;
      }
    }
  }, [refreshAssurance, resetMfaChallenge, setCanonicalMfaChallenge]);

  useEffect(() => {
    let mounted = true;
    const scheduledAuthTasks = new Set();

    const timeoutId = setTimeout(() => {
      if (mounted) {
        setInitializing(prev => {
          if (prev) {
            setLoading(false);
            return false;
          }
          return prev;
        });
      }
    }, 8000);

    const clearSessionState = () => {
      clearPrincipalScopedQueryCache();
      clearCurrentUserCache();
      assuranceRequestRef.current = null;
      loadedProfileUserIdRef.current = null;
      setAuthError(null);
      setProfileState(null);
      setUserState(null);
      setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.SIGNED_OUT));
      resetMfaChallenge();
      setLoading(false);
      setInitializing(false);
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await withAuthTimeout(supabase.auth.getSession());
        if (!mounted) return;

        clearTimeout(timeoutId);
        if (error) throw error;

        if (session?.user) {
          await refreshAssurance({ sessionUser: session.user, force: true });
        } else {
          clearSessionState();
        }
      } catch {
        if (mounted) {
          setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.ERROR, {
            error: 'We could not confirm your session. Try again.',
          }));
          setAuthError({
            type: 'session_unavailable',
            message: 'We could not confirm your session.',
          });
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        clearSessionState();
        return;
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/set-password');
      }

      const currentUser = session?.user ?? null;
      if (!currentUser) return;

      if (userRef.current?.id && userRef.current.id !== currentUser.id) {
        clearCurrentUserCache();
        loadedProfileUserIdRef.current = null;
        setProfileState(null);
        resetMfaChallenge();
      }
      setUserState(currentUser);
      const taskId = setTimeout(async () => {
        scheduledAuthTasks.delete(taskId);
        if (!mounted || userRef.current?.id !== currentUser.id) return;

        const requireAal2 = event === 'MFA_CHALLENGE_VERIFIED'
          || mfaChallengeRef.current.status === 'verifying';
        await refreshAssurance({
          sessionUser: currentUser,
          force: true,
          requireAal2,
        });
      }, 0);
      scheduledAuthTasks.add(taskId);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      scheduledAuthTasks.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, [
    navigate,
    refreshAssurance,
    resetMfaChallenge,
    setCanonicalAssuranceState,
    setProfileState,
    setUserState,
  ]);

  const signIn = useCallback(async (email, password) => {
    resetMfaChallenge();
    setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.CHECKING));
    setAuthError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data?.user) throw new Error('Sign-in session unavailable');

      const assurance = await refreshAssurance({
        sessionUser: data.user,
        force: true,
      });
      return { ...data, assurance };
    } catch (error) {
      if (!userRef.current) {
        setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.SIGNED_OUT));
      }
      setLoading(false);
      throw error;
    }
  }, [refreshAssurance, resetMfaChallenge, setCanonicalAssuranceState]);

  const signUp = useCallback(async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Attempt to sign out from Supabase server
      await withAuthTimeout(supabase.auth.signOut());
    } catch {
      // Local state is still cleared below so the user is never left in limbo.
    } finally {
      // Always clear local state regardless of server response
      if (userRef.current) clearPrincipalScopedQueryCache();
      clearCurrentUserCache();
      assuranceRequestRef.current = null;
      setUserState(null);
      setAuthError(null);
      loadedProfileUserIdRef.current = null;
      setProfileState(null);
      setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.SIGNED_OUT));
      resetMfaChallenge();
      setLoading(false);
      setInitializing(false);
      // Optional: Clear any other local storage items if you have custom ones
      localStorage.removeItem('supabase.auth.token'); // Fallback cleanup
    }
  }, [resetMfaChallenge, setCanonicalAssuranceState, setProfileState, setUserState]);

  const refreshProfile = useCallback(async () => {
    if (!user || assuranceRef.current.status !== ASSURANCE_STATUS.SATISFIED) return null;
    loadedProfileUserIdRef.current = null;
    return fetchProfile(user.id, user.email, user, { force: true });
  }, [fetchProfile, user]);

  const hasRole = useCallback((roles) => {
    if (!profile) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  }, [profile]);

  const hasMinRole = useCallback((minRole) => {
    if (!profile) return false;
    const userLevel = ROLE_HIERARCHY[profile.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
  }, [profile]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSponsor = useCallback(() => hasRole('sponsor'), [hasRole]);
  const isOrgAdmin = useCallback(() => hasRole('org_admin'), [hasRole]);
  const isProvider = useCallback(() => hasRole('provider'), [hasRole]);
  // Persona derivation: responder-shaped provider types share the driver lens
  // (arbitration of record, docs/rbac/PERSONA_MATRIX_2026-07-09.md section 3.3).
  // Same equivalence set as TodayHome useRoleKind and mobileNavigation's responder slate.
  const isDriver = useCallback(
    () => hasRole('provider') && ['driver', 'paramedic', 'ambulance', 'ambulance_service'].includes(profile?.provider_type),
    [hasRole, profile]
  );
  const isViewer = useCallback(() => hasRole('viewer'), [hasRole]);
  const isPatient = useCallback(() => hasRole('patient'), [hasRole]);

  // Check if user is mid-onboarding (has pending status)
  const isOnboarding = useCallback(() => profile?.onboarding_status === 'pending', [profile]);

  // Check if user has skipped onboarding
  const isSkippedOnboarding = useCallback(() => profile?.onboarding_status === 'skipped', [profile]);

  /**
   * Universal Permission Checker
   * @param {string} action - 'view', 'create', 'edit', 'delete'
   * @param {string} resource - 'doctors', 'visits', 'ambulances', 'finance', 'analytics', etc.
   * @returns {boolean}
   */
  const can = useCallback((action, resource) => {
    if (isAdmin()) return true;
    const normalizedResource = resource === 'emergencies' ? 'emergency_requests' : resource;

    // Finance & Analytics access (Privileged)
    if (['finance', 'analytics', 'subscriptions'].includes(normalizedResource)) {
      if (isAdmin() || isOrgAdmin() || isSponsor()) {
        if (isSponsor() && action !== 'view') return false; // Sponsors are read-only for finance
        return true;
      }
      return false;
    }

    // Org Admins can manage their own resources
    if (isOrgAdmin()) {
      const manageable = ['doctors', 'ambulances', 'visits', 'users', 'emergency_requests', 'drivers', 'staff'];
      if (manageable.includes(normalizedResource)) return true;
    }

    // Sponsors can view operational data for transparency
    if (isSponsor()) {
      const viewable = ['emergency_requests', 'hospitals', 'visits'];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    // Providers can view and sometimes edit their own stuff
    if (isProvider()) {
      const viewable = [
        'doctors',
        'ambulances',
        'visits',
        'hospitals',
        'emergency_requests',
        'medical_profiles'
      ];
      if (action === 'view' && viewable.includes(normalizedResource)) return true;
    }

    // Viewers are read-only across the system
    if (isViewer()) {
      if (action === 'view') return true;
    }

    return false;
  }, [isAdmin, isOrgAdmin, isProvider, isSponsor, isViewer]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('No user logged in');
    const data = await updateProfileService(user.id, updates);
    setProfileState(data);
    return data;
  }, [setProfileState, user]);

  const uploadAvatar = useCallback(async (file) => {
    if (!user) throw new Error('No user logged in');
    return uploadProfileAvatar(user.id, file);
  }, [user]);

  const discardAvatarUpload = useCallback(async (upload) => {
    if (!user) throw new Error('No user logged in');
    return discardUnpersistedProfileAvatar(user.id, upload);
  }, [user]);

  const updatePassword = useCallback(async (password) => {
    return await updatePasswordService(password);
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    authError,
    assuranceState,
    mfaChallenge,
    orgId: profile?.organization_id || null,
    loading,
    signIn,
    signUp,
    signOut,
    refreshAssurance,
    beginMfaChallenge,
    verifyMfa,
    refreshProfile,
    updateProfile,
    uploadAvatar,
    discardAvatarUpload,
    updatePassword,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isOrgAdmin,
    isProvider,
    isDriver,
    isViewer,
    isPatient,
    isOnboarding,
    isSkippedOnboarding,
    can,
  }), [
    user,
    profile,
    authError,
    assuranceState,
    mfaChallenge,
    loading,
    signIn,
    signUp,
    signOut,
    refreshAssurance,
    beginMfaChallenge,
    verifyMfa,
    refreshProfile,
    updateProfile,
    uploadAvatar,
    discardAvatarUpload,
    updatePassword,
    hasRole,
    hasMinRole,
    isAdmin,
    isSponsor,
    isOrgAdmin,
    isProvider,
    isDriver,
    isViewer,
    isPatient,
    isOnboarding,
    isSkippedOnboarding,
    can
  ]);

  // Show skeleton during initial load
  if (initializing) {
    return <DynamicAuthSkeleton pathname={pathname} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
