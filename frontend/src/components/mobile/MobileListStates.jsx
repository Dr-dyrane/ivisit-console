import React from 'react';
import { motion } from 'framer-motion';

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

export const MobileListEmpty = ({ icon: Icon, label = 'No records found' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-24 text-center"
    >
        {Icon && <Icon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/10" />}
        <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-30">
            {label}
        </p>
    </motion.div>
);

