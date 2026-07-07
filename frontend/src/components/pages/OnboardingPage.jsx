/**
 * @fileoverview OnboardingPage - Provider/Organization registration page
 * 
 * @description
 * Standalone page for new organization registration.
 * - Redirects authenticated users to dashboard
 * - Wraps wizard in OnboardingProvider
 * - Full-screen layout without main app shell
 * 
 * @access
 * - Unauthenticated users: Full access
 * - Authenticated users: Redirected to "/" 
 * 
 * @rollback
 * To revert: git checkout HEAD~1 -- src/components/pages/OnboardingPage.jsx
 * 
 * @author iVisit Console Team
 * @version 2.0.0
 * @since 2026-02-02
 */

'use client';

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { OnboardingWizard } from '../onboarding';
import ThemeToggle from '../ui/theme-toggle';

/**
 * OnboardingPage - Main registration page component
 * 
 * @component
 * @returns {JSX.Element} The onboarding page
 */
export const OnboardingPage = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, isOnboarding, isSkippedOnboarding } = useAuth();

    // ========================================================================
    // AUTH GUARD: Only redirect users who have COMPLETED onboarding
    // If user is mid-onboarding (onboarding_status = 'pending'), let them stay
    // ========================================================================
    useEffect(() => {
        // Only redirect users who have COMPLETED onboarding
        // If status is 'pending' or 'skipped', they are allowed to be here
        if (!authLoading && user && !isOnboarding() && !isSkippedOnboarding()) {
            navigate('/', { replace: true });
        }
    }, [authLoading, user, isOnboarding, isSkippedOnboarding, navigate]);

    // Show nothing while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Redirect will happen for authenticated users who completed onboarding
    if (user && !isOnboarding() && !isSkippedOnboarding()) {
        return null;
    }

    return (
        <>
            <Helmet>
                <title>Register Your Organization | iVisit Console</title>
                <meta name="description" content="Register your hospital, clinic, or ambulance service on iVisit" />
            </Helmet>

            <div className="min-h-screen bg-background">
                {/* ============================================================
                    HEADER - Fixed navigation bar (matches SmartHeader)
                    ============================================================ */}
                <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center bg-background shadow-sm">
                    <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
                        {/* Back Link */}
                        <Link
                            to="/login"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Back to Login</span>
                        </Link>

                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="iVisit" className="h-8" />
                            <span className="font-bold text-lg hidden sm:inline">iVisit</span>
                        </div>

                        {/* Theme Toggle - xs size for compact mobile header */}
                        <ThemeToggle size="xs" />
                    </div>
                </header>

                {/* ============================================================
                    MAIN CONTENT
                    ============================================================ */}
                <main className="pt-20 pb-8 px-4">
                    <div className="max-w-7xl mx-auto">
                        {/* Title Section */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                                Join iVisit
                            </h1>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Tell us about your healthcare organization so we can set up the review.
                            </p>
                        </div>

                        {/* Wizard with Context Provider */}
                        <OnboardingProvider>
                            <OnboardingWizard />
                        </OnboardingProvider>
                    </div>
                </main>

                {/* ============================================================
                    FOOTER
                    ============================================================ */}
                <footer className="fixed bottom-0 left-0 right-0 py-3 text-center text-xs text-muted-foreground/50 bg-background">
                    <p>&copy; {new Date().getFullYear()} iVisit. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
};

export default OnboardingPage;
