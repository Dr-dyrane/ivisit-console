import { useCallback } from 'react';
import { clearCurrentUserCache, primeCurrentUserCache } from '../../services/authService';
import { loadValidatedProfile } from './authIdentityProjection';
import { withAuthTimeout } from './authState';

export const useAuthProfileLoader = ({
  activeFetchRef,
  loadedProfileUserIdRef,
  profileRef,
  setAuthError,
  setInitializing,
  setLoading,
  setProfileState,
}) => useCallback(async (userId, email, sessionUser = null, options = {}) => {
  if (
    activeFetchRef.current === userId
    || (!options.force && profileRef.current?.id === userId)
    || (!options.force && loadedProfileUserIdRef.current === userId)
  ) {
    return undefined;
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
    }

    clearCurrentUserCache();
    loadedProfileUserIdRef.current = null;
    setProfileState(null);
    setAuthError({
      type: 'profile_missing',
      message: 'Your console profile is not ready yet.',
    });
    return null;
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
}, [
  activeFetchRef,
  loadedProfileUserIdRef,
  profileRef,
  setAuthError,
  setInitializing,
  setLoading,
  setProfileState,
]);
