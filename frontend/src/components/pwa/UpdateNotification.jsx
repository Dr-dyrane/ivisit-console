'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * UpdateNotification - App update prompt
 * Elegant toast for service worker updates
 */
export const UpdateNotification = ({ isVisible, onUpdate, onDismiss }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed top-20 right-4 z-[100] max-w-sm"
                >
                    <div className="glass-card border border-primary/30 rounded-xl p-4 shadow-2xl">
                        {/* Close button */}
                        <button
                            onClick={onDismiss}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </button>

                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                >
                                    <RefreshCw className="w-5 h-5 text-primary" />
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <h4 className="font-semibold text-foreground text-sm mb-1">
                                    Update Available
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    A new version of iVisit Console is ready.
                                </p>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={onUpdate}
                                        className="h-7 text-xs gap-1.5"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Update Now
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={onDismiss}
                                        className="h-7 text-xs"
                                    >
                                        Later
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

export default UpdateNotification;
