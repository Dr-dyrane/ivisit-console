import React from 'react';
import { motion } from 'framer-motion';

/**
 * Mobile Base Skeleton
 * Provides the pulse animation for all mobile loaders
 */
const SkeletonPulse = ({ className }) => (
    <div className={`bg-muted/30 animate-pulse rounded-2xl ${className}`} />
);

/**
 * Mobile KPI Strip Skeleton
 */
export const MobileKPIStripSkeleton = () => (
    <div className="sticky top-0 z-50 apple-glass-heavy px-4 py-3 flex gap-2">
        <SkeletonPulse className="flex-1 h-12" />
        <SkeletonPulse className="flex-1 h-12" />
        <SkeletonPulse className="flex-1 h-12" />
    </div>
);

/**
 * Mobile Featured Metric Skeleton
 */
export const MobileFeaturedMetricSkeleton = () => (
    <div className="mx-2 mb-6">
        <div className="apple-glass-heavy rounded-3xl p-6 h-40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <SkeletonPulse className="h-3 w-20" />
                    <SkeletonPulse className="h-8 w-32" />
                </div>
                <SkeletonPulse className="w-12 h-12 rounded-full" />
            </div>
            <SkeletonPulse className="h-10 w-full rounded-xl" />
        </div>
    </div>
);

/**
 * Mobile Metric Row Skeleton
 */
export const MobileMetricRowSkeleton = () => (
    <div className="mx-2 py-4 flex items-center justify-between border-b border-white/[0.02]">
        <div className="flex items-center gap-4">
            <SkeletonPulse className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
                <SkeletonPulse className="h-3 w-24" />
                <SkeletonPulse className="h-2 w-32 opacity-50" />
            </div>
        </div>
        <SkeletonPulse className="h-6 w-12 rounded-lg" />
    </div>
);

/**
 * Mobile Dashboard Skeleton
 */
export const MobileDashboardSkeleton = () => (
    <div className="flex flex-col min-h-screen no-scrollbar overflow-hidden">
        <MobileKPIStripSkeleton />
        <div className="px-2 pt-6">
            <MobileFeaturedMetricSkeleton />
            <div className="px-2 mb-4">
                <SkeletonPulse className="h-4 w-32 mb-4" />
                {[1, 2, 3, 4].map(i => (
                    <MobileMetricRowSkeleton key={i} />
                ))}
            </div>
            <div className="px-2 mt-6">
                <SkeletonPulse className="h-4 w-40 mb-4" />
                <div className="grid grid-cols-2 gap-3 pb-20">
                    <SkeletonPulse className="h-24 rounded-3xl" />
                    <SkeletonPulse className="h-24 rounded-3xl" />
                </div>
            </div>
        </div>
    </div>
);

/**
 * Mobile Analytics Skeleton
 */
export const MobileAnalyticsSkeleton = () => (
    <div className="flex flex-col min-h-screen no-scrollbar overflow-hidden">
        <MobileKPIStripSkeleton />
        <div className="px-2 pt-6">
            <MobileFeaturedMetricSkeleton />
            <div className="px-2 mb-6">
                <SkeletonPulse className="h-4 w-32 mb-4" />
                {[1, 2].map(i => (
                    <MobileMetricRowSkeleton key={i} />
                ))}
            </div>
            <div className="mx-2 mb-8 apple-glass-heavy rounded-3xl p-6 h-64 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <SkeletonPulse className="h-4 w-32" />
                    <SkeletonPulse className="h-6 w-12 rounded-full" />
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <SkeletonPulse key={i} className="aspect-square rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
