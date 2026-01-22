import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const SetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessionVerified, setSessionVerified] = useState(false);

    useEffect(() => {
        // Verify we have a session (handled by Supabase auto-refresh from URL fragment)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSessionVerified(true);
            } else {
                // If no session found, maybe the hash wasn't processed yet or link is invalid
                // Allow a small grace period or show error?
                // Supabase usually processes hash immediately on load.

                // Check if hash exists in URL manually if needed, but usually redundant.
                const hash = window.location.hash;
                if (!hash || !hash.includes('access_token')) {
                    // toast.error("Invalid or expired link");
                    // navigate('/login');
                }
            }
        };
        checkSession();
    }, [navigate]);

    const handleSetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            passwordSchema.parse(password);

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("Password set successfully!");

            // Redirect to dashboard after short delay
            setTimeout(() => navigate('/'), 1000);

        } catch (error) {
            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message);
            } else {
                toast.error(error.message || "Failed to set password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] opacity-20 bg-orb" />
                <div className="absolute bottom-[-5%] left-[-10%] w-[60%] h-[40%] opacity-10 bg-orb" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-soft-light"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-[440px] px-6"
            >
                <div className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[32px] overflow-hidden">
                    <div className="p-8 sm:p-10">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight mb-2">Secure Your Account</h1>
                            <p className="text-muted-foreground text-sm">Create a strong password to access the console.</p>
                        </div>

                        <form onSubmit={handleSetPassword} className="space-y-5">
                            <div className="space-y-2">
                                <div className="relative group rounded-2xl bg-muted/40 border-0 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New Password"
                                        className="w-full bg-transparent border-none h-14 pl-12 pr-12 text-base placeholder:text-muted-foreground/50 focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="relative group rounded-2xl bg-muted/40 border-0 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm Password"
                                        className="w-full bg-transparent border-none h-14 pl-12 pr-12 text-base placeholder:text-muted-foreground/50 focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl shadow-lg shadow-primary/20 mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Determine Credentials <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    </div>

                    {/* Security Footer */}
                    <div className="px-8 py-4 bg-muted/30 border-t border-white/5 text-center">
                        <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">
                            End-to-End Encrypted Handshake
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
