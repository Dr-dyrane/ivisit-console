import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
    loadingCount = 4,
    labelTone = 'caps'
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
                        <div
                            key={idx}
                            className="h-12 flex-1 rounded-icon bg-muted/20 shrink-0"
                            style={{
                                minWidth: loadingCount <= 4 ? `calc((100% - ${(loadingCount - 1) * 8}px) / ${loadingCount})` : 'auto'
                            }}
                        />
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
                    const labelClassName = labelTone === 'plain'
                        ? 'text-[8px] normal-case tracking-tight'
                        : 'text-[7px] uppercase tracking-[0.2em]';
                    return (
                        <React.Fragment key={kpi.id || idx}>
                            <motion.button
                                whileTap={{ scale: 0.985 }}
                                transition={mobileMotion.quick}
                                onClick={isScrolling ? undefined : (event) => handleKpiClick(event, kpi)}
                                aria-pressed={isActive}
                                data-state={isActive ? 'selected' : 'idle'}
                                className={`relative shrink-0 flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-icon transition-[background,transform,box-shadow] duration-200 ease-out overflow-hidden kpi-rail ${isActive
                                    ? 'bg-background/80 dark:bg-muted/40'
                                    : 'bg-muted/20'
                                    }`}
                                style={{
                                    minWidth: allKpis.length <= 4 ? `calc((100% - ${(allKpis.length - 1) * 8}px) / ${allKpis.length})` : 'auto',
                                    WebkitTapHighlightColor: 'transparent',
                                    ...(isActive ? {
                                        boxShadow: `0 8px 18px -12px ${(kpi.color || 'hsl(var(--primary))').replace(')', ' / 0.28)')}`
                                    } : null)
                                }}
                            >
                                {/* 1. Spotlight Effect (Canon #20) */}
                                {isActive && (
                                    <motion.div
                                        layoutId="kpi-spotlight"
                                        className="absolute inset-0"
                                        style={{ background: 'linear-gradient(180deg, hsl(var(--spark) / 0.08) 0%, transparent 60%)' }}
                                    />
                                )}

                                {/* 2. Breathing Lens (Status Dot) */}
                                <div className="relative flex items-center justify-center">
                                    <div
                                        className="w-1.5 h-1.5 rounded-pill relative z-10 transition-transform duration-500"
                                        style={{
                                            backgroundColor: kpi.color || 'hsl(var(--primary))',
                                            boxShadow: isActive ? `0 0 10px ${kpi.color}` : `0 0 4px ${kpi.color}33`
                                        }}
                                    />
                                    {isActive && !reduceMotion && (
                                        <motion.div
                                            animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                            className="absolute w-1.5 h-1.5 rounded-pill"
                                            style={{ backgroundColor: kpi.color }}
                                        />
                                    )}
                                </div>

                                {/* 3. Micro-Typography (Canon #30) */}
                                <div className="flex flex-col min-w-0 text-left relative z-10">
                                    <span className={`text-[12px] tracking-tight leading-none truncate transition-colors duration-300 font-dashboard-numbers ${isActive ? 'text-foreground font-semibold neon-accent-text' : 'text-foreground/75 font-medium'}`}>
                                        {kpi.value}
                                    </span>
                                    <span className={`${labelClassName} leading-none truncate mt-1 transition-colors duration-300 ${isActive ? 'text-foreground/55 font-semibold' : 'text-muted-foreground/35 font-normal'}`}>
                                        {kpi.label}
                                    </span>
                                    {Boolean(kpi.delta) && (
                                        <span className={`mt-1 inline-flex items-center gap-1 w-fit text-[7px] leading-none px-1.5 py-0.5 rounded-pill font-semibold tracking-[0.12em] ${kpi.direction === 'up' ? 'text-emerald-500 bg-emerald-500/10' : kpi.direction === 'down' ? 'text-destructive bg-destructive/10' : 'text-[hsl(var(--spark)/0.92)] bg-[hsl(var(--spark)/0.08)]'}`}>
                                            {kpi.direction === 'up' && <TrendingUp size={8} />}
                                            {kpi.direction === 'down' && <TrendingDown size={8} />}
                                            {kpi.delta}
                                        </span>
                                    )}
                                </div>
                            </motion.button>
                        </React.Fragment>
                    );
                })}
            </div>
        </motion.div>
    );
};
