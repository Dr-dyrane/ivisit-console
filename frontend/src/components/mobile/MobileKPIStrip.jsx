import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileMotion } from './mobileMotion';
import { useScrollCooldown } from './useScrollCooldown';

/**
 * MobileKPIStrip
 * A sticky top bar for mobile that shows 3 essential KPIs
 * Canon #10: Dashboard = Control
 * Canon #29: Ruthless Hierarchy
 */
export const MobileKPIStrip = ({
    kpis,
    onKpiClick,
    activeKpi,
    animateOnMount = true,
    loading = false,
    loadingCount = 4
}) => {
    const reduceMotion = useReducedMotion();
    const { isScrolling, bind } = useScrollCooldown(180);
    const allKpis = kpis || [];
    const { triggerFromEvent } = useFeedback();
    const hasAllOption = allKpis.some((kpi) => kpi.id === 'all');

    const handleKpiClick = (event, kpi) => {
        const isReapply = activeKpi === kpi.id;
        const hasHandler = typeof onKpiClick === 'function';
        if (hasHandler) {
            if (isReapply && hasAllOption && kpi.id !== 'all') onKpiClick('all');
            else onKpiClick(kpi.id);
        }
        if (!hasHandler) return;
        triggerFromEvent(event, {
            variant: isReapply ? FEEDBACK_TYPES.INFO : FEEDBACK_TYPES.SUCCESS,
            color: kpi.color || 'hsl(var(--spark))',
            haptic: true,
            sound: true
        });
    };

    const mountMotion = !animateOnMount
        ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
        : reduceMotion
        ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
        : { initial: { opacity: 0.98, y: -4 }, animate: { opacity: 1, y: 0 }, transition: mobileMotion.reveal };

    if (loading) {
        return (
            <div className="sticky top-0 z-40 w-full px-2 py-3 shadow-none relative overflow-hidden">
                <div className="flex gap-2 overflow-hidden">
                    {Array.from({ length: Math.max(1, loadingCount) }).map((_, idx) => (
                        <div key={idx} className="h-9 w-24 rounded-pill bg-muted/20 shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={mountMotion.initial}
            animate={mountMotion.animate}
            transition={mountMotion.transition}
            className="sticky top-0 z-40 w-full px-2 py-3 shadow-none relative overflow-hidden"
        >
            {/* Rail: overflow-x, hidden scrollbars, same height */}
            <div
                className="flex gap-2 overflow-x-auto no-scrollbar"
                {...bind}
            >
                {allKpis.map((kpi, idx) => {
                    const isActive = activeKpi === kpi.id;
                    const hasCount = kpi.value !== undefined && kpi.value !== null && kpi.value !== '';
                    // Compact state CHIP (rounded-pill): dot + label + count; active = brand fill.
                    // Replaces the old stat-rectangle — Mobile DS "state filter = chip row".
                    return (
                        <motion.button
                            key={kpi.id || idx}
                            whileTap={{ scale: 0.96 }}
                            transition={mobileMotion.quick}
                            onClick={isScrolling ? undefined : (event) => handleKpiClick(event, kpi)}
                            aria-pressed={isActive}
                            data-state={isActive ? 'selected' : 'idle'}
                            className={`shrink-0 flex items-center gap-2 rounded-pill px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap transition-[background,transform,box-shadow] duration-200 ease-out ${isActive
                                ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.28)]'
                                : 'bg-background/60 text-muted-foreground backdrop-blur-sm shadow-sm active:bg-background/80'
                                }`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            {!isActive && (
                                <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-pill"
                                    style={{ backgroundColor: kpi.color || 'hsl(var(--primary))' }}
                                    aria-hidden="true"
                                />
                            )}
                            <span className="leading-none">{kpi.label}</span>
                            {hasCount && (
                                <span className={`leading-none tabular-nums font-dashboard-numbers ${isActive ? 'opacity-90' : 'text-foreground'}`}>
                                    {kpi.value}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
};
