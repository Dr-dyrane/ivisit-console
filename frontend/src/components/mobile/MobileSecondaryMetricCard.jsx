import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

export const MobileSecondaryMetricCard = ({
    icon: Icon,
    title,
    subtitle,
    value,
    color = 'hsl(var(--primary))',
    trendDirection,
    trendText,
    trendUpClass = 'text-success',
    trendDownClass = 'text-destructive',
    trendFlatClass = 'text-muted-foreground/60',
    onClick
}) => {
    const { triggerFromEvent } = useFeedback();
    const isInteractive = typeof onClick === 'function';
    const Comp = isInteractive ? motion.button : 'div';

    const handleClick = (event) => {
        if (!isInteractive) return;
        onClick();
        triggerFromEvent(event, {
            variant: FEEDBACK_TYPES.INFO,
            color,
            haptic: true,
            sound: true
        });
    };

    return (
        <Comp
            {...(isInteractive ? { whileTap: { scale: 0.985 } } : {})}
            onClick={handleClick}
            className={`relative w-full p-4 apple-glass-heavy rounded-2xl border-0 overflow-hidden text-left flex items-center justify-between ${isInteractive ? 'transition-[transform,background-color,box-shadow] duration-200 hover:bg-white/[0.04] active:bg-white/[0.06] cursor-pointer' : ''}`}
        >
            {Icon && <Icon className="absolute top-3 right-3 h-4 w-4 text-primary/30" />}
            <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">{title}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">{subtitle}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">{value}</span>
                {trendText ? (
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                        {trendDirection === 'up' && <ArrowUpRight className={`h-3 w-3 ${trendUpClass}`} />}
                        {trendDirection === 'down' && <ArrowDownRight className={`h-3 w-3 ${trendDownClass}`} />}
                        {(!trendDirection || trendDirection === 'flat') && <Minus className={`h-3 w-3 ${trendFlatClass}`} />}
                        {trendText}
                    </span>
                ) : null}
            </div>
        </Comp>
    );
};

export default MobileSecondaryMetricCard;
