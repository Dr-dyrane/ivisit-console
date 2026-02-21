import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronRight } from 'lucide-react';

/**
 * MobileFeaturedMetric
 * High-impact hero metric for mobile dashboards (Success Rate, Active Requests)
 */
export const MobileFeaturedMetric = ({
    label,
    value,
    trend,
    chartData,
    icon: Icon,
    color = 'hsl(var(--primary))',
    onClick
}) => {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="w-full p-6 apple-glass-heavy border-0 flex flex-col justify-between relative overflow-hidden group min-h-[160px] rounded-3xl mb-4 shadow-xl"
        >
            {/* Subtle Neon primary glow background - Reduced bleed */}
            <div
                className="absolute -inset-10 opacity-[0.04]"
                style={{ background: `radial-gradient(circle at 50% 50%, ${color}, transparent 60%)` }}
            />

            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-medium tracking-tighter text-foreground/90">
                            {value}
                        </h2>
                        {trend && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trend.includes('+') ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                                }`}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>

                <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${color}15, ${color}05)` }}
                >
                    {Icon && <Icon size={20} className="opacity-70" style={{ color }} />}
                </div>
            </div>

            {/* Sparkline */}
            <div className="h-14 w-full -mx-4 mt-4 relative z-10 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill="transparent"
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {onClick && (
                <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-all duration-300">
                    <ChevronRight size={16} className="text-foreground" />
                </div>
            )}
        </motion.div>
    );
};
