'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * UpdateNotification - App update prompt.
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
                    <div className="relative rounded-card bg-card/92 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-card/72">
                        {/* Close button */}
                        <button
                            onClick={onDismiss}
                            className="absolute right-2 top-2 rounded-button p-1 transition-colors hover:bg-foreground/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                            aria-label="Dismiss"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </button>

                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-icon bg-foreground/[0.055] text-foreground dark:bg-white/[0.07]">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                >
                                    <RefreshCw className="h-5 w-5" />
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
