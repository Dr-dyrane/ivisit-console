'use client';

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Building2, Loader2, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ui/theme-toggle';

const OnboardingLoadingState = () => (
  <div className="min-h-[100dvh] bg-background text-foreground">
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
      <span className="h-9 w-32 animate-pulse rounded-button bg-foreground/[0.055] dark:bg-white/[0.07]" />
      <span className="h-9 w-9 animate-pulse rounded-button bg-foreground/[0.055] dark:bg-white/[0.07]" />
    </header>
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-start justify-center px-5 pb-10 pt-12 sm:items-center sm:px-8 sm:py-12">
      <div role="status" aria-label="Checking registration access" className="w-full max-w-[460px] text-center">
        <span className="mx-auto block h-14 w-14 animate-pulse rounded-icon bg-foreground/[0.055] dark:bg-white/[0.07]" />
        <span className="mx-auto mt-6 block h-8 w-72 max-w-full animate-pulse rounded-inner bg-foreground/[0.055] dark:bg-white/[0.07]" />
        <span className="mx-auto mt-3 block h-12 w-full max-w-sm animate-pulse rounded-inner bg-foreground/[0.035] dark:bg-white/[0.05]" />
        <span className="mx-auto mt-8 block h-12 w-full max-w-sm animate-pulse rounded-button bg-foreground/[0.07] dark:bg-white/[0.08]" />
      </div>
    </main>
  </div>
);

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isOnboarding, isSkippedOnboarding, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !isOnboarding() && !isSkippedOnboarding()) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isOnboarding, isSkippedOnboarding, navigate, user]);

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    setActionError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      setActionError('We could not sign you out. Try again.');
      setLeaving(false);
    }
  };

  if (authLoading) return <OnboardingLoadingState />;
  if (user && !isOnboarding() && !isSkippedOnboarding()) return null;

  return (
    <>
      <Helmet>
        <title>Organization Registration | iVisit Console</title>
        <meta name="description" content="Organization registration for iVisit Console" />
      </Helmet>

      <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground">
        <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
          <ThemeToggle size="xs" />
        </header>

        <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-start justify-center px-5 pb-10 pt-12 sm:items-center sm:px-8 sm:py-12">
          <section className="w-full max-w-[460px] text-center" aria-labelledby="registration-title">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.07]">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="mt-6 inline-flex w-fit items-center rounded-pill bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
              Registration unavailable
            </span>
            <h1 id="registration-title" className="mt-4 text-2xl font-semibold sm:text-3xl">
              New organization setup is paused
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Existing team members can still sign in. Contact support for help setting up a new organization.
            </p>

            <div className="mx-auto mt-8 max-w-sm space-y-3">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={leaving}
                  aria-busy={leaving}
                  data-state={leaving ? 'pending' : 'ready'}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground px-5 text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99] disabled:opacity-55"
                >
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
                  {leaving ? 'Signing out' : 'Sign out'}
                </button>
              ) : (
                <Link to="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground px-5 text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99]">
                  Back to sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}

              <a href="mailto:support@ivisit.ng" className="flex h-11 w-full items-center justify-center gap-2 rounded-button text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" /> Contact support
              </a>
            </div>

            {actionError && <p role="alert" className="mt-4 text-xs font-medium text-destructive">{actionError}</p>}
          </section>
        </main>
      </div>
    </>
  );
};

export default OnboardingPage;
