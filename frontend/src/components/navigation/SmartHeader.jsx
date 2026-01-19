import React, { useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NoiseOverlay from '../ui/noise-overlay';

export const SmartHeader = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown, headerConfig, sidebarWidth, isContextPanelOpen, openContextPanel, closeContextPanel } = useLayout();
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <>
            <motion.header
                initial={{ y: -100 }}
                animate={{
                    y: isScrolledDown ? -100 : 0,
                    opacity: isScrolledDown ? 0 : 1,
                    // Dynamic padding based on sidebar state
                    paddingLeft: isMobile ? 8 : sidebarWidth,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                }}
                // Lower z-index than IslandNavigation (z-50)
                className={`fixed z-40 h-16 flex items-center justify-between transition-colors duration-300 ${isMobile
                    ? 'top-2 left-2 right-2 squircle-2xl bg-background/90 backdrop-blur-2xl border border-white/10 shadow-premium'
                    : isScrolledDown
                        ? 'top-0 left-0 right-0 bg-background/80 backdrop-blur-2xl shadow-lg'
                        : 'top-0 left-0 right-0 bg-background/40 backdrop-blur-md'
                    }`}
                style={{
                    paddingRight: isMobile ? '16px' : '32px'  // 16px (2×8px) mobile, 32px (4×8px) desktop
                }}
            >
                <NoiseOverlay  className={`${isMobile && 'squircle-2xl'}`}/>
                <div className="flex items-center gap-2 md:gap-0 overflow-hidden h-full">
                    {/* Logo Zone - This will now slide with the paddingLeft */}

                    {!isMobile && (
                        <div className="flex items-center gap-4 ml-12">
                            {/* Breadcrumbs or spacers can go here */}
                        </div>
                    )}

                    {/* Page Title */}
                    <AnimatePresence mode="wait">
                        {headerConfig.title && (
                            <motion.h1
                                key={headerConfig.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-sm md:text-lg font-black tracking-tight text-foreground/90 truncate max-w-[150px] md:max-w-[300px] uppercase"
                            >
                                {headerConfig.title}
                            </motion.h1>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {headerConfig.viewToggle && !isMobile && (
                        <div className="flex items-center gap-2">
                            {headerConfig.viewToggle}
                        </div>
                    )}

                    {headerConfig.filterSheet && (
                        <div className="flex items-center gap-2">
                            {headerConfig.filterSheet}
                        </div>
                    )}

                    {(headerConfig.viewToggle || headerConfig.filterSheet) && !isMobile && (
                        <div className="w-px h-6 bg-white/10 mx-1" />
                    )}

                    {headerConfig.actions && (
                        <div className="flex items-center gap-2">
                            {headerConfig.actions}
                        </div>
                    )}

                    {!isMobile && (
                        <>
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group lg:min-w-[180px]"
                            >
                                <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                <span className="text-xs text-muted-foreground group-hover:text-foreground hidden lg:inline-block">Search...</span>
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            <NotificationCenter />
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            <button
                                onClick={isContextPanelOpen ? closeContextPanel : openContextPanel}
                                className="w-10 h-10 geo-round bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group shadow-sm"
                                title={isContextPanelOpen ? "Close Panel" : "Open Panel"}
                            >
                                {isContextPanelOpen ? (
                                    <PanelRightClose className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                ) : (
                                    <PanelRightOpen className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                )}
                            </button>
                        </>
                    )}
                </div>
            </motion.header>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};