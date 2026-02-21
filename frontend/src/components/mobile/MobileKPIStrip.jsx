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
            className="sticky top-0 z-40 w-full px-[18px] py-4 apple-glass border-0 shadow-lg flex justify-between items-center gap-2"
        >
            {kpis.map((kpi, idx) => (
                <div key={idx} className="flex items-center gap-2.5 overflow-hidden">
                    <div
                        className="w-1 h-1 rounded-full shrink-0 opacity-60"
                        style={{ backgroundColor: kpi.color || 'hsl(var(--primary))' }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-semibold tracking-tighter leading-none truncate text-foreground/90">
                            {kpi.value}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-[0.15em] leading-none truncate mt-1">
                            {kpi.label}
                        </span>
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
