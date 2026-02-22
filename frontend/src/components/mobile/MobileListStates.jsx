import React from 'react';
import { motion } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

export const MobileListLoadingMore = ({ label = 'Loading more' }) => (
    <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-primary/40"
                />
            ))}
        </div>
        <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
            {label}
        </span>
    </div>
);

export const MobileListEnd = ({ label = 'End of list' }) => (
    <p className="text-[8px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-20 py-8">
        {label}
    </p>
);

export const MobileListEmpty = ({
    icon: Icon,
    label = 'No records found',
    reason = 'empty', // empty | filtered | search
    hint,
    onRecover,
    recoverLabel
}) => {
    const { triggerFromEvent } = useFeedback();

    const reasonCopy = {
        empty: 'No data available right now.',
        filtered: 'Filters narrowed this view to zero results.',
        search: 'No results match your current search.'
    };

    const fallbackRecoverLabel = reason === 'filtered' ? 'Clear Filters' : reason === 'search' ? 'Clear Search' : 'Reload';
    const helperText = hint || reasonCopy[reason] || reasonCopy.empty;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center px-4"
        >
            {Icon && <Icon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/10" />}
            <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-30">
                {label}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground/55 tracking-tight">
                {helperText}
            </p>
            {typeof onRecover === 'function' && (
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={(event) => {
                        onRecover();
                        triggerFromEvent(event, {
                            variant: FEEDBACK_TYPES.INFO,
                            color: 'hsl(var(--spark))',
                            haptic: true,
                            sound: true
                        });
                    }}
                    className="mt-3 h-8 px-3 rounded-xl text-[9px] uppercase tracking-[0.14em] font-semibold bg-[hsl(var(--spark)/0.10)] text-[hsl(var(--spark)/0.94)]"
                >
                    {recoverLabel || fallbackRecoverLabel}
                </motion.button>
            )}
        </motion.div>
    );
};
