import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

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
    const Comp = isInteractive ? motion.button : 'div';

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
                {...(isInteractive ? { whileTap: { scale: 0.985 } } : {})}
                onClick={handleClick}
                className={`p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 text-left ${isInteractive ? 'transition-[transform,background-color,box-shadow] duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] cursor-pointer' : ''}`}
            >
                <div className="flex items-center gap-3">
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
                    <div className="flex flex-col">
                        <span className="text-[11px] font-medium tracking-tight">{title}</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">{subtitle}</span>
                    </div>
                </div>
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">{value}</span>
            </Comp>
        );
    }

    // ── Compact variant (icon top-right, text left, value+trend right) ──
    return (
        <Comp
            {...(isInteractive ? { whileTap: { scale: 0.985 } } : {})}
            onClick={handleClick}
            className={`relative w-full p-4 apple-glass-heavy rounded-2xl border-0 overflow-hidden text-left flex items-center justify-between ${isInteractive ? 'transition-[transform,background-color,box-shadow] duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] cursor-pointer' : ''}`}
        >
            {Icon && <Icon className="absolute top-3 right-3 h-4 w-4 text-primary/30" />}
            <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">{title}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">{subtitle}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">{value}</span>
                {trendText ? (
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
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
 * ≤2 items: standard 2-col grid (backward compatible).
 * >2 items: horizontal rail with hidden scrollbars + edge masks.
 *
 * Canon #3  – Reveal Gradually (swipe for more)
 * Canon #24 – White Space Is Luxury (horizontal depth, not vertical noise)
 */
export const MobileSecondaryMetricRail = ({
    items = [],
    variant = 'compact',
    className = ''
}) => {
    if (items.length === 0) return null;

    // Standard 2-col grid for ≤2 items (existing behavior)
    if (items.length <= 2) {
        return (
            <div className={`grid grid-cols-2 gap-3 ${className}`}>
                {items.map((item, idx) => (
                    <MobileSecondaryMetricCard key={idx} variant={variant} {...item} />
                ))}
            </div>
        );
    }

    // Horizontal snap-scroll rail for >2 items
    return (
        <div className={`relative ${className}`}>
            <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 no-scrollbar"
            >
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        className="snap-start shrink-0"
                        style={{ width: 'calc(50% - 6px)' }}
                    >
                        <MobileSecondaryMetricCard variant={variant} {...item} />
                    </div>
                ))}
                {/* End spacer */}
                <div className="shrink-0 w-3" />
            </div>
            {/* Edge masks */}
            <div className="absolute left-0 top-0 bottom-1 w-4 pointer-events-none bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-1 w-4 pointer-events-none bg-gradient-to-l from-background to-transparent z-10" />
        </div>
    );
};
