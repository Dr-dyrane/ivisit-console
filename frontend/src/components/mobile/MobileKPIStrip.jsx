import React from 'react';
import { motion } from 'framer-motion';

/**
 * MobileKPIStrip
 * A sticky top bar for mobile that shows 3 essential KPIs
 * Canon #10: Dashboard = Control
 * Canon #29: Ruthless Hierarchy
 */
export const MobileKPIStrip = ({ kpis }) => {
    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-40 w-full px-2 py-3 apple-glass border-0 shadow-none flex justify-between items-center gap-2"
        >
            {kpis.map((kpi, idx) => (
                <div key={idx} className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 bg-muted/30 rounded-xl overflow-hidden shadow-sm">
                    <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: kpi.color || 'hsl(var(--primary))', boxShadow: `0 0 8px ${kpi.color}44` }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium tracking-tight leading-none truncate text-foreground/90">
                            {kpi.value}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-normal uppercase tracking-[0.1em] leading-none truncate mt-1">
                            {kpi.label}
                        </span>
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
