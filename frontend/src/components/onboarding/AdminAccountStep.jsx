'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AdminAccountStep = () => {
  const {
    formData,
    updateFormData,
    setStepValid,
    confirmationRequired,
    signInWithGoogle,
    isSubmitting,
  } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);

  const isValid = (
    formData.adminFullName.trim().length >= 2
    && emailPattern.test(formData.adminEmail.trim())
    && formData.adminPassword.length >= 8
  );

  useEffect(() => {
    setStepValid('account', isValid);
  }, [isValid, setStepValid]);

  if (confirmationRequired) {
    return (
      <div className="py-4 text-center" role="status">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-icon bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">Check your email</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Confirm {formData.adminEmail}, then return here to continue.
        </p>
        <Link to="/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-button px-5 text-sm font-semibold hover:bg-foreground/[0.055]">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Full name</span>
        <span className="relative block rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
          <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            autoComplete="name"
            value={formData.adminFullName}
            onChange={(event) => updateFormData({ adminFullName: event.target.value })}
            placeholder="Full name"
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
          />
        </span>
      </label>

      <label className="block">
        <span className="sr-only">Work email</span>
        <span className="relative block rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="email"
            autoComplete="email"
            value={formData.adminEmail}
            onChange={(event) => updateFormData({ adminEmail: event.target.value })}
            placeholder="Work email"
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
          />
        </span>
      </label>

      <label className="block">
        <span className="sr-only">Password</span>
        <span className="relative block rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.adminPassword}
            onChange={(event) => updateFormData({ adminPassword: event.target.value })}
            placeholder="Password, 8 characters minimum"
            className="h-14 w-full bg-transparent pl-12 pr-12 text-base placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-button text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>

      <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-[hsl(var(--muted-foreground)/0.08)]" />
        or
        <span className="h-px flex-1 bg-[hsl(var(--muted-foreground)/0.08)]" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-button bg-foreground/[0.045] text-sm font-semibold transition-[background,transform] hover:bg-foreground/[0.075] active:scale-[0.99] disabled:opacity-55 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-background text-xs font-bold shadow-e1" aria-hidden="true">G</span>
        Continue with Google
      </button>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-foreground underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
};

export default AdminAccountStep;
