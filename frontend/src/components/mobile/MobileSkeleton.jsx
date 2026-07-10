import React from 'react';

/**
 * Mobile Base Skeleton
 * Skeleton is simply present (MOTION canon: no entrance reveal, no stagger).
 * The shimmer sweep is the only motion — ongoing progress, not an entrance.
 * Canon #6: Calm feedback — progress, never panic
 * Canon #26: Time Is Designed — acknowledge instantly, refine progressively
 */
const SkeletonPulse = ({ className }) => (
    <div className={`bg-muted/20 rounded-button relative overflow-hidden ${className}`}>
        {/* Shimmer sweep — reuses @keyframes shimmer + .shimmer from index.css */}
        <div className="absolute inset-0 shimmer opacity-40" />
    </div>
);

/**
 * Mobile KPI Strip Skeleton
 */
export const MobileKPIStripSkeleton = () => (
    <div className="sticky top-0 z-50 px-4 py-3 flex gap-2">
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
        <div className="surface-card rounded-card p-6 h-40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <SkeletonPulse className="h-3 w-20" />
                    <SkeletonPulse className="h-8 w-32" />
                </div>
                <SkeletonPulse className="w-12 h-12 rounded-pill" />
            </div>
            <SkeletonPulse className="h-10 w-full rounded-inner" />
        </div>
    </div>
);

/**
 * Mobile Secondary Metric Skeleton
 */
export const MobileSecondaryMetricSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 mb-3">
        <SkeletonPulse className="h-[72px]" />
        <SkeletonPulse className="h-[72px]" />
    </div>
);

/**
 * Mobile Metric Row Skeleton
 * `delay` is accepted for backward compatibility but ignored — skeletons
 * render at once instead of staggering in.
 */
export const MobileMetricRowSkeleton = ({ delay = 0 }) => (
    <div className="mx-2 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <SkeletonPulse className="w-10 h-10 rounded-pill" />
            <div className="space-y-1.5">
                <SkeletonPulse className="h-3 w-24" />
                <SkeletonPulse className="h-2 w-32 opacity-50" />
            </div>
        </div>
        <SkeletonPulse className="h-6 w-12 rounded-inner" />
    </div>
);

/**
 * Mobile Dashboard Skeleton
 * The whole placeholder frame is present at once — no sequenced assembly.
 */
export const MobileDashboardSkeleton = () => (
    <div className="flex flex-col min-h-screen no-scrollbar overflow-hidden">
        <MobileKPIStripSkeleton />
        <div className="px-2 pt-4 pb-4">
            <MobileFeaturedMetricSkeleton />
            <MobileSecondaryMetricSkeleton />
            <div className="px-2 mb-4">
                <SkeletonPulse className="h-4 w-32 mb-4" />
                {[0, 1, 2, 3].map(i => (
                    <MobileMetricRowSkeleton key={i} />
                ))}
            </div>
            <div className="px-2 mt-6">
                <SkeletonPulse className="h-4 w-40 mb-4" />
                <div className="grid grid-cols-2 gap-3 pb-20">
                    <SkeletonPulse className="h-24 rounded-card" />
                    <SkeletonPulse className="h-24 rounded-card" />
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
        <div className="px-2 pt-4 pb-4">
            <MobileFeaturedMetricSkeleton />
            <div className="px-2 mb-6">
                <SkeletonPulse className="h-4 w-32 mb-4" />
                {[0, 1].map(i => (
                    <MobileMetricRowSkeleton key={i} />
                ))}
            </div>
            <div className="mx-2 mb-8 surface-card rounded-card p-6 h-64 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <SkeletonPulse className="h-4 w-32" />
                    <SkeletonPulse className="h-6 w-12 rounded-pill" />
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <SkeletonPulse key={i} className="aspect-square rounded-inner" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
