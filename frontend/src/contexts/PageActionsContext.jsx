import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * PageActionsContext coordinates page-level primary actions.
 *
 * Pages register a primary action (e.g. "New Doctor") via `registerPageAction`.
 * Navigation shells read it via `pageAction`.
 * Registration is cleared when the component unmounts (or calls the returned cleanup).
 *
 * Replaces the `window.dispatchEvent(new CustomEvent('openCreateModal'))` pattern
 * that was used for cross-component communication between pages and the nav shell.
 *
 * Usage in a page component:
 *
 *   const { registerPageAction } = usePageActions();
 *   useEffect(() => {
 *     return registerPageAction({
 *       label: 'New Doctor',
 *       icon: Stethoscope,
 *       action: () => setCreateOpen(true),
 *       color: 'primary',          // optional, used by ContextAwareFAB gradient
 *       route: '/doctors',         // required when a mobile dock consumes the action
 *     });
 *   }, []);
 *
 * Usage in a shell component:
 *
 *   const { pageAction } = usePageActions();
 *   // pageAction is null when no page has registered, or the current page's action object.
 */

const PageActionsContext = createContext(null);

export const PageActionsProvider = ({ children }) => {
    const [pageAction, setPageAction] = useState(null);
    // Keep a generation counter so that a stale cleanup cannot clear a newer registration.
    const generationRef = useRef(0);

    /**
     * Register the current page's primary action.
     *
     * @param {{ label: string, icon?: React.ComponentType, action: function, color?: string, route?: string }} config
     * @returns {function} cleanup; call or return from useEffect to unregister
     */
    const registerPageAction = useCallback((config) => {
        const generation = ++generationRef.current;
        setPageAction(config);
        return () => {
            // Only clear if this registration is still the current one
            setPageAction((prev) => {
                if (generationRef.current === generation) return null;
                return prev;
            });
        };
    }, []);

    /**
     * Imperatively clear the current page action.
     * Useful when a page conditionally hides its FAB.
     */
    const clearPageAction = useCallback(() => {
        generationRef.current++;
        setPageAction(null);
    }, []);

    return (
        <PageActionsContext.Provider value={{ pageAction, registerPageAction, clearPageAction }}>
            {children}
        </PageActionsContext.Provider>
    );
};

/**
 * @returns {{ pageAction: object|null, registerPageAction: function, clearPageAction: function }}
 */
export const usePageActions = () => {
    const ctx = useContext(PageActionsContext);
    if (!ctx) throw new Error('usePageActions must be used inside PageActionsProvider');
    return ctx;
};

export default PageActionsProvider;
