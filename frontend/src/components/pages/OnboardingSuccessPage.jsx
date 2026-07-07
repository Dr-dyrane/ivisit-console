'use client';

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, ArrowRight, Clock, Shield, Building2, User } from 'lucide-react';
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
    const hasSubmissionResult = Boolean(result?.success);

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
                    {!hasSubmissionResult ? (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-20 h-20 rounded-icon bg-primary/10 flex items-center justify-center mx-auto mb-6"
                            >
                                <AlertCircle className="w-10 h-10 text-primary" />
                            </motion.div>

                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                Registration status unavailable
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                Open this page from the registration flow so we can show your submission details.
                            </p>

                            <div className="space-y-3">
                                <Button asChild className="w-full gap-2">
                                    <Link to="/onboarding">
                                        Continue registration
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full">
                                    <a href="mailto:support@ivisit.ng">
                                        Contact Support
                                    </a>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-20 h-20 rounded-icon bg-primary/10 flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle className="w-10 h-10 text-primary" />
                            </motion.div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                Registration submitted
                            </h1>
                            <p className="text-muted-foreground mb-4">
                                We received your registration details.
                            </p>

                            {/* Display IDs - Proof of Registration */}
                            {(organization?.display_id || user?.display_id) && (
                                <div className="grid grid-cols-1 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                                    {organization?.display_id && (
                                        <div className="group relative overflow-hidden p-4 rounded-inner bg-white/5 backdrop-blur-xl shadow-premium transition-all hover:bg-white/10">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/20 rounded-icon">
                                                        <Building2 className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[11px] font-semibold text-muted-foreground/70 block">Organization ID</span>
                                                        <span className="font-mono text-lg font-semibold text-foreground">{organization.display_id}</span>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-pill bg-primary pulse-dot" />
                                            </div>
                                        </div>
                                    )}
                                    {user?.display_id && (
                                        <div className="group relative overflow-hidden p-4 rounded-inner bg-white/5 backdrop-blur-xl shadow-premium transition-all hover:bg-white/10">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/20 rounded-icon">
                                                        <User className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[11px] font-semibold text-muted-foreground/70 block">Administrator ID</span>
                                                        <span className="font-mono text-lg font-semibold text-foreground">{user.display_id}</span>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-pill bg-primary pulse-dot" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* What's Next */}
                            <div className="bg-muted/50 rounded-inner p-6 mb-8 text-left space-y-4">
                                <h2 className="font-semibold text-foreground">What happens next?</h2>

                                <div className="flex gap-3">
                                    <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">Review follows the admin queue</p>
                                        <p className="text-xs text-muted-foreground">
                                            We will use the submitted details for review.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">Console access depends on your account state</p>
                                        <p className="text-xs text-muted-foreground">
                                            If the console asks you to sign in or continue setup, follow that prompt.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button asChild className="w-full gap-2">
                                    <Link to="/">
                                        Open console
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full">
                                    <a href="mailto:support@ivisit.ng">
                                        Contact Support
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </>
    );
};

export default OnboardingSuccessPage;
