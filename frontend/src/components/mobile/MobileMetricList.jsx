import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
 * Canon #3: Reveal Gradually
 * Canon #28: Feels Touchable
 */
export const MobileMetricRow = ({
    icon: Icon,
    label,
    value,
    trend,
    onClick,
    color = 'hsl(var(--primary))',
    description,
    expandedContent // New prop for progressive disclosure
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleInteraction = (e) => {
        if (expandedContent) {
            setIsExpanded(!isExpanded);
        } else if (onClick) {
            onClick(e);
        }
    };

    return (
        <motion.div
            layout
            initial={false}
            className="w-full flex flex-col mb-2 last:mb-0"
        >
            <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={handleInteraction}
                className={`w-full flex items-center gap-3 p-3 apple-glass-heavy border-0 rounded-2xl relative overflow-hidden group bg-white/[0.01] ${isExpanded ? 'bg-white/[0.12]' : 'active:bg-white/[0.06]'
                    }`}
            >
                {/* 2px Left Accent - The only differentiator */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[2px] opacity-60"
                    style={{ backgroundColor: color }}
                />

                <div
                    className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 relative z-10 shadow-inner bg-primary/5"
                >
                    {Icon && <Icon size={16} className="opacity-95" style={{ color }} />}
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5 truncate text-muted-foreground/50">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[15px] font-bold tracking-tight text-foreground/95">{value}</span>
                        {trend && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${trend.includes('+') ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>

                {(onClick || expandedContent) && (
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="opacity-20 group-active:opacity-40"
                    >
                        <ChevronRight size={14} />
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            height: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="bg-white/[0.04] overflow-hidden rounded-b-2xl -mt-2 pt-2"
                    >
                        <div className="p-3 pt-4 text-[11px] text-muted-foreground/80 tracking-tight leading-relaxed font-normal">
                            {expandedContent}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
