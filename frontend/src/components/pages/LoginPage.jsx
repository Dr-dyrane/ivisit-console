import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ui/theme-toggle';
import {
  EmailLoginStep,
  PasswordLoginStep,
  SecurityLoginStep,
} from './login/LoginSteps';
import { useLoginController } from './login/useLoginController';

const stepMotion = {
  enter: (direction) => ({ x: direction > 0 ? 16 : -16, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 16 : -16, opacity: 0 }),
};

export const LoginPage = () => {
  const controller = useLoginController();

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/login" className="flex items-center gap-2 font-semibold" aria-label="iVisit Console sign in">
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          <span>iVisit Console</span>
        </Link>
        <ThemeToggle size="xs" />
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,0.7fr)]">
        <section className="hidden items-center px-12 lg:flex" aria-label="iVisit Console">
          <div className="max-w-md">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-icon bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.07]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-5xl font-semibold leading-tight">Care team console</h1>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted-foreground">
              Sign in to manage requests, facilities, staff, and care operations.
            </p>
          </div>
        </section>

        <section className="flex items-start justify-center px-5 pb-10 pt-8 sm:items-center sm:px-8 sm:py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <p className="text-sm font-semibold text-muted-foreground">Care team access</p>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-semibold">{controller.stepTitle}</h2>
              <p className="mt-2 break-words text-sm text-muted-foreground">{controller.stepDescription}</p>
            </div>

            <AnimatePresence mode="wait" custom={controller.direction} initial={false}>
              <motion.div
                key={controller.activeStep}
                custom={controller.direction}
                variants={stepMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {controller.activeStep === 'email' && (
                  <EmailLoginStep
                    email={controller.email}
                    error={controller.error}
                    isLoading={controller.isLoading}
                    onEmailChange={controller.setEmail}
                    onGoogleSignIn={controller.handleGoogleSignIn}
                    onSubmit={controller.handleEmailSubmit}
                  />
                )}

                {controller.activeStep === 'password' && (
                  <PasswordLoginStep
                    error={controller.error}
                    isLoading={controller.isLoading}
                    onBack={() => controller.moveTo('email', -1)}
                    onForgotPassword={controller.handleForgotPassword}
                    onPasswordChange={controller.setPassword}
                    onSetupLink={controller.handleSetupLink}
                    onSubmit={controller.handlePasswordSubmit}
                    onTogglePassword={() => controller.setShowPassword((visible) => !visible)}
                    password={controller.password}
                    setupLinkSent={controller.setupLinkSent}
                    showPassword={controller.showPassword}
                  />
                )}

                {controller.activeStep === '2fa' && (
                  <SecurityLoginStep
                    assuranceLookupFailed={controller.assuranceLookupFailed}
                    assuranceStatus={controller.assuranceStatus}
                    challengeFailed={controller.challengeFailed}
                    isLoading={controller.isLoading}
                    mfaChallenge={controller.mfaChallenge}
                    mfaCode={controller.mfaCode}
                    onCodeChange={controller.setMfaCode}
                    onRetryAssurance={controller.handleRetryAssurance}
                    onRetryChallenge={controller.handleRetryChallenge}
                    onSubmit={controller.handle2FASubmit}
                    onUseAnotherAccount={controller.handleUseAnotherAccount}
                    securityError={controller.securityError}
                    securityPending={controller.securityPending}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
