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
                            className="chrome-glass pointer-events-auto relative flex h-12 min-w-[320px] items-center justify-between gap-6 overflow-hidden rounded-pill px-6"
                        >

                            {/* Left Section: Status/Context */}
                            <div className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground">
                                {footerConfig.type === 'pagination' ? (
                                    <Database className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                                ) : (
                                    <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                                )}
                                <span>{footerConfig.data?.label || 'System status'}</span>
                            </div>

                            {/* Center Section: Dynamic Content (Pagination or Custom) */}
                            <div className="flex-1 flex justify-center">
                                {footerConfig.content || (
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/5 ">
                                            <div className="h-1.5 w-1.5 rounded-pill bg-emerald-500" />
                                            <span className="text-xs font-medium text-foreground/80">Live sync active</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Section: Core Stats/Indicators */}
                            <div className="flex items-center gap-3">
                                {footerConfig.data?.stats && (
                                    <div className="text-[10px] font-semibold text-foreground/60 pl-3">
                                        {footerConfig.data.stats}
                                    </div>
                                )}
                                <div className="rounded-pill bg-emerald-500/10 p-1.5 text-emerald-700 dark:text-emerald-200">
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
