'use client';

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Mail, Clock, Shield, Building2, User } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * OnboardingSuccessPage - Registration confirmation
 * Shows after successful registration submission
 */
export const OnboardingSuccessPage = () => {
    const location = useLocation();
    const result = location.state?.result;
    const organization = result?.organization;
    const user = result?.user;

    return (
        <>
            <Helmet>
                <title>Registration Submitted | iVisit Console</title>
            </Helmet>

            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md text-center"
                >
                    {/* Success Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </motion.div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Registration Submitted!
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        Your organization registration is being reviewed.
                    </p>

                    {/* Display IDs - Proof of Registration */}
                    {(organization?.display_id || user?.display_id) && (
                        <div className="grid grid-cols-1 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                            {organization?.display_id && (
                                <div className="group relative overflow-hidden p-4 rounded-2xl bg-white/5  backdrop-blur-xl shadow-premium transition-all hover:bg-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/20 rounded-lg">
                                                <Building2 className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Organization Identity</span>
                                                <span className="font-mono text-lg font-bold text-foreground tracking-tight">{organization.display_id}</span>
                                            </div>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
                                    </div>
                                </div>
                            )}
                            {user?.display_id && (
                                <div className="group relative overflow-hidden p-4 rounded-2xl bg-white/5  backdrop-blur-xl shadow-premium transition-all hover:bg-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-50" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-500/20 rounded-lg">
                                                <User className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Administrator Identity</span>
                                                <span className="font-mono text-lg font-bold text-foreground tracking-tight">{user.display_id}</span>
                                            </div>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-orange-500 pulse-dot" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* What's Next */}
                    <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left space-y-4">
                        <h2 className="font-semibold text-foreground">What happens next?</h2>

                        <div className="flex gap-3">
                            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Verification in 24-48 hours</p>
                                <p className="text-xs text-muted-foreground">
                                    Our team will review your registration
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Start using iVisit</p>
                                <p className="text-xs text-muted-foreground">
                                    You can explore the dashboard while verification is pending
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button asChild className="w-full gap-2">
                            <Link to="/">
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="w-full">
                            <a href="mailto:support@ivisit.ng">
                                Contact Support
                            </a>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default OnboardingSuccessPage;
