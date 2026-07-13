import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { clearCurrentUserCache } from '../../services/authService';
import {
  ASSURANCE_STATUS,
  classifyAssuranceLevel,
  createAssuranceState,
  createMfaChallengeState,
  withAuthTimeout,
} from './authState';

export const useAuthAssurance = ({
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
}) => {
  const resetMfaChallenge = useCallback(() => {
    challengeRequestRef.current = null;
    verifyRequestRef.current = null;
    setCanonicalMfaChallenge(createMfaChallengeState());
  }, [challengeRequestRef, setCanonicalMfaChallenge, verifyRequestRef]);

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
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
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
  }, [assuranceRef, assuranceRequestRef, setCanonicalAssuranceState, userRef]);

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
        { force: Boolean(options.forceProfile) },
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
    loadedProfileUserIdRef,
    readAssuranceLevel,
    resetMfaChallenge,
    setAuthError,
    setCanonicalAssuranceState,
    setInitializing,
    setLoading,
    setProfileState,
    setUserState,
    userRef,
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

    setCanonicalMfaChallenge(createMfaChallengeState({
      status: 'starting',
      userId: sessionUser.id,
    }));

    const promise = (async () => {
      try {
        const { data: factors, error: factorsError } = await withAuthTimeout(
          supabase.auth.mfa.listFactors(),
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
          supabase.auth.mfa.challenge({ factorId: verifiedFactor.id }),
        );
        if (challengeError || !challenge?.id) {
          throw challengeError || new Error('Challenge unavailable');
        }

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
  }, [
    assuranceRef,
    challengeRequestRef,
    mfaChallengeRef,
    refreshAssurance,
    setCanonicalMfaChallenge,
    userRef,
  ]);

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
          }),
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
  }, [
    mfaChallengeRef,
    refreshAssurance,
    resetMfaChallenge,
    setCanonicalMfaChallenge,
    userRef,
    verifyRequestRef,
  ]);

  return {
    beginMfaChallenge,
    readAssuranceLevel,
    refreshAssurance,
    resetMfaChallenge,
    verifyMfa,
  };
};
