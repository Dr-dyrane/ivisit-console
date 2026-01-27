import React, { useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search, PanelRightOpen, PanelRightClose, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
                // Apple-Wordy Smart Header with glass-card design
                className={`fixed z-40 h-16 flex items-center justify-between transition-all duration-300 ${isMobile
                    ? 'top-2 left-2 right-2 rounded-2xl hover-lift'
                    : isScrolledDown
                        ? 'top-0 left-0 right-0'
                        : 'top-0 left-0 right-0'
                    }`}
                style={{
                    paddingRight: isMobile ? '16px' : '32px'  // 16px (2×8px) mobile, 32px (4×8px) desktop
                }}
            >            {/* Simple Static Dot Grid - Apple-level simplicity */}
                <div className="absolute inset-0 dot-grid pointer-events-none" />
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
                                className="text-sm md:text-xl font-semibold tracking-tight text-foreground truncate max-w-[150px] md:max-w-[300px]"
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
                        <div className="w-px h-6 bg-border/20 mx-2" />
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
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-card hover-lift transition-all duration-300 group lg:min-w-[200px] relative overflow-hidden"
                                aria-label="Search"
                            >
                                {/* Shared RGB Hive Effect */}
                                <div className="hover-glow hover-glow-primary" />

                                <Search className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-muted-foreground font-medium group-hover:text-foreground hidden lg:inline-block transition-colors">Search...</span>
                            </button>
                            <div className="w-px h-6 bg-border/20 mx-2" />
                            <NotificationCenter />
                            <div className="w-px h-6 bg-border/20 mx-2" />
                            <button
                                onClick={isContextPanelOpen ? closeContextPanel : openContextPanel}
                                className="w-10 h-10 rounded-2xl glass-card hover-lift transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                                title={isContextPanelOpen ? "Close Panel" : "Open Panel"}
                                aria-label={isContextPanelOpen ? "Close context panel" : "Open context panel"}
                            >
                                {/* Shared RGB Hive Effect */}
                                <div className="hover-glow hover-glow-success" />

                                {isContextPanelOpen ? (
                                    <PanelRightClose className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
                                ) : (
                                    <PanelRightOpen className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
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