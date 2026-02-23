import React from 'react';
import { motion } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

export const MobileListLoadingMore = ({ label = 'Loading more' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2"
    >
        <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        opacity: [0.2, 0.6, 0.2],
                    }}
                    transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                    className="w-1 h-1 rounded-full bg-primary/30"
                />
            ))}
        </div>
        <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
            {label}
        </span>
    </motion.div>
);

export const MobileListSkeletonRows = ({ count = 3 }) => (
    <div className="w-full flex flex-col gap-2 px-2">
        {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="apple-glass-heavy rounded-2xl p-4 flex items-center justify-between border-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted/20 shimmer" />
                    <div className="space-y-2">
                        <div className="h-2 w-24 rounded-full bg-muted/20 shimmer" />
                        <div className="h-2 w-16 rounded-full bg-muted/10 shimmer" />
                    </div>
                </div>
                <div className="h-6 w-12 rounded-full bg-muted/20 shimmer" />
            </div>
        ))}
    </div>
);

export const MobileListLoadMore = ({ armed = false, onRequest }) => {
    const { triggerFromEvent } = useFeedback();

    return (
        <button
            type="button"
            onClick={(event) => {
                onRequest?.();
                triggerFromEvent(event, {
                    variant: FEEDBACK_TYPES.CLICK,
                    color: 'hsl(var(--primary))',
                    haptic: true,
                    sound: true
                });
            }}
            className="h-11 px-4 rounded-2xl apple-glass-heavy border-0 text-[10px] uppercase tracking-[0.2em] font-semibold text-foreground/80 hover:text-foreground/95 hover:bg-white/[0.05] active:scale-95 transition-[transform,color,background] duration-200"
        >
            {armed ? 'Scroll To Load' : 'Load More'}
        </button>
    );
};

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
