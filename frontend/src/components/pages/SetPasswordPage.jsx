import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import ThemeToggle from '../ui/theme-toggle';

const passwordSchema = z.string().min(8, 'Use at least 8 characters');
const RECOVERY_CHECK_TIMEOUT_MS = 5000;
const PASSWORD_LINK_MARKER = 'ivisit_verified_password_link';

const isConsoleInviteSession = (session) => (
  session?.user?.user_metadata?.invitation_surface === 'console'
);

const hasPasswordLinkIntent = () => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const linkType = query.get('type') || hash.get('type');
  let stored = false;
  try {
    stored = sessionStorage.getItem(PASSWORD_LINK_MARKER) === 'true';
  } catch {
    stored = false;
  }
  return stored || query.has('code') || ['recovery', 'invite'].includes(linkType);
};

const getRecoverySession = async () => {
  let timeoutId;
  try {
    return await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('RECOVERY_CHECK_TIMEOUT')), RECOVERY_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const RecoveryHeader = ({ title, description, icon: Icon, tone = 'muted' }) => (
  <div className="text-center">
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-icon ${tone === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.07]'}`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
  </div>
);

export const SetPasswordPage = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const submitLockRef = useRef(false);
  const redirectTimerRef = useRef(null);
  const checkSequenceRef = useRef(0);
  const consoleInviteSessionRef = useRef(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState('checking');
  const [formError, setFormError] = useState('');

  const verifyRecoverySession = useCallback(async () => {
    const sequence = ++checkSequenceRef.current;
    setRecoveryStatus('checking');
    setFormError('');

    try {
      const hasLinkIntent = hasPasswordLinkIntent();
      const { data, error } = await getRecoverySession();
      if (error) throw error;
      if (!mountedRef.current || sequence !== checkSequenceRef.current) return;
      const consoleInviteSession = isConsoleInviteSession(data?.session);
      if (data?.session && (hasLinkIntent || consoleInviteSession)) {
        consoleInviteSessionRef.current = consoleInviteSession;
        try {
          sessionStorage.setItem(PASSWORD_LINK_MARKER, 'true');
        } catch {
          // The verified session still authorizes this page without storage.
        }
        setRecoveryStatus('ready');
      } else {
        setRecoveryStatus('missing');
      }
    } catch {
      if (!mountedRef.current || sequence !== checkSequenceRef.current) return;
      setRecoveryStatus('error');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      checkSequenceRef.current += 1;
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const recoverySession = event === 'PASSWORD_RECOVERY';
      const consoleInviteSession = (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')
        && isConsoleInviteSession(session)
      );
      if ((!recoverySession && !consoleInviteSession) || !session || !mountedRef.current) return;
      consoleInviteSessionRef.current = consoleInviteSession;
      try {
        sessionStorage.setItem(PASSWORD_LINK_MARKER, 'true');
      } catch {
        // The recovery event itself is sufficient for the active render.
      }
      setRecoveryStatus('ready');
    });
    verifyRecoverySession();
    return () => subscription.unsubscribe();
  }, [verifyRecoverySession]);

  const handleSetPassword = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || recoveryStatus !== 'ready') return;
    submitLockRef.current = true;
    setLoading(true);
    setFormError('');

    try {
      passwordSchema.parse(password);
      if (password !== confirmPassword) throw new Error('PASSWORD_MISMATCH');

      const updatePayload = consoleInviteSessionRef.current
        ? { password, data: { invitation_surface: null } }
        : { password };
      const { error } = await supabase.auth.updateUser(updatePayload);
      if (error) throw error;
      if (!mountedRef.current) return;

      consoleInviteSessionRef.current = false;
      try {
        sessionStorage.removeItem(PASSWORD_LINK_MARKER);
      } catch {
        // No local marker to remove.
      }
      window.history.replaceState({}, '', '/set-password');
      setRecoveryStatus('success');
      redirectTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) navigate('/', { replace: true });
      }, 900);
    } catch (caught) {
      if (!mountedRef.current) return;
      if (caught instanceof z.ZodError) {
        setFormError(caught.errors[0].message);
      } else if (caught?.message === 'PASSWORD_MISMATCH') {
        setFormError('Passwords do not match');
      } else {
        setFormError('We could not update your password. Try again.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
        <ThemeToggle size="xs" />
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-start justify-center px-5 pb-10 pt-8 sm:items-center sm:px-8 sm:py-12">
        <section className="w-full max-w-[440px]" aria-live="polite">
          {recoveryStatus === 'checking' && (
            <div role="status" className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.07]">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">Checking your link</h1>
              <p className="mt-2 text-sm text-muted-foreground">This should only take a moment.</p>
              <div className="mt-8 space-y-3" aria-hidden="true">
                <span className="block h-14 animate-pulse rounded-inner bg-foreground/[0.045] dark:bg-white/[0.055]" />
                <span className="block h-14 animate-pulse rounded-inner bg-foreground/[0.035] dark:bg-white/[0.045]" />
                <span className="block h-12 animate-pulse rounded-button bg-foreground/[0.07] dark:bg-white/[0.07]" />
              </div>
            </div>
          )}

          {(recoveryStatus === 'missing' || recoveryStatus === 'error') && (
            <div>
              <RecoveryHeader
                title={recoveryStatus === 'missing' ? 'Link unavailable' : 'Could not check this link'}
                description={recoveryStatus === 'missing' ? 'This password link is missing or expired. Request a new one from sign in.' : 'Check your connection, then try the link again.'}
                icon={AlertCircle}
                tone="danger"
              />
              <div className="mt-8 space-y-3">
                <Link to="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-e2 hover:bg-foreground/90">
                  Return to sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button type="button" onClick={verifyRecoverySession} className="flex h-11 w-full items-center justify-center gap-2 rounded-button text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                </button>
              </div>
            </div>
          )}

          {recoveryStatus === 'success' && (
            <RecoveryHeader title="Password updated" description="Your console is opening now." icon={CheckCircle2} tone="success" />
          )}

          {recoveryStatus === 'ready' && (
            <div>
              <RecoveryHeader title="Set your password" description="Use at least 8 characters, then enter it again to confirm." icon={ShieldCheck} />
              <form onSubmit={handleSetPassword} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="new-password" className="sr-only">New password</label>
                  <div className="relative rounded-inner bg-foreground/[0.045] focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setFormError(''); }} placeholder="New password" autoComplete="new-password" className="h-14 w-full bg-transparent pl-12 pr-12 text-base placeholder:text-muted-foreground/60" aria-invalid={Boolean(formError)} required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-button text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="sr-only">Confirm password</label>
                  <div className="relative rounded-inner bg-foreground/[0.045] focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
                    <CheckCircle2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setFormError(''); }} placeholder="Confirm password" autoComplete="new-password" className="h-14 w-full bg-transparent pl-12 pr-12 text-base placeholder:text-muted-foreground/60" aria-invalid={Boolean(formError)} required />
                    <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-button text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <p role="alert" className="flex items-center gap-2 px-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> {formError}
                  </p>
                )}

                <button type="submit" disabled={loading} aria-busy={loading} data-state={loading ? 'pending' : 'ready'} className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99] disabled:opacity-55">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <>Set password <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SetPasswordPage;
