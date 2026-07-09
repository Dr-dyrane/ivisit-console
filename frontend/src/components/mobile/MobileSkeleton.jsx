import React from 'react';
import { motion } from 'framer-motion';

/**
 * Mobile Base Skeleton
 * Soft shimmer with controlled fade-in. No harsh pulse or jerk.
 * Canon #6: Calm feedback — progress, never panic
 * Canon #26: Time Is Designed — acknowledge instantly, refine progressively
 */
const SkeletonPulse = ({ className, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={`bg-muted/20 rounded-button relative overflow-hidden ${className}`}
    >
        {/* Shimmer sweep — reuses @keyframes shimmer + .shimmer from index.css */}
        <div className="absolute inset-0 shimmer opacity-40" />
    </motion.div>
);

/**
 * Mobile KPI Strip Skeleton
 */
export const MobileKPIStripSkeleton = () => (
    <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="sticky top-0 z-50 px-4 py-3 flex gap-2"
    >
        <SkeletonPulse className="flex-1 h-12" delay={0} />
        <SkeletonPulse className="flex-1 h-12" delay={0.05} />
        <SkeletonPulse className="flex-1 h-12" delay={0.1} />
    </motion.div>
);

/**
 * Mobile Featured Metric Skeleton
 */
export const MobileFeaturedMetricSkeleton = () => (
    <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        className="mx-2 mb-6"
    >
        <div className="bg-muted/40 rounded-card p-6 h-40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <SkeletonPulse className="h-3 w-20" delay={0.15} />
                    <SkeletonPulse className="h-8 w-32" delay={0.2} />
                </div>
                <SkeletonPulse className="w-12 h-12 rounded-pill" delay={0.25} />
            </div>
            <SkeletonPulse className="h-10 w-full rounded-inner" delay={0.3} />
        </div>
    </motion.div>
);

/**
 * Mobile Secondary Metric Skeleton
 */
export const MobileSecondaryMetricSkeleton = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="grid grid-cols-2 gap-3 mb-3"
    >
        <SkeletonPulse className="h-[72px]" delay={0.25} />
        <SkeletonPulse className="h-[72px]" delay={0.3} />
    </motion.div>
);

/**
 * Mobile Metric Row Skeleton
 */
export const MobileMetricRowSkeleton = ({ delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.25 + delay, ease: 'easeOut' }}
        className="mx-2 py-4 flex items-center justify-between"
    >
        <div className="flex items-center gap-4">
            <SkeletonPulse className="w-10 h-10 rounded-pill" delay={0.3 + delay} />
            <div className="space-y-1.5">
                <SkeletonPulse className="h-3 w-24" delay={0.35 + delay} />
                <SkeletonPulse className="h-2 w-32 opacity-50" delay={0.4 + delay} />
            </div>
        </div>
        <SkeletonPulse className="h-6 w-12 rounded-inner" delay={0.4 + delay} />
    </motion.div>
);

/**
 * Mobile Dashboard Skeleton
 * Assembles gracefully — KPI → Hero → Metrics → Nav in sequence
 */
export const MobileDashboardSkeleton = () => (
    <div className="flex flex-col min-h-screen no-scrollbar overflow-hidden">
        <MobileKPIStripSkeleton />
        <div className="px-2 pt-4 pb-4">
            <MobileFeaturedMetricSkeleton />
            <MobileSecondaryMetricSkeleton />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                className="px-2 mb-4"
            >
                <SkeletonPulse className="h-4 w-32 mb-4" delay={0.35} />
                {[0, 1, 2, 3].map(i => (
                    <MobileMetricRowSkeleton key={i} delay={i * 0.06} />
                ))}
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                className="px-2 mt-6"
            >
                <SkeletonPulse className="h-4 w-40 mb-4" delay={0.55} />
                <div className="grid grid-cols-2 gap-3 pb-20">
                    <SkeletonPulse className="h-24 rounded-card" delay={0.6} />
                    <SkeletonPulse className="h-24 rounded-card" delay={0.65} />
                </div>
            </motion.div>
        </div>
    </div>
);

/**
 * Mobile Analytics Skeleton
 */
export const MobileAnalyticsSkeleton = () => (
    <div className="flex flex-col min-h-screen no-scrollbar overflow-hidden">
        <MobileKPIStripSkeleton />
        <div className="px-2 pt-4 pb-4">
            <MobileFeaturedMetricSkeleton />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
                className="px-2 mb-6"
            >
                <SkeletonPulse className="h-4 w-32 mb-4" delay={0.3} />
                {[0, 1].map(i => (
                    <MobileMetricRowSkeleton key={i} delay={i * 0.06} />
                ))}
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
                className="mx-2 mb-8 bg-muted/40 rounded-card p-6 h-64 overflow-hidden"
            >
                <div className="flex justify-between items-center mb-6">
                    <SkeletonPulse className="h-4 w-32" delay={0.45} />
                    <SkeletonPulse className="h-6 w-12 rounded-pill" delay={0.5} />
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <SkeletonPulse key={i} className="aspect-square rounded-inner" delay={0.5 + i * 0.01} />
                    ))}
                </div>
            </motion.div>
        </div>
    </div>
);
