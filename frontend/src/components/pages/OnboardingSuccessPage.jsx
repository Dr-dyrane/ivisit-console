'use client';

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2, Check, CheckCircle2, Clock, FileCheck2, WalletCards } from 'lucide-react';
import ThemeToggle from '../ui/theme-toggle';

const setupItems = {
  hospital: ['Departments and specialties', 'Bed capacity', 'Care team'],
  clinic: ['Specialties and hours', 'Care team', 'Services'],
  ambulance_service: ['Fleet and coverage', 'Response team', 'Operating hours'],
};

export const OnboardingSuccessPage = () => {
  const location = useLocation();
  const result = location.state?.result;
  const organization = result?.organization;
  const facility = result?.facility;
  const claim = result?.claim;
  const hasSubmissionResult = Boolean(
    result?.success
    && result?.provisioningVerified === true
    && organization?.id
    && organization?.walletState === 'ready'
  );
  const nextItems = setupItems[organization?.type] || setupItems.hospital;

  return (
    <>
      <Helmet><title>Registration Submitted | iVisit Console</title></Helmet>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5 sm:px-8">
          <span className="text-sm font-semibold">iVisit Console</span>
          <ThemeToggle size="xs" />
        </header>

        <main className="mx-auto flex w-full max-w-4xl justify-center px-5 pb-14 pt-8 sm:px-8 sm:pt-14">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[520px]"
          >
            {!hasSubmissionResult ? (
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-5 text-2xl font-semibold">Registration status unavailable</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  No verified provisioning result was found for this page.
                </p>
                <div className="mt-8 space-y-2">
                  <Link to="/onboarding" className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-e2 hover:bg-foreground/90">
                    Return to registration <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a href="mailto:support@ivisit.ng" className="flex h-11 w-full items-center justify-center rounded-button text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground">
                    Contact support
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-xs font-semibold text-muted-foreground">Submitted for review</p>
                  <h1 className="mt-2 text-2xl font-semibold">{organization.name} is ready for review</h1>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Your organization and wallet are prepared. Verification remains pending until review is complete.
                  </p>
                </div>

                <div className="mt-8 space-y-2">
                  <div className="flex items-center gap-3 rounded-inner bg-foreground/[0.035] px-4 py-3 dark:bg-white/[0.05]">
                    <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">Organization ID</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold">{organization.display_id || organization.id}</p>
                    </div>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-3 rounded-inner bg-foreground/[0.035] px-4 py-3 dark:bg-white/[0.05]">
                    <WalletCards className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">Wallet</p>
                      <p className="mt-0.5 text-sm font-semibold">Ready</p>
                    </div>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-3 rounded-inner bg-foreground/[0.035] px-4 py-3 dark:bg-white/[0.05]">
                    {result.evidence?.count > 0 ? <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">Review evidence</p>
                      <p className="mt-0.5 text-sm font-semibold">{result.evidence?.count > 0 ? `${result.evidence.count} file${result.evidence.count === 1 ? '' : 's'} submitted` : 'Not submitted'}</p>
                    </div>
                    <span className="rounded-pill bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200">Pending</span>
                  </div>
                  {facility?.display_id && (
                    <div className="px-4 pt-1 text-xs text-muted-foreground">Facility ID: <span className="font-mono font-semibold text-foreground">{facility.display_id}</span></div>
                  )}
                  {claim?.id && (
                    <div className="flex items-center gap-3 rounded-inner bg-sky-500/10 px-4 py-3">
                      <Building2 className="h-4 w-4 text-sky-800 dark:text-sky-200" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase text-sky-800 dark:text-sky-200">Facility ownership claim</p>
                        <p className="mt-0.5 text-sm font-semibold">Submitted for administrator review</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Ownership and verification remain unchanged until approval.</p>
                      </div>
                      <span className="rounded-pill bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-800 dark:text-sky-200">
                        {claim.status || 'pending'}
                      </span>
                    </div>
                  )}
                </div>

                <section className="mt-8" aria-labelledby="next-setup-title">
                  <h2 id="next-setup-title" className="text-sm font-semibold">Complete in Console</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {nextItems.map((item) => (
                      <div key={item} className="rounded-inner bg-foreground/[0.035] px-3 py-3 text-xs font-medium text-muted-foreground dark:bg-white/[0.05]">{item}</div>
                    ))}
                  </div>
                </section>

                <div className="mt-8 space-y-2">
                  <a href="/" className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-e2 hover:bg-foreground/90">
                    Open Console <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a href="mailto:support@ivisit.ng" className="flex h-11 w-full items-center justify-center rounded-button text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground">
                    Contact support
                  </a>
                </div>
              </>
            )}
          </motion.section>
        </main>
      </div>
    </>
  );
};

export default OnboardingSuccessPage;
