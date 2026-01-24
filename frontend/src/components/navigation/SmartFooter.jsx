import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Activity, Database, CheckCircle2 } from 'lucide-react';


export const SmartFooter = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown, footerConfig, sidebarWidth } = useLayout();

    // Do not show when not configured as visible
    if (!footerConfig.visible) return null;

    // Calculate dynamic offsets to center perfectly within the content area
    // Matching App.js padding logic: Left = sidebarWidth + 48, Right = 48
    const leftOffset = isMobile ? 16 : (sidebarWidth + 48);
    const rightOffset = isMobile ? 16 : 48;

    return (
        <AnimatePresence>
            {!isScrolledDown && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                    className="hidden md:flex fixed bottom-8 z-20 justify-center pointer-events-none"
                    style={{
                        left: `${leftOffset}px`,
                        right: `${rightOffset}px`,
                    }}
                >
                    <div className="pointer-events-auto">
                        <div
                            className={`px-6 h-12 rounded-full backdrop-blur-xl flex items-center gap-6 min-w-[320px] justify-between border-border/40 relative shadow-premium ${isScrolledDown ? 'bg-background/80' : 'bg-background/40'
                                }`}
                            style={{
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            }}
                        >
                            =
                            {/* Left Section: Status/Context */}
                            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">
                                {footerConfig.type === 'pagination' ? (
                                    <Database className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                    <Activity className="w-3.5 h-3.5 text-success" />
                                )}
                                <span>{footerConfig.data?.label || 'SYSTEM STATUS'}</span>
                            </div>

                            {/* Center Section: Dynamic Content (Pagination or Custom) */}
                            <div className="flex-1 flex justify-center">
                                {footerConfig.content || (
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                            <span className="text-[10px] font-semibold text-foreground/80">LIVE SYNC ACTIVE</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Section: Core Stats/Indicators */}
                            <div className="flex items-center gap-3">
                                {footerConfig.data?.stats && (
                                    <div className="text-[10px] font-semibold text-foreground/60 border-l border-border/40 pl-3">
                                        {footerConfig.data.stats}
                                    </div>
                                )}
                                <div className="p-1.5 rounded-full bg-success/10 text-success">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
