'use client';

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import ThemeToggle from '../ui/theme-toggle';

const OnboardingLoadingState = () => (
  <div className="min-h-[100dvh] bg-background text-foreground">
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
      <span className="h-8 w-28 animate-pulse rounded-button bg-foreground/[0.055] dark:bg-white/[0.07]" />
      <span className="h-9 w-9 animate-pulse rounded-button bg-foreground/[0.055] dark:bg-white/[0.07]" />
    </header>
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[260px_minmax(0,560px)] lg:justify-center">
      <div className="hidden space-y-3 lg:block">
        {[0, 1, 2, 3].map((item) => <span key={item} className="block h-14 animate-pulse rounded-inner bg-foreground/[0.035] dark:bg-white/[0.05]" />)}
      </div>
      <div role="status" aria-label="Preparing registration" className="space-y-4">
        <span className="block h-4 w-24 animate-pulse rounded-pill bg-foreground/[0.055]" />
        <span className="block h-9 w-4/5 animate-pulse rounded-inner bg-foreground/[0.055]" />
        <span className="block h-12 w-full animate-pulse rounded-inner bg-foreground/[0.035]" />
        <span className="mt-8 block h-14 w-full animate-pulse rounded-inner bg-foreground/[0.045]" />
        <span className="block h-14 w-full animate-pulse rounded-inner bg-foreground/[0.045]" />
        <span className="block h-12 w-full animate-pulse rounded-button bg-foreground/[0.07]" />
      </div>
    </main>
  </div>
);

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const correctionRequested =
    profile?.organization_scope?.verificationStatus === 'changes_requested';

  useEffect(() => {
    if (
      !authLoading
      && user
      && profile?.onboarding_status === 'complete'
      && !correctionRequested
    ) {
      navigate('/', { replace: true });
    }
  }, [authLoading, correctionRequested, navigate, profile?.onboarding_status, user]);

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    await signOut();
    navigate('/login', { replace: true });
  };

  if (authLoading) return <OnboardingLoadingState />;
  if (user && profile?.onboarding_status === 'complete' && !correctionRequested) return null;

  return (
    <>
      <Helmet>
        <title>Register Your Organization | iVisit Console</title>
        <meta name="description" content="Register a healthcare organization for iVisit Console" />
      </Helmet>

      <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground">
        <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/login" className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowLeft className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
            <span className="truncate">iVisit Console</span>
          </Link>
          <div className="flex items-center gap-1">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={leaving}
                aria-busy={leaving}
                aria-label="Sign out"
                className="flex h-9 min-w-9 items-center justify-center gap-2 rounded-button px-2 text-xs font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground disabled:opacity-45"
              >
                {leaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
                <span className="hidden max-w-36 truncate sm:block">{user.email}</span>
              </button>
            ) : (
              <Link to="/login" className="flex h-9 items-center justify-center rounded-button px-3 text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground">
                Sign in
              </Link>
            )}
            <ThemeToggle size="xs" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
          <OnboardingProvider correctionMode={correctionRequested}>
            <OnboardingWizard />
          </OnboardingProvider>
        </main>
      </div>
    </>
  );
};

export default OnboardingPage;
