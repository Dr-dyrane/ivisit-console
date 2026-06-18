import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useScrollCooldown } from './useScrollCooldown';

/**
 * MobileSecondaryMetricCard
 * Unified secondary KPI card with integrated feedback + optional analytics drill-in.
 *
 * Canon #4  – One screen, one action
 * Canon #6  – Calm feedback
 * Canon #22 – Touch feels equal
 * Canon #28 – Feels touchable
 *
 * Two layout variants controlled via `variant` prop:
 *  - "icon"    → Large icon circle on the left, label + subtitle stacked, value right (matches Users / Hospitals / Doctors pattern)
 *  - "compact" → Small icon top-right, label + subtitle left column, value + trend right column (default, matches Verification / Pricing / Orgs pattern)
 */
export const MobileSecondaryMetricCard = ({
    icon: Icon,
    title,
    subtitle,
    value,
    color = 'hsl(var(--primary))',
    trendDirection,
    trendText,
    trendUpClass = 'text-success',
    trendDownClass = 'text-destructive',
    trendFlatClass = 'text-muted-foreground/60',
    variant = 'compact',
    iconColorClass,
    iconBgClass,
    onClick
}) => {
    const { triggerFromEvent } = useFeedback();
    const isInteractive = typeof onClick === 'function';
    const Comp = isInteractive ? 'button' : 'div';

    const handleClick = (event) => {
        if (!isInteractive) return;
        onClick();
        triggerFromEvent(event, {
            variant: FEEDBACK_TYPES.INFO,
            color,
            haptic: true,
            sound: true
        });
    };

    // ── Icon variant (icon-circle + text + value) ──────────────────
    if (variant === 'icon') {
        return (
            <Comp
                type={isInteractive ? 'button' : undefined}
                onClick={handleClick}
                className={`w-full min-w-0 p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 text-left ${isInteractive ? 'transition-[transform,background-color,box-shadow] duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] active:scale-[0.985] cursor-pointer transform-gpu' : ''}`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {Icon && (
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass || ''}`}
                            style={!iconBgClass ? { backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` } : undefined}
                        >
                            <Icon
                                className={`w-5 h-5 opacity-70 ${iconColorClass || ''}`}
                                style={!iconColorClass ? { color } : undefined}
                            />
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-medium tracking-tight truncate">{title}</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50 truncate">{subtitle}</span>
                    </div>
                </div>
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers shrink-0 pl-2">{value}</span>
            </Comp>
        );
    }

    // ── Compact variant (icon top-right, text left, value+trend right) ──
    return (
        <Comp
            type={isInteractive ? 'button' : undefined}
            onClick={handleClick}
            className={`relative w-full min-w-0 p-4 apple-glass-heavy rounded-2xl border-0 overflow-hidden text-left flex items-center justify-between ${isInteractive ? 'transition-[transform,background-color,box-shadow] duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] active:scale-[0.985] cursor-pointer transform-gpu' : ''}`}
        >
            {Icon && <Icon className="absolute top-3 right-3 h-4 w-4 text-primary/30" />}
            <div className="flex flex-col pr-6 min-w-0 flex-1">
                <span className="text-[11px] font-medium tracking-tight truncate">{title}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50 truncate">{subtitle}</span>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers whitespace-nowrap">{value}</span>
                {trendText ? (
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70 whitespace-nowrap">
                        {trendDirection === 'up' && <ArrowUpRight className={`h-3 w-3 ${trendUpClass}`} />}
                        {trendDirection === 'down' && <ArrowDownRight className={`h-3 w-3 ${trendDownClass}`} />}
                        {(!trendDirection || trendDirection === 'flat') && <Minus className={`h-3 w-3 ${trendFlatClass}`} />}
                        {trendText}
                    </span>
                ) : null}
            </div>
        </Comp>
    );
};

export default MobileSecondaryMetricCard;

/**
 * MobileSecondaryMetricRail
 * Horizontal snap-scroll rail for secondary metric cards.
 * ≥2 items: horizontal rail with hidden scrollbars + edge masks.
 *
 * Canon #3  – Reveal Gradually (swipe for more)
 * Canon #24 – White Space Is Luxury (horizontal depth, not vertical noise)
 */
export const MobileSecondaryMetricRail = ({
    items = [],
    variant = 'compact',
    className = '',
    loading = false,
    loadingCount = 2
}) => {
    const { isScrolling, bind } = useScrollCooldown(180);

    if (loading) {
        const skeletonItems = Array.from({ length: Math.max(1, loadingCount) });
        return (
            <div className={`relative ${className}`}>
                <div className="flex gap-2 overflow-hidden px-0.5">
                    {skeletonItems.map((_, idx) => (
                        <div
                            key={idx}
                            className="shrink-0"
                            style={{ flex: '0 0 calc((100% - 8px) / 2)', maxWidth: 'calc((100% - 8px) / 2)' }}
                        >
                            <div className="h-[88px] rounded-2xl bg-muted/20" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;
    const gapPx = 8; // gap-2

    const getCardBasis = () => {
        // Single item remains full-width.
        if (items.length === 1) {
            return '100%';
        }

        // Two-up rail (KPI-like simplicity): always fit two cards per viewport,
        // while still allowing horizontal scroll for 3+ items.
        return `calc((100% - ${gapPx}px) / 2)`;
    };

    const cardBasis = getCardBasis();

    // Single item: render full-width card
    if (items.length === 1) {
        return (
            <div className={className}>
                <MobileSecondaryMetricCard variant={variant} {...items[0]} />
            </div>
        );
    }

    // Horizontal rail for 2+ items
    return (
        <div className={`relative ${className}`}>
            <div
                className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-0.5"
                {...bind}
            >
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        className={`shrink-0 min-w-0 ${isScrolling ? 'pointer-events-none' : ''}`}
                        style={{
                            flex: `0 0 ${cardBasis}`,
                            maxWidth: cardBasis
                        }}
                    >
                        <MobileSecondaryMetricCard variant={variant} {...item} />
                    </div>
                ))}
            </div>
        </div>
    );
};
