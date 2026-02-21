import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * MobileSectionHeader
 * Minimal authority header for mobile sections
 */
export const MobileSectionHeader = ({ label, color = 'hsl(var(--primary))', count }) => (
    <div className="px-1 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: color }} />
            <h5 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {label}
            </h5>
        </div>
        {count !== undefined && (
            <span className="text-[10px] font-medium text-muted-foreground/40 bg-white/5 px-1.5 py-0.5 rounded-sm">
                {count}
            </span>
        )}
    </div>
);

/**
 * MobileMetricRow
 * Single row for a metric or navigation item on mobile
 */
export const MobileMetricRow = ({
    icon: Icon,
    label,
    value,
    trend,
    onClick,
    color = 'hsl(var(--primary))',
    description
}) => {
    return (
        <motion.div
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 apple-glass border-0 active:bg-white/[0.05] transition-all duration-300 relative overflow-hidden group mb-[1px] last:mb-0"
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{
                    background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                }}
            >
                {Icon && <Icon size={18} className="opacity-80" style={{ color }} />}
            </div>

            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-[14px] font-medium tracking-tight text-foreground/80 truncate">{label}</p>
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[15px] font-semibold tracking-tight text-foreground/90">{value}</span>
                        {trend && (
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${trend.includes('+') ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                {description && (
                    <p className="text-[10px] text-muted-foreground font-medium tracking-wider truncate opacity-40 uppercase">
                        {description}
                    </p>
                )}
            </div>

            {onClick && (
                <ChevronRight size={14} className="text-foreground opacity-10 group-active:opacity-30 transition-opacity" />
            )}
        </motion.div>
    );
};
