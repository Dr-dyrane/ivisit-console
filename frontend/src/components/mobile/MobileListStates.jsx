import React from 'react';
import { motion } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileMotion } from './mobileMotion';

export const MobileListLoadingMore = ({ label = 'Loading more' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={mobileMotion.linger}
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
                    className="w-1 h-1 rounded-pill bg-foreground/30"
                />
            ))}
        </div>
        <span className="eyebrow opacity-40">
            {label}
        </span>
    </motion.div>
);

export const MobileListSkeletonRows = ({ count = 3 }) => (
    <div className="w-full flex flex-col gap-2 px-2">
        {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="bg-muted/40 rounded-button p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-pill bg-muted/20 shimmer" />
                    <div className="space-y-2">
                        <div className="h-2 w-24 rounded-pill bg-muted/20 shimmer" />
                        <div className="h-2 w-16 rounded-pill bg-muted/10 shimmer" />
                    </div>
                </div>
                <div className="h-6 w-12 rounded-pill bg-muted/20 shimmer" />
            </div>
        ))}
    </div>
);

export const MobileListLoadMore = ({ armed = false, onRequest, labelTone = 'caps' }) => {
    const { triggerFromEvent } = useFeedback();
    const copy = armed ? 'Scroll to load' : 'Load more';
    const labelClassName = labelTone === 'plain'
        ? 'text-meta normal-case tracking-tight'
        : 'text-[10px] uppercase tracking-[0.2em]';

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
            className={`h-11 px-4 rounded-button bg-muted/40 font-semibold text-foreground/80 hover:text-foreground/95 hover:bg-white/[0.05] active:scale-[0.96] transition-[transform,color,background] duration-200 ${labelClassName}`}
        >
            {copy}
        </button>
    );
};

export const MobileListEnd = ({ label = 'End of list' }) => (
    <p className="eyebrow opacity-20 py-8">
        {label}
    </p>
);

export const MobileListEmpty = ({
    icon: Icon,
    label = 'No records found',
    reason = 'empty', // empty | filtered | search
    hint,
    onRecover,
    recoverLabel,
    labelTone = 'caps'
}) => {
    const { triggerFromEvent } = useFeedback();

    const reasonCopy = {
        empty: 'No data available right now.',
        filtered: 'Filters narrowed this view to zero results.',
        search: 'No results match your current search.'
    };

    const fallbackRecoverLabel = reason === 'filtered' ? 'Clear Filters' : reason === 'search' ? 'Clear Search' : 'Reload';
    const helperText = hint || reasonCopy[reason] || reasonCopy.empty;
    const labelClassName = labelTone === 'plain'
        ? 'text-sm font-medium normal-case tracking-normal text-muted-foreground/65 opacity-90'
        : 'eyebrow opacity-30';
    const helperClassName = labelTone === 'plain'
        ? 'mt-2 text-meta leading-5 text-muted-foreground/55 tracking-normal'
        : 'mt-2 text-[11px] text-muted-foreground/55 tracking-tight';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center px-4"
        >
            {Icon && <Icon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/10" />}
            <p className={labelClassName}>
                {label}
            </p>
            <p className={helperClassName}>
                {helperText}
            </p>
            {typeof onRecover === 'function' && (
                <motion.button
                    whileTap={mobileMotion.press.control}
                    onClick={(event) => {
                        onRecover();
                        triggerFromEvent(event, {
                            variant: FEEDBACK_TYPES.INFO,
                            color: 'hsl(var(--spark))',
                            haptic: true,
                            sound: true
                        });
                    }}
                    className="mt-3 h-8 px-3 rounded-button text-[11px] font-semibold bg-[hsl(var(--spark)/0.10)] text-[hsl(var(--spark)/0.94)]"
                >
                    {recoverLabel || fallbackRecoverLabel}
                </motion.button>
            )}
        </motion.div>
    );
};
