import React, { useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { BentoBreadcrumbs } from './BentoBreadcrumbs';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from './NotificationCenter';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SmartHeader = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown, headerConfig } = useLayout();
    const [searchOpen, setSearchOpen] = useState(false);

    if (isMobile) return null;

    return (
        <>
            <motion.header
                initial={{ y: 0 }}
                animate={{
                    y: isScrolledDown ? -100 : 0,
                    opacity: isScrolledDown ? 0 : 1
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-between px-8 bg-background/80 backdrop-blur-xl border-b border-white/5"
                style={{ paddingLeft: '80px', paddingRight: '24px' }} // Account for Left Rail
            >
                <div className="flex items-center gap-4">
                    {/* Logo - Added based on user request */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex-shrink-0"
                    >
                        <div className="w-10 h-10 squircle bg-primary/10 flex items-center justify-center shadow-inner">
                            <img src="/logo.png" alt="iVisit" className="w-5 h-5 object-contain" />
                        </div>
                    </motion.div>

                    <BentoBreadcrumbs />

                    {/* Divider */}
                    {headerConfig.title && (
                        <div className="h-4 w-px bg-white/10 mx-2" />
                    )}

                    {/* Page Title */}
                    <AnimatePresence mode="wait">
                        {headerConfig.title && (
                            <motion.h1
                                key={headerConfig.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-lg font-bold tracking-tight text-foreground/90 truncate max-w-[300px]"
                            >
                                {headerConfig.title}
                            </motion.h1>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-3">
                    {/* Page Actions (Injected via Portal/Context) */}
                    {headerConfig.actions && (
                        <div className="flex items-center gap-2 mr-4">
                            {headerConfig.actions}
                        </div>
                    )}

                    {/* Quick Search Trigger */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group lg:min-w-[200px]"
                    >
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground hidden lg:inline-block">Search...</span>
                        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/20 px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto opacity-50">
                            ⌘K
                        </kbd>
                    </button>

                    <div className="w-px h-6 bg-white/10" />

                    {/* Notifications */}
                    <NotificationCenter />
                </div>
            </motion.header>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
