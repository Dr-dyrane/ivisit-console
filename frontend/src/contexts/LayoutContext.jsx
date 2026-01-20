'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const LayoutContext = createContext({
    isScrolledDown: false,
    sidebarMode: 'smart',
    sidebarWidth: 72,
    toggleSidebar: () => { },
    setSidebarMode: () => { },
    isContextPanelOpen: false,
    contextMode: 'overlay',
    isFocusMode: false,
    openContextPanel: () => { },
    closeContextPanel: () => { },
    headerConfig: { title: '', actions: null, viewToggle: null, filterSheet: null },
    footerConfig: { visible: false, content: null, type: 'status' },
    setHeaderConfig: () => { },
    setFooterConfig: () => { },
});

export const useLayout = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }) => {
    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [sidebarMode, setSidebarMode] = useState('smart');
    const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
    const [contextMode, setContextMode] = useState('overlay');
    const [headerConfig, setHeaderConfig] = useState({ title: '', actions: null, viewToggle: null, filterSheet: null });
    const [footerConfig, setFooterConfig] = useState({ visible: false, content: null, type: 'status', instanceId: null });

    const COLLAPSED_WIDTH = 72;
    const EXPANDED_WIDTH = 260;

    const sidebarWidth = useMemo(() =>
        sidebarMode === 'expanded' ? EXPANDED_WIDTH : COLLAPSED_WIDTH
        , [sidebarMode]);

    const toggleSidebar = useCallback(() => {
        setSidebarMode(prev => prev === 'expanded' ? 'smart' : 'expanded');
    }, []);

    const openContextPanel = useCallback(() => {
        setIsContextPanelOpen(true);
    }, []);

    const closeContextPanel = useCallback(() => {
        setIsContextPanelOpen(false);
    }, []);

    const isFocusMode = useMemo(() => isContextPanelOpen, [isContextPanelOpen]);

    const location = useLocation();

    // Auto-close context panel on route change or Modal open
    useEffect(() => {
        setIsContextPanelOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleModalOpen = () => setIsContextPanelOpen(false);
        window.addEventListener('modal-opened', handleModalOpen);
        window.addEventListener('openUserModal', handleModalOpen); // Also catch the specific user modal trigger

        return () => {
            window.removeEventListener('modal-opened', handleModalOpen);
            window.removeEventListener('openUserModal', handleModalOpen);
        };
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
        sidebarMode,
        setSidebarMode,
        sidebarWidth,
        toggleSidebar,
        isContextPanelOpen,
        contextMode,
        isFocusMode,
        openContextPanel,
        closeContextPanel,
        headerConfig,
        setHeaderConfig: setHeaderConfigStable,
        footerConfig,
        setFooterConfig: setFooterConfigStable
    }), [isScrolledDown, sidebarMode, setSidebarMode, sidebarWidth, toggleSidebar, isContextPanelOpen, contextMode, isFocusMode, openContextPanel, closeContextPanel, headerConfig, setHeaderConfigStable, footerConfig, setFooterConfigStable]);

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
