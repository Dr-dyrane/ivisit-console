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

    return (
        <>
            <motion.header
                initial={{ y: -100 }}
                animate={{
                    y: isScrolledDown ? -100 : 0,
                    opacity: isScrolledDown ? 0 : 1
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`fixed z-40 h-16 flex items-center justify-between transition-all duration-300 ${isMobile
                    ? 'top-2 left-2 right-2 squircle-2xl bg-background/90 backdrop-blur-2xl border border-white/10 shadow-premium'
                    : isScrolledDown
                        ? 'top-0 left-0 right-0 bg-background/80 backdrop-blur-2xl shadow-lg'
                        : 'top-0 left-0 right-0 bg-background/40 backdrop-blur-md'
                    }`}
                style={{
                    paddingLeft: '0px',
                    paddingRight: '12px'
                }}
            >
                <div className="flex items-center gap-2 md:gap-0 overflow-hidden h-full">
                    {/* Integrated Logo Zone - Exactly matches dock width (72px) */}
                    <div className="w-[72px] h-full flex items-center justify-center flex-shrink-0">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => window.location.href = '/'}
                        >
                            <div className="w-10 h-10 squircle bg-primary/10 flex items-center justify-center shadow-inner group hover:bg-primary/20 transition-all">
                                <img src="/logo.png" alt="iVisit" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" />
                            </div>
                        </motion.div>
                    </div>

                    {!isMobile && (
                        <div className="flex items-center gap-4 ml-2">
                            <BentoBreadcrumbs />
                            {headerConfig.title && (
                                <div className="h-4 w-px bg-white/10 mx-2" />
                            )}
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
                    {/* Page Actions */}
                    {headerConfig.actions && (
                        <div className="flex items-center gap-2">
                            {headerConfig.actions}
                        </div>
                    )}

                    {/* Quick Search - Hidden on tiny mobile if actions take too much space */}
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
                        </>
                    )}
                </div>
            </motion.header>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
