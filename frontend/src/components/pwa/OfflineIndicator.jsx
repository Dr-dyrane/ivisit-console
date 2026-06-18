'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2 } from 'lucide-react';

/**
 * OfflineIndicator - Network status banner
 * Subtle top banner when offline, auto-dismisses when back online
 */
export const OfflineIndicator = ({ isOnline }) => {
    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 backdrop-blur-sm text-amber-950"
                >
                    <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <WifiOff className="w-4 h-4" />
                        </motion.div>
                        <span>You're offline</span>
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="flex items-center gap-1 text-amber-800"
                        >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-xs">Reconnecting...</span>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineIndicator;
