import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * MobileQuickNavPill
 * 3-up icon grid for secondary mobile navigation
 */
export const MobileQuickNavPill = ({ items }) => {
    return (
        <div className="grid grid-cols-3 gap-3 px-1 py-2">
            {items.map((item, idx) => (
                <Link key={idx} to={item.path} className="block">
                    <motion.div
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col items-center justify-center p-5 rounded-3xl apple-glass border-0 active:bg-white/[0.05] transition-all duration-300 relative overflow-hidden group shadow-md"
                    >
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-active:scale-105"
                            style={{
                                background: `radial-gradient(circle at 30% 30%, ${item.color}15, ${item.color}05)`,
                            }}
                        >
                            <item.icon size={20} className="opacity-80" style={{ color: item.color }} />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/60 text-center line-clamp-1">
                            {item.label}
                        </span>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
};
