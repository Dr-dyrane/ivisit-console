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
                        whileTap={{ scale: 0.96 }}
                        className="flex flex-col items-center justify-center p-5 rounded-[1.5rem] apple-glass-heavy border-0 active:bg-white/[0.05] transition-all duration-300 relative overflow-hidden group shadow-xl h-full min-h-[120px]"
                    >
                        {/* Background Analytical Glow */}
                        <div
                            className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.08] group-active:scale-150 transition-transform duration-700"
                            style={{ backgroundColor: item.color }}
                        />

                        {/* Background Decorative Icon - Referencing analytical page depth */}
                        <item.icon
                            size={64}
                            className="absolute -bottom-4 -left-4 opacity-[0.03] -rotate-12 group-active:rotate-0 transition-transform duration-500 pointer-events-none"
                            style={{ color: item.color }}
                        />

                        <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-active:scale-110 relative z-10 shadow-inner"
                            style={{
                                background: `radial-gradient(circle at 30% 30%, ${item.color}25, ${item.color}05)`,
                            }}
                        >
                            <item.icon size={22} className="opacity-95" style={{ color: item.color }} />
                        </div>

                        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-foreground/70 text-center line-clamp-1 relative z-10">
                            {item.label}
                        </span>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
};
