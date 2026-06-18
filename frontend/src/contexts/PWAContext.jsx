'use client';

import React, { createContext, useContext } from 'react';
import { usePWA } from '../hooks/usePWA';
import { InstallPrompt, OfflineIndicator, UpdateNotification } from '../components/pwa';

// Create PWA Context
const PWAContext = createContext(null);

// Custom hook to access PWA context
export const usePWAContext = () => {
    const context = useContext(PWAContext);
    if (!context) {
        throw new Error('usePWAContext must be used within PWAProvider');
    }
    return context;
};

/**
 * PWAProvider - Provides PWA functionality throughout the app
 * Wraps the application with install prompts, offline indicators, and update notifications
 */
export const PWAProvider = ({ children }) => {
    const pwa = usePWA();

    return (
        <PWAContext.Provider value={pwa}>
            {/* Offline Indicator - Always at top */}
            <OfflineIndicator isOnline={pwa.isOnline} />

            {/* App Content */}
            {children}

            {/* Install Prompt - Bottom of screen */}
            <InstallPrompt
                canInstall={pwa.canInstall}
                onInstall={pwa.promptInstall}
                onDismiss={() => { }}
            />

            {/* Update Notification - Top right */}
            <UpdateNotification
                isVisible={pwa.updateAvailable}
                onUpdate={pwa.applyUpdate}
                onDismiss={pwa.dismissUpdate}
            />
        </PWAContext.Provider>
    );
};

export default PWAProvider;
