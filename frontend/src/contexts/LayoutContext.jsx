import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LayoutContext = createContext({
    isScrolledDown: false,
    headerConfig: { title: '', actions: null },
    setHeaderConfig: () => { },
    layoutMode: 'standard' // 'standard' | 'immersive'
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }) => {
    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [headerConfig, setHeaderConfig] = useState({ title: '', actions: null });
    const [layoutMode, setLayoutMode] = useState('standard');

    useEffect(() => {
        const handleScroll = () => {
            // Threshold can be adjusted. 50px is enough to clear the initial header area.
            const scrolled = window.scrollY > 50;
            setIsScrolledDown(scrolled);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const value = {
        isScrolledDown,
        headerConfig,
        setHeaderConfig,
        layoutMode,
        setLayoutMode
    };

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

// Hook for pages to register their header content
export const usePageHeader = (title, actions) => {
    const { setHeaderConfig } = useLayout();

    useEffect(() => {
        setHeaderConfig({ title, actions });

        // Cleanup on unmount - optional, might want to keep last title or clear it
        return () => setHeaderConfig(prev => ({ ...prev, actions: null }));
    }, [title, actions, setHeaderConfig]);
};
