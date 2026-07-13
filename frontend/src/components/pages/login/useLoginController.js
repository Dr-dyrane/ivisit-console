import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ASSURANCE_STATUS, useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const emailSchema = z.string().email('Enter a valid email address');

export function useLoginController() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    signOut,
    loading: authLoading,
    user,
    profile,
    assuranceState,
    refreshAssurance,
    mfaChallenge,
    beginMfaChallenge,
    verifyMfa,
  } = useAuth();
  const submitLockRef = useRef(false);
  const redirectLockRef = useRef(false);

  const [step, setStep] = useState("email");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [setupLinkSent, setSetupLinkSent] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const requestedLocation = location.state?.from;
  const requestedPath = typeof requestedLocation?.pathname === 'string'
    && requestedLocation.pathname.startsWith('/')
    && requestedLocation.pathname !== '/login'
    ? `${requestedLocation.pathname}${requestedLocation.search || ''}${requestedLocation.hash || ''}`
    : '/';
  const assuranceStatus = assuranceState?.status || ASSURANCE_STATUS.CHECKING;
  const hasSatisfiedSession = Boolean(
    !authLoading
    && user
    && profile
    && assuranceStatus === ASSURANCE_STATUS.SATISFIED
  );
  const sessionGateActive = Boolean(user && !hasSatisfiedSession);
  const activeStep = sessionGateActive ? '2fa' : step;

  useEffect(() => {
    if (!user) {
      redirectLockRef.current = false;
      return;
    }
    if (!hasSatisfiedSession || redirectLockRef.current) return;

    redirectLockRef.current = true;
    navigate(requestedPath, { replace: true });
  }, [hasSatisfiedSession, navigate, requestedPath, user]);

  const begin = () => {
    if (submitLockRef.current) return false;
    submitLockRef.current = true;
    setError('');
    setIsLoading(true);
    return true;
  };

  const finish = () => {
    setIsLoading(false);
    submitLockRef.current = false;
  };

  const moveTo = (nextStep, nextDirection = 1) => {
    setDirection(nextDirection);
    setError('');
    setStep(nextStep);
  };

  useEffect(() => {
    if (!user || assuranceStatus !== ASSURANCE_STATUS.MFA_REQUIRED) return;

    setDirection(1);
    setStep((currentStep) => currentStep === '2fa' ? currentStep : '2fa');
    if (mfaChallenge?.status === 'idle') {
      void beginMfaChallenge();
    }
  }, [assuranceStatus, beginMfaChallenge, mfaChallenge?.status, user]);

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    try {
      const normalizedEmail = emailSchema.parse(email.trim().toLowerCase());
      setEmail(normalizedEmail);
      moveTo("password");
    } catch (caught) {
      setError(caught instanceof z.ZodError ? caught.errors[0].message : 'Enter a valid email address.');
    } finally {
      finish();
    }
  };

  const handleSetupLink = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (resetError) throw resetError;
      setSetupLinkSent(true);
      toast.success('Password setup link sent');
    } catch {
      setError('We could not send the link. Try again.');
    } finally {
      finish();
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    setMfaCode('');

    try {
      const { assurance } = await signIn(email, password);
      if (assurance?.status === ASSURANCE_STATUS.SATISFIED) {
        toast.success('Signed in');
        return;
      }

      if (assurance?.status === ASSURANCE_STATUS.MFA_REQUIRED) {
        moveTo('2fa');
        return;
      }

      setError(assurance?.error || 'We could not confirm your account security. Try again.');
    } catch {
      setError('The email or password is incorrect.');
    } finally {
      finish();
    }
  };

  const handle2FASubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    const code = mfaCode.trim();
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      finish();
      return;
    }

    try {
      const result = await verifyMfa(code);
      if (!result.ok) {
        setError(result.error || 'That code could not be verified. Try again.');
        return;
      }

      toast.success('Signed in');
    } catch {
      setError('We could not verify that code. Try again.');
    } finally {
      finish();
    }
  };

  const handleRetryAssurance = async () => {
    if (!begin()) return;

    try {
      const nextAssurance = await refreshAssurance({ force: true });
      if (nextAssurance.status === ASSURANCE_STATUS.ERROR) {
        setError(nextAssurance.error || 'We could not confirm your account security. Try again.');
        return;
      }

      if (nextAssurance.status === ASSURANCE_STATUS.MFA_REQUIRED) {
        setMfaCode('');
        const nextChallenge = await beginMfaChallenge({ force: true });
        if (nextChallenge.status === 'error') setError(nextChallenge.error);
      }
    } catch {
      setError('We could not retry the security check. Try again.');
    } finally {
      finish();
    }
  };

  const handleRetryChallenge = async () => {
    if (!begin()) return;

    try {
      setMfaCode('');
      const nextChallenge = await beginMfaChallenge({ force: true });
      if (nextChallenge.status === 'error') setError(nextChallenge.error);
    } catch {
      setError('We could not start a new security check. Try again.');
    } finally {
      finish();
    }
  };

  const handleUseAnotherAccount = async () => {
    if (!begin()) return;

    try {
      await signOut();
      setPassword('');
      setMfaCode('');
      setSetupLinkSent(false);
      moveTo('email', -1);
    } catch {
      setError('We could not sign out. Try again.');
    } finally {
      finish();
    }
  };

  const handleGoogleSignIn = async () => {
    if (!begin()) return;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError('Google sign-in is unavailable right now.');
      finish();
    }
  };

  const handleForgotPassword = async () => {
    if (!begin()) return;
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (resetError) throw resetError;
      setSetupLinkSent(true);
      toast.success('Password reset link sent');
    } catch {
      setError('We could not send the link. Try again.');
    } finally {
      finish();
    }
  };

  const assuranceLookupFailed = assuranceStatus === ASSURANCE_STATUS.ERROR || Boolean(
    user
    && ![
      ASSURANCE_STATUS.CHECKING,
      ASSURANCE_STATUS.SATISFIED,
      ASSURANCE_STATUS.MFA_REQUIRED,
    ].includes(assuranceStatus)
  );
  const challengeFailed = mfaChallenge?.status === 'error';
  const securityPending = Boolean(
    user
    && (
      assuranceStatus === ASSURANCE_STATUS.CHECKING
      || mfaChallenge?.status === 'starting'
      || mfaChallenge?.status === 'verifying'
      || (assuranceStatus === ASSURANCE_STATUS.SATISFIED && (authLoading || !profile))
    )
  );
  const securityError = error || mfaChallenge?.error || assuranceState?.error || '';
  const stepTitle = activeStep === 'email'
    ? 'Sign in'
    : activeStep === 'password'
      ? 'Enter your password'
      : assuranceLookupFailed || challengeFailed
        ? 'Security check unavailable'
        : securityPending
          ? 'Checking your account'
          : 'Security check';
  const stepDescription = activeStep === 'email'
    ? 'Use your organization email to continue.'
    : activeStep === 'password'
      ? email
      : assuranceLookupFailed || challengeFailed
        ? 'Retry the security check or sign out safely.'
        : securityPending
          ? 'Confirming the security level for this session.'
          : 'Enter the code from your authenticator app.';

  return {
    activeStep,
    assuranceLookupFailed,
    assuranceStatus,
    challengeFailed,
    direction,
    email,
    error,
    handle2FASubmit,
    handleEmailSubmit,
    handleForgotPassword,
    handleGoogleSignIn,
    handlePasswordSubmit,
    handleRetryAssurance,
    handleRetryChallenge,
    handleSetupLink,
    handleUseAnotherAccount,
    isLoading,
    mfaChallenge,
    mfaCode,
    moveTo,
    password,
    securityError,
    securityPending,
    setEmail,
    setMfaCode,
    setPassword,
    setShowPassword,
    setupLinkSent,
    showPassword,
    stepDescription,
    stepTitle,
  };
}
