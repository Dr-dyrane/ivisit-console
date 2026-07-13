import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { handleAuthError } from "../../utils/errorHandler";
import ThemeToggle from "../ui/theme-toggle";

const emailSchema = z.string().email("Enter a valid email address");

const stepMotion = {
  enter: (direction) => ({ x: direction > 0 ? 16 : -16, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 16 : -16, opacity: 0 }),
};

const FieldError = ({ message }) => message ? (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    role="alert"
    className="mt-2 flex items-center gap-2 px-1 text-xs font-medium text-destructive"
  >
    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
    {message}
  </motion.p>
) : null;

const PrimaryButton = ({ loading, children, disabled = false }) => (
  <button
    type="submit"
    disabled={loading || disabled}
    aria-busy={loading}
    data-state={loading ? "pending" : disabled ? "unavailable" : "ready"}
    className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground px-5 text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
  </button>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, loading: authLoading, user, profile } = useAuth();
  const submitLockRef = useRef(false);

  const [step, setStep] = useState("email");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [setupLinkSent, setSetupLinkSent] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (!authLoading && user && profile) navigate("/", { replace: true });
  }, [authLoading, navigate, profile, user]);

  const begin = () => {
    if (submitLockRef.current) return false;
    submitLockRef.current = true;
    setError("");
    setIsLoading(true);
    return true;
  };

  const finish = () => {
    setIsLoading(false);
    submitLockRef.current = false;
  };

  const moveTo = (nextStep, nextDirection = 1) => {
    setDirection(nextDirection);
    setError("");
    setStep(nextStep);
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    try {
      const normalizedEmail = emailSchema.parse(email.trim().toLowerCase());
      setEmail(normalizedEmail);

      const { data, error: checkError } = await supabase.functions.invoke("check-user", {
        body: { email: normalizedEmail },
      });

      if (!checkError && data?.exists === false) {
        setError("No account was found for this email.");
        return;
      }

      moveTo(!checkError && data?.hasPassword === false ? "setup" : "password");
    } catch (caught) {
      setError(caught instanceof z.ZodError ? caught.errors[0].message : "We could not check this email. Try again.");
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
      toast.success("Password setup link sent");
    } catch (caught) {
      handleAuthError(caught, "reset");
      setError("We could not send the link. Try again.");
    } finally {
      finish();
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    setMfaFactorId(null);
    setMfaChallengeId(null);
    setMfaCode("");

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const enrolledFactor = (factors?.all || []).find((factor) => factor.status === "verified");

      if (!enrolledFactor) {
        toast.success("Signed in");
        navigate("/", { replace: true });
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolledFactor.id,
      });
      if (challengeError) throw challengeError;

      setMfaFactorId(enrolledFactor.id);
      setMfaChallengeId(challenge.id);
      moveTo("2fa");
    } catch {
      setError("The email or password is incorrect.");
    } finally {
      finish();
    }
  };

  const handle2FASubmit = async (event) => {
    event.preventDefault();
    if (!begin()) return;

    const code = mfaCode.trim();
    if (code.length !== 6 || !mfaFactorId || !mfaChallengeId) {
      setError(code.length !== 6 ? "Enter the 6-digit code." : "This security check expired. Sign in again.");
      if (!mfaFactorId || !mfaChallengeId) moveTo("password", -1);
      finish();
      return;
    }

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code,
      });
      if (verifyError) throw verifyError;
      toast.success("Signed in");
      navigate("/", { replace: true });
    } catch {
      setError("That code is not valid. Try again.");
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
    } catch (caught) {
      handleAuthError(caught, "authenticate");
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
      toast.success("Password reset link sent");
    } catch (caught) {
      handleAuthError(caught, "reset");
    } finally {
      finish();
    }
  };

  const stepTitle = step === "email" ? "Sign in" : step === "password" ? "Enter your password" : step === "setup" ? "Set up your password" : "Security check";
  const stepDescription = step === "email" ? "Use your organization email to continue." : step === "password" ? email : step === "setup" ? email : "Enter the code from your authenticator app.";

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
              <h2 className="text-2xl font-semibold">{stepTitle}</h2>
              <p className="mt-2 break-words text-sm text-muted-foreground">{stepDescription}</p>
            </div>

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === "email" && (
                  <>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                            onChange={(event) => setEmail(event.target.value)}
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
                      <span className="h-px flex-1 bg-foreground/10" />
                      or
                      <span className="h-px flex-1 bg-foreground/10" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-button bg-foreground/[0.045] text-sm font-semibold transition-[background,transform] hover:bg-foreground/[0.075] active:scale-[0.99] disabled:opacity-55 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-background text-xs font-bold shadow-e1" aria-hidden="true">G</span>
                      Continue with Google
                    </button>

                    <div className="mt-8 space-y-4 text-center text-sm">
                      <p className="text-muted-foreground">
                        New to iVisit?{" "}
                        <Link to="/onboarding" className="font-semibold text-foreground underline underline-offset-4">Register your organization</Link>
                      </p>
                      <a href="https://www.ivisit.ng/support" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                        Trouble signing in? Contact support
                      </a>
                    </div>
                  </>
                )}

                {step === "password" && (
                  <>
                    <button type="button" onClick={() => moveTo("email", -1)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Change email
                    </button>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="login-password" className="sr-only">Password</label>
                        <div className="relative rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
                          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            autoFocus
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="h-14 w-full bg-transparent pl-12 pr-12 text-base placeholder:text-muted-foreground/60"
                            placeholder="Password"
                            disabled={isLoading}
                            aria-invalid={Boolean(error)}
                            required
                          />
                          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-button text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FieldError message={error} />
                      </div>
                      <PrimaryButton loading={isLoading}>
                        Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </PrimaryButton>
                    </form>
                    <button type="button" onClick={handleForgotPassword} disabled={isLoading} className="mt-6 text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">
                      Forgot your password?
                    </button>
                  </>
                )}

                {step === "setup" && (
                  <>
                    <button type="button" onClick={() => moveTo("email", -1)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Change email
                    </button>
                    {setupLinkSent ? (
                      <div role="status" className="rounded-inner bg-emerald-500/10 p-5 text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        <p className="mt-3 font-semibold">Check your email</p>
                        <p className="mt-1 text-sm opacity-80">Open the latest link to create your password.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSetupLink} className="space-y-4">
                        <p className="rounded-inner bg-foreground/[0.045] p-4 text-sm leading-relaxed text-muted-foreground dark:bg-white/[0.06]">
                          This account needs a password. We will only send a setup link after you confirm.
                        </p>
                        <FieldError message={error} />
                        <PrimaryButton loading={isLoading}>
                          Send setup link <Mail className="h-4 w-4" aria-hidden="true" />
                        </PrimaryButton>
                      </form>
                    )}
                  </>
                )}

                {step === "2fa" && (
                  <>
                    <button type="button" onClick={() => moveTo("password", -1)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                    </button>
                    <form onSubmit={handle2FASubmit} className="space-y-4">
                      <div>
                        <label htmlFor="mfa-code" className="sr-only">Six-digit authentication code</label>
                        <input
                          id="mfa-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          autoFocus
                          value={mfaCode}
                          onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="h-16 w-full rounded-inner bg-foreground/[0.045] text-center font-mono text-2xl dark:bg-white/[0.06]"
                          placeholder="000000"
                          disabled={isLoading}
                          aria-invalid={Boolean(error)}
                        />
                        <FieldError message={error} />
                      </div>
                      <PrimaryButton loading={isLoading} disabled={mfaCode.length !== 6}>
                        Verify <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      </PrimaryButton>
                    </form>
                  </>
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
