import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicAuthSkeleton } from '../components/ui/skeleton';
import { clearPrincipalScopedQueryCache } from '../lib/queryClient';
import { useAuthAssurance } from './auth/useAuthAssurance';
import { useAuthCapabilities } from './auth/useAuthCapabilities';
import { useAuthProfileActions } from './auth/useAuthProfileActions';
import { useAuthProfileLoader } from './auth/useAuthProfileLoader';
import { useAuthSession } from './auth/useAuthSession';
import {
  createAssuranceState,
  createMfaChallengeState,
} from './auth/authState';

export { ASSURANCE_STATUS, classifyAssuranceLevel } from './auth/authState';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children, pathname = '/' }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [assuranceState, setAssuranceState] = useState(() => createAssuranceState());
  const [mfaChallenge, setMfaChallenge] = useState(() => createMfaChallengeState());
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const userRef = useRef(null);
  const profileRef = useRef(null);
  const loadedProfileUserIdRef = useRef(null);
  const assuranceRef = useRef(createAssuranceState());
  const mfaChallengeRef = useRef(createMfaChallengeState());
  const assuranceRequestRef = useRef(null);
  const challengeRequestRef = useRef(null);
  const verifyRequestRef = useRef(null);
  const activeFetchRef = useRef(null);

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

  const fetchProfile = useAuthProfileLoader({
    activeFetchRef,
    loadedProfileUserIdRef,
    profileRef,
    setAuthError,
    setInitializing,
    setLoading,
    setProfileState,
  });

  const {
    beginMfaChallenge,
    refreshAssurance,
    resetMfaChallenge,
    verifyMfa,
  } = useAuthAssurance({
    assuranceRef,
    assuranceRequestRef,
    challengeRequestRef,
    fetchProfile,
    loadedProfileUserIdRef,
    mfaChallengeRef,
    setAuthError,
    setCanonicalAssuranceState,
    setCanonicalMfaChallenge,
    setInitializing,
    setLoading,
    setProfileState,
    setUserState,
    userRef,
    verifyRequestRef,
  });

  const { refreshProfile, signIn, signOut, signUp } = useAuthSession({
    assuranceRef,
    assuranceRequestRef,
    fetchProfile,
    loadedProfileUserIdRef,
    mfaChallengeRef,
    navigate,
    refreshAssurance,
    resetMfaChallenge,
    setAuthError,
    setCanonicalAssuranceState,
    setInitializing,
    setLoading,
    setProfileState,
    setUserState,
    user,
    userRef,
  });

  const {
    can,
    hasMinRole,
    hasRole,
    isAdmin,
    isDriver,
    isOnboarding,
    isOrgAdmin,
    isPatient,
    isProvider,
    isSkippedOnboarding,
    isSponsor,
    isViewer,
  } = useAuthCapabilities(profile);
  const {
    discardAvatarUpload,
    updatePassword,
    updateProfile,
    uploadAvatar,
  } = useAuthProfileActions({ user, setProfileState });

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
    assuranceState,
    authError,
    beginMfaChallenge,
    can,
    discardAvatarUpload,
    hasMinRole,
    hasRole,
    isAdmin,
    isDriver,
    isOnboarding,
    isOrgAdmin,
    isPatient,
    isProvider,
    isSkippedOnboarding,
    isSponsor,
    isViewer,
    loading,
    mfaChallenge,
    profile,
    refreshAssurance,
    refreshProfile,
    signIn,
    signOut,
    signUp,
    updatePassword,
    updateProfile,
    uploadAvatar,
    user,
    verifyMfa,
  ]);

  if (initializing) return <DynamicAuthSkeleton pathname={pathname} />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
