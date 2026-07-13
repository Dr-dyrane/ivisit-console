'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { AdminAccountStep } from './AdminAccountStep';
import { OrganizationTypeStep } from './OrganizationTypeStep';
import { OrganizationDetailsStep } from './OrganizationDetailsStep';
import { VerificationStep } from './VerificationStep';

const STEP_ICONS = {
  account: ShieldCheck,
  organization: Building2,
  essentials: ClipboardList,
  review: CheckCircle2,
};

const StepContent = () => {
  const { currentStep, currentStepConfig, direction } = useOnboarding();
  const components = {
    account: AdminAccountStep,
    organization: OrganizationTypeStep,
    essentials: OrganizationDetailsStep,
    review: VerificationStep,
  };
  const ActiveStep = components[currentStepConfig.id];

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={currentStepConfig.id}
        custom={direction}
        initial={{ opacity: 0, x: direction >= 0 ? 18 : -18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction >= 0 ? -18 : 18 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <ActiveStep />
      </motion.div>
    </AnimatePresence>
  );
};

const ProgressRail = () => {
  const { currentStep, steps, goToStep, user } = useOnboarding();
  const minimumStep = user ? 1 : 0;

  return (
    <ol className="space-y-1">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.id];
        const active = index === currentStep;
        const complete = index < currentStep || (step.id === 'account' && Boolean(user));
        const canReturn = index >= minimumStep && index < currentStep;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => goToStep(index)}
              disabled={!canReturn}
              aria-current={active ? 'step' : undefined}
              className={`flex w-full items-center gap-3 rounded-inner px-3 py-3 text-left transition-colors ${active ? 'bg-foreground/[0.055]' : canReturn ? 'hover:bg-foreground/[0.035]' : ''}`}
            >
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-icon ${active ? 'bg-foreground text-background' : complete ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : 'bg-foreground/[0.045] text-muted-foreground'}`}>
                {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{step.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

const Navigation = () => {
  const {
    currentStep,
    currentStepConfig,
    isCurrentStepValid,
    isLastStep,
    isSubmitting,
    goPrev,
    createAdminAccount,
    submitOnboarding,
    goNext,
    user,
  } = useOnboarding();
  const minimumStep = user ? 1 : 0;
  const canGoBack = currentStep > minimumStep;

  const handleContinue = () => {
    if (currentStepConfig.id === 'account') return createAdminAccount();
    if (isLastStep) return submitOnboarding();
    return goNext();
  };

  return (
    <div className="mt-8 flex items-center justify-between gap-3 pt-1">
      {canGoBack ? (
        <button type="button" onClick={goPrev} disabled={isSubmitting} className="flex h-11 items-center justify-center gap-2 rounded-button px-3 text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.055] hover:text-foreground disabled:opacity-45">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!isCurrentStepValid || isSubmitting}
        aria-busy={isSubmitting}
        data-state={isSubmitting ? 'pending' : 'ready'}
        className="flex h-12 min-w-36 items-center justify-center gap-2 rounded-button bg-foreground px-5 text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {isLastStep ? 'Submitting' : 'Please wait'}</>
        ) : (
          <>{isLastStep ? 'Submit registration' : 'Continue'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></>
        )}
      </button>
    </div>
  );
};

export const OnboardingWizard = () => {
  const { currentStep, currentStepConfig, flowError, progressPercent, steps } = useOnboarding();

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,560px)] lg:justify-center lg:gap-14">
      <aside className="hidden lg:block" aria-label="Registration progress">
        <div className="sticky top-10">
          <p className="mb-4 px-3 text-xs font-semibold text-muted-foreground">Registration</p>
          <ProgressRail />
        </div>
      </aside>

      <section className="min-w-0" aria-labelledby="onboarding-step-title">
        <div className="mb-6 lg:hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{currentStepConfig.title}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-pill bg-foreground/[0.07]">
            <motion.div className="h-full rounded-pill bg-foreground" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.25 }} />
          </div>
        </div>

        <header className="mb-7">
          <p className="text-xs font-semibold text-muted-foreground">{currentStepConfig.title}</p>
          <h1 id="onboarding-step-title" className="mt-2 text-2xl font-semibold sm:text-3xl">
            {currentStepConfig.id === 'account' && 'Create your administrator account'}
            {currentStepConfig.id === 'organization' && 'Tell us who you represent'}
            {currentStepConfig.id === 'essentials' && 'Add the review essentials'}
            {currentStepConfig.id === 'review' && 'Review your registration'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {currentStepConfig.id === 'account' && 'Use email and password, or continue with Google.'}
            {currentStepConfig.id === 'organization' && 'Register a new organization or check whether a facility is already listed.'}
            {currentStepConfig.id === 'essentials' && 'Only the details needed to identify and contact your organization.'}
            {currentStepConfig.id === 'review' && 'Confirm the details before they enter the review queue.'}
          </p>
        </header>

        {flowError && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-inner bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{flowError}</span>
          </div>
        )}

        <StepContent />
        <Navigation />
      </section>
    </div>
  );
};

export default OnboardingWizard;
