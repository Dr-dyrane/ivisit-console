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
            // Target the specific scrollable element
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                const scrolled = mainContent.scrollTop > 50;
                setIsScrolledDown(scrolled);
            } else {
                // Fallback to window if main-content not found (legacy layout)
                const scrolled = window.scrollY > 50;
                setIsScrolledDown(scrolled);
            }
        };

        // Attach to main-content if it exists, otherwise window (fallback)
        // We use a small timeout to ensure DOM is ready if needed, or retry
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll, { passive: true });
        } else {
            window.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            } else {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const value = React.useMemo(() => ({
        isScrolledDown,
        headerConfig,
        setHeaderConfig,
        layoutMode,
        setLayoutMode
    }), [isScrolledDown, headerConfig, layoutMode]);

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

// Hook for pages to register their header content
export const usePageHeader = (title, actions) => {
    const { setHeaderConfig, headerConfig } = useLayout();

    useEffect(() => {
        // Only update if something actually changed to avoid infinite loops
        if (headerConfig.title !== title || headerConfig.actions !== actions) {
            setHeaderConfig({ title, actions });
        }
    }, [title, actions, setHeaderConfig, headerConfig.title, headerConfig.actions]);

    // Optional: Clear on unmount if we want to ensure stale headers don't persist
    useEffect(() => {
        return () => {
            setHeaderConfig(prev => {
                // Only clear if we are still the one who set it
                if (prev.title === title) {
                    return { title: '', actions: null };
                }
                return prev;
            });
        };
    }, [title, setHeaderConfig]);
};
