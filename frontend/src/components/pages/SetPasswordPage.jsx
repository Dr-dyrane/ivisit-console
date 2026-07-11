import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleAuthError } from "../../utils/errorHandler";
import { z } from 'zod';

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const SetPasswordPage = () => {
    const navigate = useNavigate();
    const isMountedRef = useRef(true);
    const redirectTimerRef = useRef(null);
    const submitLockRef = useRef(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessionVerified, setSessionVerified] = useState(false);
    const [recoveryStatus, setRecoveryStatus] = useState('checking'); // checking | ready | missing

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (redirectTimerRef.current) {
                window.clearTimeout(redirectTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        let retryTimer;

        const checkSession = async (attempt = 0) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (cancelled || !isMountedRef.current) return;

            if (session) {
                setSessionVerified(true);
                setRecoveryStatus('ready');
            } else {
                const hash = window.location.hash;
                if (hash.includes('access_token') && attempt < 2) {
                    retryTimer = window.setTimeout(() => checkSession(attempt + 1), 500);
                    return;
                }

                setSessionVerified(false);
                setRecoveryStatus('missing');
            }
        };

        checkSession();

        return () => {
            cancelled = true;
            if (retryTimer) window.clearTimeout(retryTimer);
        };
    }, [navigate]);

    const handleSetPassword = async (e) => {
        e.preventDefault();

        if (submitLockRef.current) return;
        submitLockRef.current = true;

        if (!sessionVerified) {
            setRecoveryStatus('missing');
            toast.error("Open the latest password link and try again.");
            submitLockRef.current = false;
            return;
        }

        try {
            setLoading(true);

            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            passwordSchema.parse(password);

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            if (!isMountedRef.current) return;

            toast.success("Password set successfully!");

            // Redirect to dashboard after short delay
            redirectTimerRef.current = window.setTimeout(() => {
                if (isMountedRef.current) {
                    navigate('/');
                }
            }, 1000);

        } catch (error) {
            if (!isMountedRef.current) return;

            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message);
            } else {
                handleAuthError(error, 'update');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            submitLockRef.current = false;
        }
    };

    return (
        <div className="relative min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-[440px] px-6"
            >
                <div className="bg-card shadow-lg rounded-modal overflow-hidden">
                    <div className="p-8 sm:p-10">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 surface-raised rounded-icon flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Set your password</h1>
                            <p className="text-muted-foreground text-sm">Create a strong password to access the console.</p>
                        </div>

                        {recoveryStatus !== 'ready' && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="mb-5 flex items-start gap-3 rounded-inner bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
                            >
                                {recoveryStatus === 'checking' ? (
                                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                                )}
                                <span>
                                    {recoveryStatus === 'checking'
                                        ? 'Checking your password link.'
                                        : 'This password link is missing or expired. Request a new link from Login.'}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSetPassword} className="space-y-5">
                            <div className="space-y-2">
                                <div className="relative group rounded-inner bg-muted/40 focus-within:bg-background focus-within:shadow-sm transition-all">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New Password"
                                        className="w-full bg-transparent h-14 pl-12 pr-12 text-base placeholder:text-muted-foreground/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-button p-1 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="relative group rounded-inner bg-muted/40 focus-within:bg-background focus-within:shadow-sm transition-all">
                                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm Password"
                                        className="w-full bg-transparent h-14 pl-12 pr-12 text-base placeholder:text-muted-foreground/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-button p-1 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !sessionVerified}
                                aria-busy={loading}
                                data-state={loading ? 'pending' : sessionVerified ? 'ready' : 'unavailable'}
                                className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background font-semibold rounded-button shadow-lg mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        {sessionVerified ? 'Set password' : 'Open latest link'}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-4 bg-muted/30 text-center">
                        <p className="text-[11px] font-semibold opacity-50">
                            Password recovery
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
