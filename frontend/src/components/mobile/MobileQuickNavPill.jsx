import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * MobileQuickNavPill
 * 3-up icon grid for secondary mobile navigation
 */
export const MobileQuickNavPill = ({ items }) => {
    return (
        <div className="grid grid-cols-2 gap-3 px-1 py-1">
            {items.map((item, idx) => (
                <Link key={idx} to={item.path} className="block h-full">
                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-4 p-4 rounded-2xl apple-glass-heavy border-0 active:bg-white/[0.05] transition-all duration-300 relative overflow-hidden group shadow-xl h-full min-h-[72px]"
                    >
                        {/* Background Analytical Glow */}
                        <div
                            className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.12] group-active:scale-125 transition-transform duration-700"
                            style={{ backgroundColor: item.color }}
                        />

                        {/* Background Decorative Icon */}
                        <item.icon
                            size={56}
                            className="absolute -bottom-2 -right-2 opacity-[0.02] -rotate-12 group-active:rotate-0 transition-transform duration-500 pointer-events-none"
                            style={{ color: item.color }}
                        />

                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-active:scale-110 relative z-10 shadow-md"
                            style={{
                                background: `radial-gradient(circle at 30% 30%, ${item.color.replace(/\)$/, ' / 0.2)')}, ${item.color.replace(/\)$/, ' / 0.1)')})`,
                            }}
                        >
                            <item.icon size={18} className="opacity-95" style={{ color: item.color }} />
                        </div>

                        <div className="flex flex-col min-w-0 relative z-10">
                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/80 leading-tight">
                                {item.label}
                            </span>
                            <span className="text-[7px] text-muted-foreground/30 font-normal uppercase tracking-widest mt-0.5">
                                Exploration
                            </span>
                        </div>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
};
