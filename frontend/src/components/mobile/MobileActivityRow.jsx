import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MobileActivityRow
 * Compressed feed item for mobile activity with progressive disclosure
 * Canon #3: Reveal Gradually
 */
export const MobileActivityRow = ({ icon: Icon, msg, time, color = 'hsl(var(--primary))', user }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex flex-col apple-glass border-0 relative overflow-hidden mb-[1px] last:mb-0 ${isExpanded ? 'bg-white/[0.08]' : ''
                }`}
        >
            <div className="flex items-center gap-4 p-4">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${color}15, ${color}05)`,
                    }}
                >
                    {Icon && <Icon size={14} className="opacity-70" style={{ color }} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium tracking-tight text-foreground/80 line-clamp-1 leading-tight mb-1">
                        {msg}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-semibold tracking-widest uppercase opacity-30">
                        {time}
                    </p>
                </div>
            </div>

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
                        className="px-4 pb-4"
                    >
                        <div className="pt-3 border-t border-white/5 flex flex-col gap-1.5">
                            {user && (
                                <p className="text-[11px] text-muted-foreground tracking-tight">
                                    Triggered by <span className="text-foreground/70 font-medium">{user}</span>
                                </p>
                            )}
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] text-muted-foreground/40 tracking-wider uppercase font-semibold">
                                    Log ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                                </p>
                                <p className="text-[9px] text-success/60 font-semibold uppercase tracking-widest">
                                    Verified
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
