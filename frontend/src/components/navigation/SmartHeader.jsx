import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search, PanelRightOpen, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetDescription, SheetOverlay, SheetTitle } from '../ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { MobileNavMenu } from './MobileNavMenu';
import { getAvatarUrl } from '../../lib/avatarUtils';

const HeaderDivider = () => (
    <div className="mx-2 h-6 w-[2px] rounded-pill bg-foreground/[0.06]" aria-hidden="true" />
);

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

    // Context actions and legacy shell triggers can open or close the mobile account sheet.
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

    // Global type-to-search shortcut: Cmd/Ctrl+K anywhere, '/' outside text fields.
    useEffect(() => {
        const handleShortcut = (event) => {
            const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
            const isCommandK = (event.metaKey || event.ctrlKey) && key === 'k';
            const isSlash = key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
            if (!isCommandK && !isSlash) return;
            if (isSlash) {
                // Never steal '/' while the user is typing or another dialog is open.
                if (event.target?.closest?.('input,textarea,[contenteditable="true"]')) return;
                if (document.querySelector('[role="dialog"][data-state="open"]')) return;
            }
            event.preventDefault();
            setSearchOpen(true);
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
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

    const avatarInitial = (profile?.full_name || profile?.username || user?.email || 'User')
        .trim()
        .charAt(0)
        .toUpperCase();
    const avatarUrl = getAvatarUrl(profile, user);
    const isHome = location.pathname === '/';
    const isMacLike = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || '');
    const searchShortcutLabel = isMacLike ? '⌘K' : 'Ctrl K';

    const getRouteLabel = (pathname) => {
        if (!pathname) return 'Home';
        if (pathname === '/') return 'Home';
        if (pathname.startsWith('/map')) return 'Map';
        if (pathname.startsWith('/analytics')) return 'Analytics';
        if (pathname.startsWith('/hospitals')) return 'Hospitals';
        if (pathname.startsWith('/ambulances')) return 'Ambulances';
        if (pathname.startsWith('/doctors')) return 'Staff';
        if (pathname.startsWith('/visits')) return 'Visits';
        if (pathname.startsWith('/emergencies')) return 'Requests';
        if (pathname.startsWith('/verification')) return 'Approvals';
        if (pathname.startsWith('/users')) return 'Users';
        if (pathname.startsWith('/organizations')) return 'Organizations';
        if (pathname.startsWith('/settings')) return 'Settings';
        if (pathname.startsWith('/health-news')) return 'Health News';
        if (pathname.startsWith('/support-tickets')) return 'Support';
        if (pathname.startsWith('/insurance')) return 'Insurance';
        if (pathname.startsWith('/subscriptions')) return 'Subscriptions';
        if (pathname.startsWith('/wallet')) return 'Payments';
        if (pathname.startsWith('/pricing')) return 'Pricing';
        return 'Back';
    };

    return (
        <>
            <motion.header
                data-modal-chrome="true"
                initial={{ y: -100 }}
                animate={{
                    y: isScrolledDown ? -100 : 0,
                    opacity: isScrolledDown ? 0 : 1,
                    // Desktop offsets for the sidebar; mobile bar carries NO padding
                    // (alignment comes purely from left-4/right-4 = the px-4 content gutter).
                    paddingLeft: isMobile ? 0 : sidebarWidth,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                }}
                // Shared header chrome for route title, shell actions, and mobile account access.
                className={`fixed z-40 flex items-center justify-between transition-all duration-300 ${isMobile
                    ? 'top-2 left-4 right-4 h-11 pointer-events-auto bg-transparent'
                    : 'top-0 left-0 right-0 h-16 pointer-events-auto'
                    }`}
                style={{
                    paddingRight: isMobile ? '0px' : '32px',
                    paddingTop: isMobile ? '0' : '0',
                }}
            >
                {/* MOBILE: 3-column flex - left / center / right */}
                {isMobile ? (
                    <>
                        {/* LEFT - back button (flat: no wrapper container, sits directly in the bar) */}
                        {!isHome ? (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate(-1)}
                                className="max-w-[140px] inline-flex items-center gap-0.5 shrink-0 min-w-0 text-[13px] font-medium text-[hsl(var(--spark)/0.9)] truncate"
                                aria-label="Go back"
                            >
                                <ChevronLeft className="h-4 w-4 shrink-0" />
                                <span className="truncate">{getRouteLabel(previousPath)}</span>
                            </motion.button>
                        ) : (
                            <span className="shrink-0" aria-hidden="true" />
                        )}

                        {/* CENTER - logo or page title */}
                        {isHome ? (
                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-pill backdrop-blur-xl bg-[linear-gradient(135deg,hsl(var(--spark)/0.14),hsl(var(--primary)/0.08))] shadow-[0_4px_14px_-10px_hsl(var(--spark)/0.32)] pointer-events-none select-none">
                                <img src="/logo.png" alt="iVisit" className="h-4 w-4 object-contain opacity-90" />
                                <span className="text-[13px] font-semibold tracking-tight text-foreground/88 inline-flex items-center">
                                    iVisit
                                    <span className="text-primary leading-none">.</span>
                                </span>
                            </div>
                        ) : (
                            null
                        )}

                        {/* RIGHT - search, notifications, account */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="w-8 h-8 rounded-pill flex items-center justify-center transition-[color,background] duration-200 ease-out text-muted-foreground/75 hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                                aria-label="Search"
                                aria-expanded={searchOpen}
                                aria-haspopup="dialog"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <NotificationCenter />
                            <button
                                onClick={() => setMenuOpen(true)}
                                className="relative flex h-9 w-9 items-center justify-center rounded-icon bg-[hsl(var(--spark)/0.12)] text-[11px] font-semibold text-[hsl(var(--spark)/0.92)] transition-transform active:scale-95 overflow-hidden shrink-0"
                                aria-label="Open account menu"
                                aria-expanded={menuOpen}
                                aria-haspopup="dialog"
                            >
                                {avatarUrl && (
                                    <img
                                        src={avatarUrl}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                                <span aria-hidden="true">{avatarInitial}</span>
                            </button>
                        </div>
                    </>
                ) : (
                    /* DESKTOP layout */
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
                                <HeaderDivider />
                            )}
                            {headerConfig.actions && (
                                <div className="flex items-center gap-2">
                                    {headerConfig.actions}
                                </div>
                            )}
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="group relative flex items-center gap-2 overflow-hidden rounded-button bg-background/58 px-4 py-2 shadow-[0_14px_36px_-30px_hsl(var(--foreground)/0.55)] backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 ease-out hover:bg-background/76 active:scale-[0.98] lg:min-w-[200px]"
                                aria-label="Search"
                                aria-expanded={searchOpen}
                                aria-haspopup="dialog"
                            >
                                <Search className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-sm text-muted-foreground font-medium group-hover:text-foreground hidden lg:inline-block transition-colors">Search...</span>
                                <kbd className="ml-auto hidden lg:inline-flex items-center rounded-button bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{searchShortcutLabel}</kbd>
                            </button>
                            <HeaderDivider />
                            <NotificationCenter />
                            <HeaderDivider />
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={isContextPanelOpen ? closeContextPanel : openContextPanel}
                                            className={`flex items-center justify-center h-9 w-9 rounded-icon transition-all duration-300 ${isContextPanelOpen
                                                ? 'bg-primary/20 text-primary shadow-inner'
                                                : 'bg-primary/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                                }`}
                                            aria-label={isContextPanelOpen ? "Close quick actions panel" : "Open quick actions panel"}
                                            aria-expanded={isContextPanelOpen}
                                            aria-controls="quick-actions-panel"
                                            data-state={isContextPanelOpen ? 'open' : 'closed'}
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
                    className="w-[88%] max-w-[365px] p-0 bg-background/95 dark:bg-muted/70 backdrop-blur-sm rounded-r-sheet overflow-hidden shadow-2xl"
                >
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">
                        Open pages, quick actions, account, and theme controls.
                    </SheetDescription>
                    <MobileNavMenu onClose={() => setMenuOpen(false)} />
                </SheetContent>
            </Sheet>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
