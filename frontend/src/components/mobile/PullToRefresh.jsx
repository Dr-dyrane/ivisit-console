import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh
 * A native-style pull-to-refresh container for mobile
 */
export const PullToRefresh = ({ onRefresh, children }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const y = useMotionValue(0);
    const pullThreshold = 80;

    // Transform y pull into rotation and opacity
    const rotate = useTransform(y, [0, pullThreshold], [0, 360]);
    const opacity = useTransform(y, [0, pullThreshold], [0, 1]);
    const scale = useTransform(y, [0, pullThreshold], [0.5, 1]);

    const handlePan = (event, info) => {
        if (isRefreshing) return;

        // Only allow pulling down if at top of page
        if (window.scrollY === 0 && info.offset.y > 0) {
            y.set(info.offset.y * 0.4); // Resistance factor
        }
    };

    const handlePanEnd = async (event, info) => {
        if (isRefreshing) return;

        if (y.get() >= pullThreshold) {
            setIsRefreshing(true);
            animate(y, pullThreshold, { type: 'spring', stiffness: 300, damping: 30 });

            if (onRefresh) await onRefresh();

            setTimeout(() => {
                setIsRefreshing(false);
                animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
            }, 800);
        } else {
            animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
        }
    };

    return (
        <div className="relative w-full overflow-hidden touch-pan-y">
            <motion.div
                style={{ height: y, opacity, scale }}
                className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden z-50 pointer-events-none"
            >
                <motion.div
                    style={{ rotate }}
                    className="flex h-10 w-10 items-center justify-center rounded-pill bg-card/90 shadow-[0_4px_12px_rgb(0_0_0/0.07)] backdrop-blur-xl dark:bg-card/75"
                >
                    <RefreshCw size={18} className={isRefreshing ? "animate-spin text-foreground" : "text-foreground"} />
                </motion.div>
            </motion.div>

            <motion.div
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                style={{ y }}
                className="relative z-10"
            >
                {children}
            </motion.div>
        </div>
    );
};
