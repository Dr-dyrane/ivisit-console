import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LayoutContext = createContext({
    isScrolledDown: false,
    headerConfig: { title: '', actions: null },
    footerConfig: { visible: false, content: null, type: 'status' },
    setHeaderConfig: () => { },
    setFooterConfig: () => { },
    layoutMode: 'standard' // 'standard' | 'immersive'
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }) => {
    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [headerConfig, setHeaderConfig] = useState({ title: '', actions: null });
    const [footerConfig, setFooterConfig] = useState({ visible: false, content: null, type: 'status' });
    const [layoutMode, setLayoutMode] = useState('standard');

    useEffect(() => {
        const handleScroll = () => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                const scrolled = mainContent.scrollTop > 80; // Stable threshold
                setIsScrolledDown(scrolled);
            } else {
                const scrolled = window.scrollY > 80;
                setIsScrolledDown(scrolled);
            }
        };

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll, { passive: true });
        } else {
            window.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            } else {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const setHeaderConfigStable = useCallback((config) => {
        setHeaderConfig(prev => {
            // Functional update to avoid dependencies
            const newConfig = typeof config === 'function' ? config(prev) : config;
            if (prev.title === newConfig.title && prev.actions === newConfig.actions) return prev;
            return newConfig;
        });
    }, []);

    const setFooterConfigStable = useCallback((config) => {
        setFooterConfig(prev => {
            const newConfig = typeof config === 'function' ? config(prev) : config;
            // Prevent identical updates
            if (
                prev.visible === newConfig.visible &&
                prev.type === newConfig.type &&
                prev.content === newConfig.content &&
                prev.instanceId === newConfig.instanceId
            ) return prev;
            return newConfig;
        });
    }, []);

    const value = React.useMemo(() => ({
        isScrolledDown,
        headerConfig,
        setHeaderConfig: setHeaderConfigStable,
        footerConfig,
        setFooterConfig: setFooterConfigStable,
        layoutMode,
        setLayoutMode
    }), [isScrolledDown, headerConfig, setHeaderConfigStable, footerConfig, setFooterConfigStable, layoutMode]);

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
        return () => {
            setHeaderConfig(prev => {
                if (prev.title === title) return { title: '', actions: null };
                return prev;
            });
        };
    }, [title, actions, setHeaderConfig]);
};

// Hook for pages to register their footer content
export const usePageFooter = (content, type = 'status', visible = true) => {
    const { setFooterConfig } = useLayout();
    const instanceId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);

    useEffect(() => {
        if (!visible) {
            setFooterConfig(prev => {
                if (prev.instanceId === instanceId) return { visible: false, content: null, type: 'status' };
                return prev;
            });
            return;
        }

        setFooterConfig({ content, type, visible: true, instanceId });

        return () => {
            setFooterConfig(prev => {
                if (prev.instanceId === instanceId) return { visible: false, content: null, type: 'status' };
                return prev;
            });
        };
    }, [content, type, visible, setFooterConfig, instanceId]);
};
