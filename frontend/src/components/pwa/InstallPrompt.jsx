'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * InstallPrompt - Elegant PWA install banner
 * Apple-style glassmorphism with smooth animations
 */
export const InstallPrompt = ({ canInstall, onInstall, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

    // Show prompt after 30 seconds of use (not on first visit)
    useEffect(() => {
        if (!canInstall || hasBeenDismissed) return;

        // Check if user has visited before
        const hasVisited = localStorage.getItem('ivisit_console_visited');
        if (!hasVisited) {
            localStorage.setItem('ivisit_console_visited', 'true');
            return; // Don't show on first visit
        }

        // Check if dismissed recently (within 7 days)
        const dismissedAt = localStorage.getItem('ivisit_install_dismissed');
        if (dismissedAt) {
            const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss < 7) return;
        }

        // Show after 30 seconds
        const timer = setTimeout(() => setIsVisible(true), 30000);
        return () => clearTimeout(timer);
    }, [canInstall, hasBeenDismissed]);

    const handleInstall = async () => {
        const success = await onInstall();
        if (success) {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setHasBeenDismissed(true);
        localStorage.setItem('ivisit_install_dismissed', Date.now().toString());
        onDismiss?.();
    };

    // Detect device type for appropriate messaging
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
                >
                    <div className="glass-card border border-border/50 rounded-2xl p-4 shadow-2xl">
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>

                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground mb-1">
                                    Install iVisit
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    {isIOS
                                        ? 'Add to Home Screen for quick access and offline use.'
                                        : 'Install the app for faster access and push notifications.'}
                                </p>

                                <div className="flex gap-2">
                                    {isIOS ? (
                                        // iOS specific instructions
                                        <div className="text-xs text-muted-foreground">
                                            Tap <span className="inline-flex items-center"><svg className="w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg></span> then "Add to Home Screen"
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={handleInstall}
                                            className="gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Install
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleDismiss}
                                    >
                                        Not now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallPrompt;
