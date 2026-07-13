import { useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { clearPrincipalScopedQueryCache } from '../../lib/queryClient';
import { clearCurrentUserCache } from '../../services/authService';
import {
  ASSURANCE_STATUS,
  createAssuranceState,
  withAuthTimeout,
} from './authState';

export const useAuthSession = ({
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
}) => {
  useEffect(() => {
    let mounted = true;
    const scheduledAuthTasks = new Set();

    const timeoutId = setTimeout(() => {
      if (mounted) {
        setInitializing((previous) => {
          if (previous) {
            setLoading(false);
            return false;
          }
          return previous;
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
    assuranceRequestRef,
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
    userRef,
  ]);

  const signIn = useCallback(async (email, password) => {
    resetMfaChallenge();
    setCanonicalAssuranceState(createAssuranceState(ASSURANCE_STATUS.CHECKING));
    setAuthError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  }, [
    refreshAssurance,
    resetMfaChallenge,
    setAuthError,
    setCanonicalAssuranceState,
    setLoading,
    userRef,
  ]);

  const signUp = useCallback(async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await withAuthTimeout(supabase.auth.signOut());
    } catch {
      // Local state still clears so the user is never left in limbo.
    } finally {
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
      localStorage.removeItem('supabase.auth.token');
    }
  }, [
    assuranceRequestRef,
    loadedProfileUserIdRef,
    resetMfaChallenge,
    setAuthError,
    setCanonicalAssuranceState,
    setInitializing,
    setLoading,
    setProfileState,
    setUserState,
    userRef,
  ]);

  const refreshProfile = useCallback(async () => {
    if (!user || assuranceRef.current.status !== ASSURANCE_STATUS.SATISFIED) return null;
    loadedProfileUserIdRef.current = null;
    return fetchProfile(user.id, user.email, user, { force: true });
  }, [assuranceRef, fetchProfile, loadedProfileUserIdRef, user]);

  return { signIn, signOut, signUp, refreshProfile };
};
