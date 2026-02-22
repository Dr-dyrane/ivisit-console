import React from 'react';
import { motion } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileMotion } from './mobileMotion';
import { useScrollCooldown } from './useScrollCooldown';

const toneClasses = {
    neutral: 'text-foreground/75 hover:text-foreground',
    spark: 'text-[hsl(var(--spark)/0.85)] hover:text-[hsl(var(--spark)/0.95)]',
    info: 'text-info/85 hover:text-info',
    success: 'text-success/85 hover:text-success',
    warning: 'text-warning/85 hover:text-warning',
    destructive: 'text-destructive/85 hover:text-destructive'
};

const toneVariant = (tone) => {
    if (tone === 'destructive') return FEEDBACK_TYPES.DESTRUCTIVE;
    if (tone === 'warning') return FEEDBACK_TYPES.WARNING;
    if (tone === 'success') return FEEDBACK_TYPES.SUCCESS;
    if (tone === 'info') return FEEDBACK_TYPES.INFO;
    return FEEDBACK_TYPES.CLICK;
};

export const MobileActionRail = ({ actions = [], className = '' }) => {
    const { triggerFromEvent } = useFeedback();
    const { isScrolling, bind } = useScrollCooldown(180);

    if (!actions.length) return null;

    return (
        <div className={`mb-3 px-1 ${className}`}>
            <div className="relative apple-glass-heavy rounded-2xl p-2 flex items-center gap-2 overflow-x-auto no-scrollbar" {...bind}>
                {actions.map((action) => {
                    const Icon = action.icon;
                    const tone = action.tone || 'neutral';
                    const active = Boolean(action.active);
                    return (
                        <motion.button
                            key={action.id || action.label}
                            whileTap={mobileMotion.tap}
                            disabled={action.disabled}
                            onClick={(event) => {
                                if (isScrolling) return;
                                action.onClick?.(event);
                                triggerFromEvent(event, {
                                    variant: toneVariant(tone),
                                    color: action.color || (tone === 'spark' ? 'hsl(var(--spark))' : 'hsl(var(--primary))'),
                                    haptic: true,
                                    sound: true
                                });
                            }}
                            className={`h-9 rounded-xl text-[9px] uppercase tracking-[0.14em] whitespace-nowrap px-3 inline-flex items-center justify-center gap-1.5 transition-[color,background,transform] duration-200 ${active ? 'bg-[hsl(var(--spark)/0.10)]' : 'bg-transparent'} ${toneClasses[tone] || toneClasses.neutral}`}
                        >
                            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                            <span>{action.label}</span>
                        </motion.button>
                    );
                })}
                <div className="shrink-0 w-2" />
                {/* Edge masks */}
                <div className="pointer-events-none absolute left-2 top-2 bottom-2 w-6 bg-gradient-to-r from-background/70 to-transparent" />
                <div className="pointer-events-none absolute right-2 top-2 bottom-2 w-6 bg-gradient-to-l from-background/70 to-transparent" />
            </div>
        </div>
    );
};

export default MobileActionRail;
