import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { ASSURANCE_STATUS } from '../../../contexts/AuthContext';
import { FieldError, PrimaryButton } from './LoginPrimitives';

export function EmailLoginStep({
  email,
  error,
  isLoading,
  onEmailChange,
  onGoogleSignIn,
  onSubmit,
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="sr-only">Email address</label>
          <div className="group relative rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="h-14 w-full bg-transparent pl-12 pr-4 text-base placeholder:text-muted-foreground/60"
              placeholder="name@organization.com"
              disabled={isLoading}
              aria-invalid={Boolean(error)}
              required
            />
          </div>
          <FieldError message={error} />
        </div>
        <PrimaryButton loading={isLoading}>
          Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-[hsl(var(--muted-foreground)/0.08)]" />
        or
        <span className="h-px flex-1 bg-[hsl(var(--muted-foreground)/0.08)]" />
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-button bg-foreground/[0.045] text-sm font-semibold transition-[background,transform] hover:bg-foreground/[0.075] active:scale-[0.99] disabled:opacity-55 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-background text-xs font-bold shadow-e1" aria-hidden="true">G</span>
        Continue with Google
      </button>

      <div className="mt-8 space-y-4 text-center text-sm">
        <p className="text-muted-foreground">
          New to iVisit?{' '}
          <Link to="/onboarding" className="font-semibold text-foreground underline underline-offset-4">Register your organization</Link>
        </p>
        <a href="https://www.ivisit.ng/support" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
          Trouble signing in? Contact support
        </a>
      </div>
    </>
  );
}

export function PasswordLoginStep({
  error,
  isLoading,
  onBack,
  onForgotPassword,
  onPasswordChange,
  onSetupLink,
  onSubmit,
  onTogglePassword,
  password,
  setupLinkSent,
  showPassword,
}) {
  return (
    <>
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Change email
      </button>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-password" className="sr-only">Password</label>
          <div className="relative rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="h-14 w-full bg-transparent pl-12 pr-12 text-base placeholder:text-muted-foreground/60"
              placeholder="Password"
              disabled={isLoading}
              aria-invalid={Boolean(error)}
              required
            />
            <button type="button" onClick={onTogglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-button text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError message={error} />
        </div>
        <PrimaryButton loading={isLoading}>
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </form>
      {setupLinkSent ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-inner bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Check your email</p>
            <p className="mt-1 text-xs opacity-80">Open the latest link to set or reset your password.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
          <button type="button" onClick={onForgotPassword} disabled={isLoading} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">
            Forgot password?
          </button>
          <button type="button" onClick={onSetupLink} disabled={isLoading} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">
            Set up password
          </button>
        </div>
      )}
    </>
  );
}

export function SecurityLoginStep({
  assuranceLookupFailed,
  assuranceStatus,
  challengeFailed,
  isLoading,
  mfaChallenge,
  mfaCode,
  onCodeChange,
  onRetryAssurance,
  onRetryChallenge,
  onSubmit,
  onUseAnotherAccount,
  securityError,
  securityPending,
}) {
  return (
    <>
      {securityPending ? (
        <div role="status" className="flex min-h-40 flex-col items-center justify-center rounded-inner bg-foreground/[0.035] px-6 py-8 text-center dark:bg-white/[0.05]">
          <Loader2 className="mb-3 h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold">Confirming this session</p>
          <p className="mt-1 text-xs text-muted-foreground">This should only take a moment.</p>
        </div>
      ) : assuranceLookupFailed || challengeFailed ? (
        <div role="alert" className="rounded-inner bg-destructive/[0.07] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm leading-5 text-foreground">{securityError}</p>
          </div>
          <button
            type="button"
            onClick={assuranceLookupFailed ? onRetryAssurance : onRetryChallenge}
            disabled={isLoading}
            aria-busy={isLoading}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-button bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-55"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {assuranceLookupFailed ? 'Retry security check' : 'Start a new security check'}
          </button>
        </div>
      ) : assuranceStatus === ASSURANCE_STATUS.MFA_REQUIRED && mfaChallenge?.status === 'ready' ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="mfa-code" className="sr-only">Six-digit authentication code</label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={mfaCode}
              onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-16 w-full rounded-inner bg-foreground/[0.045] text-center font-mono text-2xl dark:bg-white/[0.06]"
              placeholder="000000"
              disabled={isLoading}
              aria-invalid={Boolean(securityError)}
            />
            <FieldError message={securityError} />
          </div>
          <PrimaryButton loading={isLoading} disabled={mfaCode.length !== 6}>
            Verify <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </PrimaryButton>
          <button
            type="button"
            onClick={onRetryChallenge}
            disabled={isLoading}
            className="w-full text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            Start a new security check
          </button>
        </form>
      ) : (
        <div role="status" className="flex min-h-40 flex-col items-center justify-center rounded-inner bg-foreground/[0.035] px-6 py-8 text-center dark:bg-white/[0.05]">
          <Loader2 className="mb-3 h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold">Preparing security check</p>
        </div>
      )}

      <button
        type="button"
        onClick={onUseAnotherAccount}
        disabled={isLoading || mfaChallenge?.status === 'verifying'}
        className="mt-5 w-full text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
      >
        Use another account
      </button>
    </>
  );
}
