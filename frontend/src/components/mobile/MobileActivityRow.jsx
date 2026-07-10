import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileMotion } from './mobileMotion';

/**
 * MobileActivityRow
 * Compressed feed item for mobile activity with progressive disclosure
 * Canon #3: Reveal Gradually
 */
export const MobileActivityRow = ({ icon: Icon, msg, time, color = 'hsl(var(--primary))', user }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { triggerFromEvent } = useFeedback();
    const derivedEventId = `${String(time || '').replace(/\s+/g, '').slice(0, 6)}-${String(msg || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

    return (
        <motion.div
            layout="position"
            transition={mobileMotion.spring}
            whileTap={{ scale: 0.988 }}
            onClick={() => setIsExpanded(!isExpanded)}
            onPointerDown={(event) => triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color, haptic: true, sound: true })}
            className={`flex flex-col relative overflow-hidden mb-0.5 last:mb-0 rounded-inner bg-muted/30 ${isExpanded ? 'bg-muted/60' : ''
                }`}
        >
            <div className="flex items-center gap-4 p-4 rounded-inner">
                <div
                    className="w-8 h-8 rounded-icon flex items-center justify-center shrink-0"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.2)')}, ${color.replace(/\)$/, ' / 0.1)')})`,
                    }}
                >
                    {Icon && <Icon size={14} className="opacity-70" style={{ color }} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-meta font-medium tracking-tight text-foreground/80 line-clamp-1 leading-tight mb-1">
                        {msg}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 font-normal">
                        {time}
                    </p>
                </div>
                <div
                    className="min-w-[74px] rounded-inner px-2 py-1 text-right"
                    style={{
                        background: `linear-gradient(120deg, ${color.replace(/\)$/, ' / 0.16)')}, ${color.replace(/\)$/, ' / 0.04)')})`,
                    }}
                >
                    <p className="text-[11px] leading-none text-foreground/60 font-medium">Signal</p>
                    <p className="mt-0.5 text-[11px] leading-none font-semibold font-dashboard-numbers text-foreground/90 truncate">{time}</p>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            height: mobileMotion.spring,
                            opacity: mobileMotion.base
                        }}
                        className="px-4 pb-4"
                    >
                        <div className="pt-3 flex flex-col gap-2">
                            {user && (
                                <p className="text-[11px] text-muted-foreground tracking-tight font-normal">
                                    Triggered by <span className="text-foreground/70 font-medium">{user}</span>
                                </p>
                            )}
                            <div className="flex items-center justify-between p-2 rounded-inner surface-card">
                                <p className="text-[11px] text-muted-foreground/60 font-medium">
                                    Event: {derivedEventId || 'LIVE'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
