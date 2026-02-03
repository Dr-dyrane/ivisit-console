'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Mail, Clock, Shield } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * OnboardingSuccessPage - Registration confirmation
 * Shows after successful registration submission
 */
export const OnboardingSuccessPage = () => {
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
                    <p className="text-muted-foreground mb-8">
                        Your organization registration is being reviewed.
                    </p>

                    {/* What's Next */}
                    <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left space-y-4">
                        <h2 className="font-semibold text-foreground">What happens next?</h2>

                        <div className="flex gap-3">
                            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Check your email</p>
                                <p className="text-xs text-muted-foreground">
                                    We've sent a confirmation email with next steps
                                </p>
                            </div>
                        </div>

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
                            <Link to="/login">
                                Go to Login
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
