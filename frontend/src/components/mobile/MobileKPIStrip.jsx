import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

/**
 * MobileKPIStrip
 * A sticky top bar for mobile that shows 3 essential KPIs
 * Canon #10: Dashboard = Control
 * Canon #29: Ruthless Hierarchy
 */
export const MobileKPIStrip = ({ kpis, onKpiClick, activeKpi }) => {
    const compactKpis = (kpis || []).slice(0, 4);
    const cols = Math.min(Math.max(compactKpis.length, 1), 4);
    const { triggerFromEvent } = useFeedback();

    const handleKpiClick = (event, kpi) => {
        const isReapply = activeKpi === kpi.id;
        const hasHandler = typeof onKpiClick === 'function';
        if (hasHandler) onKpiClick(kpi.id);
        if (!hasHandler) return;
        triggerFromEvent(event, {
            variant: isReapply ? FEEDBACK_TYPES.INFO : FEEDBACK_TYPES.SUCCESS,
            color: kpi.color || 'hsl(var(--spark))',
            haptic: true,
            sound: true
        });
    };

    return (
        <motion.div
            initial={{ y: -6, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="sticky top-0 z-40 w-full px-2 py-3 border-0 shadow-none grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
            {compactKpis.map((kpi, idx) => {
                const isActive = activeKpi === kpi.id;
                return (
                    <React.Fragment key={kpi.id || idx}>
                        <motion.button
                            whileTap={{ scale: 0.985 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(event) => handleKpiClick(event, kpi)}
                            aria-pressed={isActive}
                            className={`relative flex-1 flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-[14px] transition-[background,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden ${isActive
                                ? 'bg-muted/30'
                                : 'bg-muted/20'
                                }`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            {/* 1. Spotlight Effect (Canon #20) */}
                            {isActive && (
                                <motion.div
                                    layoutId="kpi-spotlight"
                                    className="absolute inset-0"
                                    style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--spark) / 0.12), transparent 72%)' }}
                                />
                            )}

                            {/* 2. Breathing Lens (Status Dot) */}
                            <div className="relative flex items-center justify-center">
                                <div
                                    className="w-1.5 h-1.5 rounded-full relative z-10 transition-transform duration-500"
                                    style={{
                                        backgroundColor: kpi.color || 'hsl(var(--primary))',
                                        boxShadow: isActive ? `0 0 10px ${kpi.color}` : `0 0 4px ${kpi.color}33`
                                    }}
                                />
                                {isActive && (
                                    <motion.div
                                        animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                        className="absolute w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: kpi.color }}
                                    />
                                )}
                            </div>

                            {/* 3. Micro-Typography (Canon #30) */}
                            <div className="flex flex-col min-w-0 text-left relative z-10">
                                <span className={`text-[12px] tracking-tight leading-none truncate transition-colors duration-300 font-dashboard-numbers ${isActive ? 'text-foreground font-semibold neon-accent-text' : 'text-foreground/75 font-medium'}`}>
                                    {kpi.value}
                                </span>
                                <span className={`text-[7px] uppercase tracking-[0.2em] leading-none truncate mt-1 transition-colors duration-300 ${isActive ? 'text-foreground/55 font-semibold' : 'text-muted-foreground/35 font-normal'}`}>
                                    {kpi.label}
                                </span>
                                {Boolean(kpi.delta) && (
                                    <span className={`mt-1 inline-flex items-center gap-1 w-fit text-[7px] leading-none px-1.5 py-0.5 rounded-full font-semibold tracking-[0.12em] ${kpi.direction === 'up' ? 'text-success bg-success/10' : kpi.direction === 'down' ? 'text-destructive bg-destructive/10' : 'text-[hsl(var(--spark)/0.92)] bg-[hsl(var(--spark)/0.08)]'}`}>
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
        </motion.div>
    );
};
