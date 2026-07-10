import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { useScrollCooldown } from './useScrollCooldown';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

/**
 * MobileFeaturedMetric
 * High-impact hero metric for mobile dashboards (Success Rate, Active Requests)
 */
export const MobileFeaturedMetric = ({
    items,
    loading = false,
    // Legacy single-item props (preserved for backward compatibility)
    label,
    value,
    trend,
    chartData,
    icon: Icon,
    color = 'hsl(var(--primary))',
    onClick
}) => {
    const reduceMotion = useReducedMotion();
    const { isScrolling, bind } = useScrollCooldown(180);
    const { triggerFromEvent } = useFeedback();
    // Adapter: if items array provided, use it. Otherwise wrap legacy props into array.
    const data = items && items.length > 0
        ? items
        : (label ? [{ label, value, trend, chartData, icon: Icon, color, onClick }] : []);

    if (loading) {
        return (
            <div className="mb-4 px-1">
                <div className="rounded-card surface-card p-4 sm:p-5 space-y-4 min-h-[160px]">
                    <div className="flex justify-between items-start gap-3">
                        <div className="space-y-2 min-w-0 flex-1">
                            <div className="h-3 w-24 rounded-inner bg-muted/20" />
                            <div className="h-9 w-32 rounded-inner bg-muted/20" />
                        </div>
                        <div className="w-10 h-10 rounded-button bg-muted/20 shrink-0" />
                    </div>
                    <div className="h-14 rounded-inner bg-muted/20" />
                </div>
            </div>
        );
    }

    if (data.length === 0) return null;

    // Render a single billboard card (identical to original)
    const renderCard = (item, idx) => {
        const ItemIcon = item.icon;
        const c = item.color || 'hsl(var(--primary))';
        const series = Array.isArray(item.chartData) ? item.chartData : [];
        const shouldAnimate = false;
        const handleClick = (event) => {
            if (isScrolling) return;
            item.onClick?.(event);
            triggerFromEvent(event, {
                variant: FEEDBACK_TYPES.CLICK,
                color: item.color || 'hsl(var(--primary))',
                haptic: true,
                sound: true
            });
        };
        const Comp = item.onClick ? 'button' : 'div';

        return (
            <Comp
                key={idx}
                type={item.onClick ? 'button' : undefined}
                onClick={item.onClick ? handleClick : undefined}
                className={`p-6 surface-card flex flex-col justify-between relative overflow-hidden group min-h-[160px] rounded-card ${item.onClick ? 'text-left active:scale-[0.988] transition-transform duration-150 transform-gpu' : ''}`}
                style={data.length > 1 ? { minWidth: '92%', flexShrink: 0 } : undefined}
            >
                {/* Optional background image layer */}
                {item.image && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            fetchpriority="low"
                            className="w-full h-full object-cover opacity-20 grayscale-[0.6]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
                    </div>
                )}

                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                        <p className="eyebrow opacity-70">
                            {item.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-semibold tracking-tighter text-foreground/95 font-dashboard-numbers">
                                {item.value}
                            </h2>
                            {item.trend && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-pill ${String(item.trend).includes('+') ? 'text-emerald-500 bg-emerald-500/10' : String(item.trend).includes('-') ? 'text-destructive bg-destructive/10' : 'text-[hsl(var(--spark)/0.92)] bg-[hsl(var(--spark)/0.08)]'
                                    }`}>
                                    {item.trend}
                                </span>
                            )}
                        </div>
                    </div>

                    <div
                        className="w-10 h-10 rounded-button flex items-center justify-center shrink-0 relative z-10"
                        style={{ background: `radial-gradient(circle at 30% 30%, ${c.replace(/\)$/, ' / 0.2)')}, ${c.replace(/\)$/, ' / 0.1)')})` }}
                    >
                        {ItemIcon && <ItemIcon size={20} className="opacity-70" style={{ color: c }} />}
                    </div>
                </div>

                {/* Sparkline */}
                {series.length > 1 && (
                    <div className="h-14 w-full -mx-4 mt-4 relative z-10 opacity-30">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={series}>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={c}
                                    strokeWidth={2}
                                    fill="transparent"
                                    isAnimationActive={shouldAnimate}
                                    animationDuration={shouldAnimate ? 1200 : 0}
                                    animationEasing="ease-out"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {item.onClick && (
                    <div className="absolute bottom-6 right-6 w-8 h-8 rounded-pill bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-all duration-300">
                        <ChevronRight size={16} className="text-foreground" />
                    </div>
                )}
            </Comp>
        );
    };

    // Single item: render exactly as before, no rail wrapper
    if (data.length === 1) {
        return <div className="mb-4">{renderCard(data[0], 0)}</div>;
    }

    // Multiple items: one card per screen, scroll naturally to next
    // -m-2 p-2: breathing room so overflow-x doesn't clip the card edge
    return (
        <div
            className="relative -m-2 p-2 overflow-x-auto overflow-y-visible no-scrollbar"
            {...bind}
        >
            <div className="flex gap-3">
                {data.map((item, idx) => renderCard(item, idx))}
                <div className="shrink-0 w-3" />
            </div>
            {/* Subtle framing: soft top/bottom fade only (no decorative inner shadow) */}
            <div className="pointer-events-none absolute left-2 right-2 top-1 h-4 bg-gradient-to-b from-background/50 to-transparent" />
            <div className="pointer-events-none absolute left-2 right-2 bottom-1 h-4 bg-gradient-to-t from-background/50 to-transparent" />
            {/* Edge masks to hint overflow */}
            <div className="pointer-events-none absolute left-2 top-2 bottom-2 w-6 bg-gradient-to-r from-background/70 to-transparent" />
            <div className="pointer-events-none absolute right-2 top-2 bottom-2 w-6 bg-gradient-to-l from-background/70 to-transparent" />
        </div>
    );
};
