'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const LayoutContext = createContext({
    isScrolledDown: false,
    sidebarExpanded: false,
    sidebarWidth: 72,
    toggleSidebar: () => {},
    headerConfig: { title: '', actions: null, viewToggle: null, filterSheet: null },
    footerConfig: { visible: false, content: null, type: 'status' },
    setHeaderConfig: () => { },
    setFooterConfig: () => { },
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }) => {
    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [headerConfig, setHeaderConfig] = useState({ title: '', actions: null, viewToggle: null, filterSheet: null });
    const [footerConfig, setFooterConfig] = useState({ visible: false, content: null, type: 'status', instanceId: null });

    const COLLAPSED_WIDTH = 72;
    const EXPANDED_WIDTH = 260;

    const sidebarWidth = useMemo(() => 
        sidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH
    , [sidebarExpanded]);

    const toggleSidebar = useCallback(() => {
        setSidebarExpanded(prev => !prev);
    }, []);

    // Scroll Observer
    useEffect(() => {
        const mainContent = document.getElementById('main-content');
        const handleScroll = () => {
            const scrolled = mainContent ? mainContent.scrollTop > 40 : window.scrollY > 40;
            setIsScrolledDown(scrolled);
        };

        const target = mainContent || window;
        target.addEventListener('scroll', handleScroll, { passive: true });
        return () => target.removeEventListener('scroll', handleScroll);
    }, []);

    // Safe setters that don't use JSON.stringify on React Elements
    const setHeaderConfigStable = useCallback((config) => {
        setHeaderConfig(prev => {
            const newConfig = typeof config === 'function' ? config(prev) : config;
            if (prev.title === newConfig.title) return prev; 
            return newConfig;
        });
    }, []);

    const setFooterConfigStable = useCallback((config) => {
        setFooterConfig(prev => {
            const newConfig = typeof config === 'function' ? config(prev) : config;
            if (prev.instanceId === newConfig.instanceId && prev.visible === newConfig.visible) return prev;
            return newConfig;
        });
    }, []);

    const value = useMemo(() => ({
        isScrolledDown,
        sidebarExpanded,
        sidebarWidth,
        toggleSidebar,
        headerConfig,
        setHeaderConfig: setHeaderConfigStable,
        footerConfig,
        setFooterConfig: setFooterConfigStable
    }), [isScrolledDown, sidebarExpanded, sidebarWidth, toggleSidebar, headerConfig, setHeaderConfigStable, footerConfig, setFooterConfigStable]);

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

// Hook for pages to register their header content
export const usePageHeader = (title, actions, viewToggle = null, filterSheet = null) => {
    const { setHeaderConfig } = useLayout();

    useEffect(() => {
        setHeaderConfig({ title, actions, viewToggle, filterSheet });
        return () => {
            setHeaderConfig(prev => {
                if (prev.title === title) return { title: '', actions: null, viewToggle: null, filterSheet: null };
                return prev;
            });
        };
    }, [title, actions, viewToggle, filterSheet, setHeaderConfig]);
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
