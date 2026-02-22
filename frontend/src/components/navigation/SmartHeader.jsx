import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search, Menu, X, PanelRightOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { MobileNavMenu } from './MobileNavMenu';

export const SmartHeader = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown, headerConfig, sidebarWidth, isContextPanelOpen, openContextPanel, closeContextPanel } = useLayout();
    const { user, profile } = useAuth();
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Listen for closeMobileMenu events from context panel actions
    useEffect(() => {
        const handleClose = () => setMenuOpen(false);
        window.addEventListener('closeMobileMenu', handleClose);
        return () => window.removeEventListener('closeMobileMenu', handleClose);
    }, []);

    const AVATAR_URL = profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&background=random`;

    return (
        <>
            <motion.header
                initial={{ y: -100 }}
                animate={{
                    y: isScrolledDown ? -100 : 0,
                    opacity: isScrolledDown ? 0 : 1,
                    // Dynamic padding based on sidebar state
                    paddingLeft: isMobile ? 12 : sidebarWidth,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                }}
                // Apple-Wordy Smart Header with glass-card design
                className={`fixed z-40 flex items-center justify-between transition-all duration-300 ${isMobile
                    ? 'top-2 left-2 right-2 h-11 rounded-full apple-glass-heavy pointer-events-auto'
                    : 'top-0 left-0 right-0 h-16 pointer-events-auto'
                    }`}
                style={{
                    paddingRight: isMobile ? '8px' : '32px',
                    paddingTop: isMobile ? '0' : '0',
                }}
            >
                {/* MOBILE: LEFT - Avatar Trigger */}
                {isMobile ? (
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-transform active:scale-95 overflow-hidden border-0 shadow-sm shrink-0"
                    >
                        <img src={AVATAR_URL} alt="User" className="w-full h-full object-cover" />
                    </button>
                ) : (
                    <div className="flex items-center gap-2 md:gap-0 overflow-hidden h-full">
                        {/* Desktop Title Zone */}
                        <div className="flex items-center gap-4 ml-12">
                            {/* Breadcrumbs or spacers can go here */}
                        </div>

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
                )}

                {/* RIGHT - Actions */}
                <div className="flex items-center gap-1.5 md:gap-3 ml-auto">
                    {/* MOBILE SPECIFIC RIGHT ACTIONS */}
                    {isMobile ? (
                        <div className="flex items-center gap-1.5 rounded-full px-1.5 py-1 bg-white/[0.03]">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-[color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-muted-foreground/75 hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <NotificationCenter />
                        </div>
                    ) : (
                        <>
                            {headerConfig.viewToggle && (
                                <div className="flex items-center gap-2">
                                    {headerConfig.viewToggle}
                                </div>
                            )}

                            {headerConfig.filterSheet && (
                                <div className="flex items-center gap-2">
                                    {headerConfig.filterSheet}
                                </div>
                            )}

                            {(headerConfig.viewToggle || headerConfig.filterSheet) && (
                                <div className="w-px h-6 bg-border/20 mx-2" />
                            )}

                            {headerConfig.actions && (
                                <div className="flex items-center gap-2">
                                    {headerConfig.actions}
                                </div>
                            )}

                            <button
                                onClick={() => setSearchOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-card hover-lift transition-all duration-300 group lg:min-w-[200px] relative overflow-hidden"
                                aria-label="Search"
                            >
                                <div className="hover-glow hover-glow-primary" />
                                <Search className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-muted-foreground font-medium group-hover:text-foreground hidden lg:inline-block transition-colors">Search...</span>
                            </button>
                            <div className="w-px h-6 bg-border/20 mx-2" />
                            <NotificationCenter />
                            <div className="w-px h-6 bg-border/20 mx-2" />
                            <button
                                onClick={isContextPanelOpen ? closeContextPanel : openContextPanel}
                                className={`flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-300 ${isContextPanelOpen
                                    ? 'bg-primary/20 text-primary shadow-inner'
                                    : 'bg-primary/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                    }`}
                                title={isContextPanelOpen ? "Close Context" : "Open Context"}
                            >
                                <PanelRightOpen className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </motion.header>

            {/* Mobile Nav Sheet (Left to Right) */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetOverlay className="bg-black/15 backdrop-blur-xs" />
                <SheetContent
                    side="left"
                    className="w-[88%] max-w-[340px] p-0 border-0 bg-background/95 dark:bg-background/30 backdrop-blur-xl rounded-r-[36px] overflow-hidden shadow-2xl"
                >
                    <MobileNavMenu onClose={() => setMenuOpen(false)} />
                </SheetContent>
            </Sheet>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
