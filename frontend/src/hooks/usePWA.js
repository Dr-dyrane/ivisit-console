/**
 * @fileoverview usePWA - Progressive Web App management hook
 * 
 * @description
 * Hook for managing PWA features:
 * - Installation prompt detection and triggering
 * - Online/offline status monitoring
 * - Service worker update detection and application
 * 
 * @features
 * - canInstall: Whether PWA install prompt is available
 * - isInstalled: Whether app is running as installed PWA
 * - isOnline: Current network status
 * - updateAvailable: Whether a new version is ready
 * 
 * @usage
 * const { canInstall, promptInstall, isOnline, updateAvailable, applyUpdate } = usePWA();
 * 
 * @rollback
 * To revert: git checkout HEAD~1 -- src/hooks/usePWA.js
 * 
 * @author iVisit Console Team
 * @version 1.0.0
 * @since 2026-02-02
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * usePWA - Progressive Web App management hook
 * 
 * @returns {Object} PWA state and actions
 * @returns {boolean} canInstall - Whether install prompt is available
 * @returns {boolean} isInstalled - Whether running as PWA
 * @returns {Function} promptInstall - Trigger install prompt
 * @returns {boolean} isOnline - Network status
 * @returns {boolean} updateAvailable - New version ready
 * @returns {Function} applyUpdate - Apply pending update
 * @returns {Function} dismissUpdate - Dismiss update notification
 */
export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState(null);

    // Handle beforeinstallprompt event
    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setIsInstalled(true);
            // Track installation
            if (window.posthog) {
                window.posthog.capture('pwa_installed');
            }
        };

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Handle online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Handle service worker updates
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                                setWaitingWorker(newWorker);
                            }
                        });
                    }
                });
            });

            // Listen for controller change (after update applied)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, []);

    // Prompt installation
    const promptInstall = useCallback(async () => {
        if (!installPrompt) return false;

        try {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;

            // Track choice
            if (window.posthog) {
                window.posthog.capture('pwa_install_prompt_response', { outcome });
            }

            if (outcome === 'accepted') {
                setInstallPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Install prompt error:', error);
            return false;
        }
    }, [installPrompt]);

    // Apply pending update
    const applyUpdate = useCallback(() => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    }, [waitingWorker]);

    // Dismiss update notification
    const dismissUpdate = useCallback(() => {
        setUpdateAvailable(false);
    }, []);

    return {
        // Installation
        canInstall: !!installPrompt && !isInstalled,
        isInstalled,
        promptInstall,

        // Network
        isOnline,

        // Updates
        updateAvailable,
        applyUpdate,
        dismissUpdate
    };
};

export default usePWA;
