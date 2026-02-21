import React from 'react';
import { motion } from 'framer-motion';

/**
 * MobileKPIStrip
 * A sticky top bar for mobile that shows 3 essential KPIs
 * Canon #10: Dashboard = Control
 * Canon #29: Ruthless Hierarchy
 */
export const MobileKPIStrip = ({ kpis, onKpiClick, activeKpi }) => {
    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-40 w-full px-2 py-3 border-0 shadow-none flex justify-between items-center gap-2"
        >
            {kpis.map((kpi, idx) => {
                const isActive = activeKpi === kpi.id;
                return (
                    <React.Fragment key={kpi.id || idx}>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onKpiClick?.(kpi.id)}
                            className={`relative flex-1 flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-[14px] transition-all duration-500 overflow-hidden ${isActive
                                ? 'bg-muted/30'
                                : 'bg-muted/20'
                                }`}
                        >
                            {/* 1. Spotlight Effect (Canon #20) */}
                            {isActive && (
                                <motion.div
                                    layoutId="kpi-spotlight"
                                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.08),transparent_70%)]"
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
                                <span className={`text-[12px] tracking-tight leading-none truncate transition-colors duration-500 ${isActive ? 'text-primary font-semibold' : 'text-foreground/70 font-medium'}`}>
                                    {kpi.value}
                                </span>
                                <span className={`text-[7px] uppercase tracking-[0.2em] leading-none truncate mt-1 transition-colors duration-500 ${isActive ? 'text-primary/60 font-bold' : 'text-muted-foreground/30 font-normal'}`}>
                                    {kpi.label}
                                </span>
                            </div>
                        </motion.button>
                    </React.Fragment>
                );
            })}
        </motion.div>
    );
};
