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
export const MobileMetricRowSkeleton = ({ delay: _delay = 0 }) => (
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
 * Mirrors the loaded Summary anatomy so the hero, range control, Today-height
 * Pinned tiles, and evidence sections replace their placeholders in place.
 */
export const MobileAnalyticsSkeleton = () => (
    <div data-testid="mobile-analytics-skeleton" className="space-y-9 pb-8" aria-hidden="true">
        <div className="pt-3">
            {/* Summary hero: status, headline, scope/window, and segmented range. */}
            <div className="px-4">
                <SkeletonPulse className="h-7 w-24 rounded-pill" />
                <SkeletonPulse className="mt-4 h-7 w-2/3 rounded-pill" />
                <SkeletonPulse className="mt-2 h-4 w-40 rounded-pill opacity-70" />
                <div className="mt-4 grid w-full grid-cols-3 rounded-pill bg-foreground/[0.06] p-1 dark:bg-white/[0.07]">
                    {[0, 1, 2].map((item) => (
                        <SkeletonPulse key={item} className="h-9 rounded-pill" />
                    ))}
                </div>
            </div>

            {/* Pinned: the exact 2-up, 72px glance-tile footprint used after load. */}
            <div className="mt-6 px-4">
                <div className="mb-3 px-1">
                    <SkeletonPulse className="h-6 w-20 rounded-pill" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="surface-card flex min-h-[72px] items-start justify-between gap-2 rounded-inner px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <SkeletonPulse className="h-3 w-16 rounded-pill" />
                                <SkeletonPulse className="mt-2 h-4 w-3/5 rounded-pill" />
                            </div>
                            <SkeletonPulse className="h-7 w-7 shrink-0 rounded-pill" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="space-y-9 px-4">
            {/* Highlights: one measured-observation card, matching the loaded surface. */}
            <section>
                <div className="mb-3 px-1">
                    <SkeletonPulse className="h-6 w-24 rounded-pill" />
                </div>
                <div className="rounded-card bg-card/68 px-5 py-6 shadow-e2 backdrop-blur-xl dark:bg-white/[0.055]">
                    <div className="flex items-start justify-between gap-4">
                        <SkeletonPulse className="h-10 w-10 rounded-icon" />
                        <SkeletonPulse className="h-4 w-4 rounded-pill" />
                    </div>
                    <SkeletonPulse className="mt-5 h-3 w-28 rounded-pill" />
                    <SkeletonPulse className="mt-2 h-6 w-2/3 rounded-pill" />
                    <SkeletonPulse className="mt-3 h-3 w-4/5 rounded-pill opacity-70" />
                </div>
            </section>

            {/* Trends: heading, summary, trailing signal, then chart footprint. */}
            <section>
                <div className="mb-3 px-1">
                    <SkeletonPulse className="h-6 w-16 rounded-pill" />
                </div>
                <div className="rounded-card bg-card/68 p-5 shadow-e2 backdrop-blur-xl dark:bg-white/[0.05]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <SkeletonPulse className="h-3 w-28 rounded-pill" />
                            <SkeletonPulse className="mt-2 h-6 w-3/5 rounded-pill" />
                            <SkeletonPulse className="mt-3 h-3 w-4/5 rounded-pill opacity-70" />
                        </div>
                        <SkeletonPulse className="h-10 w-10 shrink-0 rounded-icon" />
                    </div>
                    <div className="mt-6 flex h-24 items-end gap-1">
                        {[38, 64, 48, 82, 58, 72, 44, 88, 62, 76].map((height, item) => (
                            <span key={item} className="shimmer min-w-1 flex-1 rounded-pill bg-muted/25" style={{ height: `${height}%` }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Breakdowns: two sibling cards, just like the loaded status/case pair. */}
            <section>
                <div className="mb-3 px-1">
                    <SkeletonPulse className="h-6 w-28 rounded-pill" />
                </div>
                <div className="space-y-3">
                    {[0, 1].map((item) => (
                        <div key={item} className="rounded-card bg-card/68 p-5 shadow-e2 backdrop-blur-xl dark:bg-white/[0.05]">
                            <div className="flex items-center justify-between gap-3">
                                <SkeletonPulse className="h-4 w-28 rounded-pill" />
                                <SkeletonPulse className="h-6 w-14 rounded-pill" />
                            </div>
                            <SkeletonPulse className="mt-5 h-3 w-3/4 rounded-pill opacity-70" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </div>
);
