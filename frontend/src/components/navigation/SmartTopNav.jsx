import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { BentoBreadcrumbs } from './BentoBreadcrumbs';
import { QuickSearch } from './QuickSearch';
import { NotificationCenter } from '../common/NotificationCenter';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';

export const SmartTopNav = () => {
    const { isMobile } = useNavigation();
    const [searchOpen, setSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isMobile) return null; // Top Nav is hidden on mobile, effectively (or simplified)

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-between px-8 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
                    }`}
                style={{ paddingLeft: '80px' }} // Account for Left Rail
            >
                <div className="flex items-center gap-4">
                    <BentoBreadcrumbs />
                </div>

                <div className="flex items-center gap-3">
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
            </header>

            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
