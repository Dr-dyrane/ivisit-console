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
    const hasSubmissionResult = Boolean(result?.success && result?.provisioningVerified === true);

    return (
        <>
            <Helmet>
                <title>Registration Submitted | iVisit Console</title>
            </Helmet>

            <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md text-center"
                >
                    {!hasSubmissionResult ? (
                        <>
                            <div className="w-16 h-16 rounded-icon bg-muted flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                            </div>

                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                Registration status unavailable
                            </h1>
                            <p className="text-sm text-muted-foreground mb-8">
                                We could not verify a completed organization setup. Return to registration or contact support.
                            </p>

                            <div className="space-y-3">
                                <Button asChild variant="ghost" className="w-full gap-2 h-12 rounded-button bg-foreground text-background hover:bg-foreground/90 hover:text-background">
                                    <Link to="/onboarding">
                                        Continue registration
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full h-12 rounded-button text-muted-foreground">
                                    <a href="mailto:support@ivisit.ng">
                                        Contact Support
                                    </a>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success Icon */}
                            <div className="w-16 h-16 rounded-icon bg-muted flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-foreground" />
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                Registration submitted
                            </h1>
                            <p className="text-sm text-muted-foreground mb-6">
                                We received your registration details.
                            </p>

                            {/* Display IDs - Proof of Registration */}
                            {(organization?.display_id || user?.display_id) && (
                                <div className="grid grid-cols-1 gap-3 mb-8">
                                    {organization?.display_id && (
                                        <div className="p-4 rounded-inner bg-muted/40">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-muted rounded-icon">
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[11px] font-semibold text-muted-foreground block">Organization ID</span>
                                                        <span className="font-mono text-lg font-semibold text-foreground">{organization.display_id}</span>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-pill bg-muted-foreground/30" />
                                            </div>
                                        </div>
                                    )}
                                    {user?.display_id && (
                                        <div className="p-4 rounded-inner bg-muted/40">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-muted rounded-icon">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[11px] font-semibold text-muted-foreground block">Administrator ID</span>
                                                        <span className="font-mono text-lg font-semibold text-foreground">{user.display_id}</span>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-pill bg-muted-foreground/30" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* What's Next */}
                            <div className="bg-muted/50 rounded-inner p-6 mb-8 text-left space-y-4">
                                <h2 className="font-semibold text-foreground">What happens next?</h2>

                                <div className="flex gap-3">
                                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">Review follows the admin queue</p>
                                        <p className="text-xs text-muted-foreground">
                                            We will use the submitted details for review.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
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
                                <Button asChild variant="ghost" className="w-full gap-2 h-12 rounded-button bg-foreground text-background hover:bg-foreground/90 hover:text-background">
                                    <Link to="/">
                                        Open console
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="w-full h-12 rounded-button text-muted-foreground">
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
