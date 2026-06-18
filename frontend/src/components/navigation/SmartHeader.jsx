import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search, Menu, X, PanelRightOpen, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { MobileNavMenu } from './MobileNavMenu';

export const SmartHeader = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isMobile } = useNavigation();
    const { isScrolledDown, headerConfig, sidebarWidth, isContextPanelOpen, openContextPanel, closeContextPanel } = useLayout();
    const { user, profile } = useAuth();
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [previousPath, setPreviousPath] = useState(null);
    const historyRef = useRef([]);

    // Listen for closeMobileMenu events from context panel actions
    useEffect(() => {
        const handleClose = () => setMenuOpen(false);
        const handleOpen = () => setMenuOpen(true);
        window.addEventListener('closeMobileMenu', handleClose);
        window.addEventListener('openMobileMenu', handleOpen);
        return () => {
            window.removeEventListener('closeMobileMenu', handleClose);
            window.removeEventListener('openMobileMenu', handleOpen);
        };
    }, []);

    useEffect(() => {
        const path = location.pathname;
        if (!path) return;
        const last = historyRef.current[historyRef.current.length - 1];
        if (last !== path) {
            historyRef.current.push(path);
            if (historyRef.current.length > 24) historyRef.current.shift();
        }
        setPreviousPath(historyRef.current[historyRef.current.length - 2] || null);
    }, [location.pathname]);

    const AVATAR_URL = profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&background=random`;
    const isHome = location.pathname === '/';

    const getRouteLabel = (pathname) => {
        if (!pathname) return 'Home';
        if (pathname === '/') return 'Home';
        if (pathname.startsWith('/map')) return 'Map';
        if (pathname.startsWith('/analytics')) return 'Analytics';
        if (pathname.startsWith('/hospitals')) return 'Hospitals';
        if (pathname.startsWith('/ambulances')) return 'Ambulances';
        if (pathname.startsWith('/doctors')) return 'Doctors';
        if (pathname.startsWith('/visits')) return 'Visits';
        if (pathname.startsWith('/emergencies')) return 'Emergency';
        if (pathname.startsWith('/verification')) return 'Verification';
        if (pathname.startsWith('/users')) return 'Users';
        if (pathname.startsWith('/organizations')) return 'Organizations';
        if (pathname.startsWith('/settings')) return 'Settings';
        if (pathname.startsWith('/health-news')) return 'Health News';
        if (pathname.startsWith('/support-tickets')) return 'Support';
        if (pathname.startsWith('/insurance')) return 'Insurance';
        if (pathname.startsWith('/subscriptions')) return 'Subscriptions';
        if (pathname.startsWith('/wallet')) return 'Wallet';
        if (pathname.startsWith('/pricing')) return 'Pricing';
        return 'Back';
    };
    const currentPageLabel = headerConfig?.title || getRouteLabel(location.pathname);

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
                    ? 'top-2 left-2 right-2 h-11 rounded-full pointer-events-auto bg-transparent backdrop-blur-sm'
                    : 'top-0 left-0 right-0 h-16 pointer-events-auto'
                    }`}
                style={{
                    paddingRight: isMobile ? '8px' : '32px',
                    paddingTop: isMobile ? '0' : '0',
                }}
            >
                {/* MOBILE: 3-column flex — Left / Center / Right */}
                {isMobile ? (
                    <>
                        {/* LEFT — Back badge + Avatar */}
                        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                            {!isHome && (
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(-1)}
                                    className="h-6 max-w-[100px] px-1.5 rounded-full border-0 inline-flex items-center gap-1 text-[8px] font-semibold tracking-[0.05em] text-foreground/75 truncate bg-[hsl(var(--spark)/0.12)] hover:bg-[hsl(var(--spark)/0.16)] transition-colors"
                                    aria-label="Go back"
                                >
                                    <Play className="h-3 w-3 rotate-180 text-[hsl(var(--spark)/0.88)] fill-current stroke-0 shrink-0" />
                                    <span className="truncate">{getRouteLabel(previousPath)}</span>
                                </motion.button>
                            )}
                            <button
                                onClick={() => setMenuOpen(true)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-transform active:scale-95 overflow-hidden border-0 shadow-sm shrink-0"
                            >
                                <img src={AVATAR_URL} alt="User" className="w-full h-full object-cover" />
                            </button>
                        </div>

                        {/* CENTER — Logo (fixed center) or Page title (dynamic flex) */}
                        {isHome ? (
                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl bg-[linear-gradient(135deg,hsl(var(--spark)/0.14),hsl(var(--primary)/0.08))] shadow-[0_4px_14px_-10px_hsl(var(--spark)/0.32)] pointer-events-none select-none">
                                <img src="/logo.png" alt="iVisit" className="h-4 w-4 object-contain opacity-90" />
                                <span className="text-[13px] font-semibold tracking-tight text-foreground/88 inline-flex items-center">
                                    iVisit
                                    <span className="-ml-[1px] text-primary leading-none">.</span>
                                </span>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                                <div className="flex items-center px-2.5 py-1 rounded-full backdrop-blur-xl bg-[linear-gradient(135deg,hsl(var(--spark)/0.14),hsl(var(--primary)/0.08))] shadow-[0_4px_14px_-10px_hsl(var(--spark)/0.32)] select-none min-w-0 max-w-full">
                                    <span className="text-[12px] font-semibold tracking-tight text-foreground/85 inline-flex items-center min-w-0">
                                        <span className="truncate">{currentPageLabel}</span>
                                        <span className="-ml-[1px] text-primary leading-none shrink-0">.</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* RIGHT — Search + Notifications */}
                        <div className="flex items-center gap-1.5 rounded-full px-1.5 py-1 bg-white/[0.03] shrink-0">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-[color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-muted-foreground/75 hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <NotificationCenter />
                        </div>
                    </>
                ) : (
                    /* DESKTOP layout — unchanged */
                    <>
                        <div className="flex items-center gap-2 md:gap-0 overflow-hidden h-full">
                            <div className="flex items-center gap-4 ml-12" />
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
                        <div className="flex items-center gap-3 ml-auto">
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
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={isContextPanelOpen ? closeContextPanel : openContextPanel}
                                            className={`flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-300 ${isContextPanelOpen
                                                ? 'bg-primary/20 text-primary shadow-inner'
                                                : 'bg-primary/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                                }`}
                                            aria-label={isContextPanelOpen ? "Close quick actions panel" : "Open quick actions panel"}
                                        >
                                            <PanelRightOpen className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>{isContextPanelOpen ? "Close quick actions panel" : "Quick Actions"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </>
                )}
            </motion.header>

            {/* Mobile Nav Sheet (Left to Right) */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetOverlay className="bg-transparent backdrop-blur-xs" />
                <SheetContent
                    side="left"
                    className="w-[88%] max-w-[365px] p-0 border-0 bg-background/95 dark:bg-muted/70 backdrop-blur-sm rounded-r-[36px] overflow-hidden shadow-2xl"
                >
                    <MobileNavMenu onClose={() => setMenuOpen(false)} />
                </SheetContent>
            </Sheet>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
