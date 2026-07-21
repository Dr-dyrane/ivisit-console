import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useConsoleCopilot } from '../../features/copilot';
import { DesktopCopilotRail } from '../../features/copilot/variants/DesktopCopilotRail';
import { ContextPanel } from './ContextPanel';
import { useLayout } from '../../contexts/LayoutContext';
import { useFocusTrap } from '../ui/ModalShell';

const CONTEXT_PANEL_TERMINAL_ACTION = 'data-context-panel-terminal';

const useContextPanelInert = (active) => {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    // The panel is portaled outside #root, so the application can be inert
    // without making the active dialog itself unreachable.
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    const previousInert = appRoot.inert;
    const previousAriaHidden = appRoot.getAttribute('aria-hidden');

    appRoot.inert = true;
    appRoot.setAttribute('aria-hidden', 'true');

    return () => {
      appRoot.inert = previousInert;
      if (previousAriaHidden === null) {
        appRoot.removeAttribute('aria-hidden');
      } else {
        appRoot.setAttribute('aria-hidden', previousAriaHidden);
      }
    };
  }, [active]);
};

const useCloseContextPanelOnRouteChange = (active, closeContextPanel) => {
  const location = useLocation();
  const routeRef = useRef(`${location.pathname}${location.search}${location.hash}`);

  useEffect(() => {
    const nextRoute = `${location.pathname}${location.search}${location.hash}`;
    const didNavigate = routeRef.current !== nextRoute;
    routeRef.current = nextRoute;

    if (active && didNavigate) {
      closeContextPanel();
    }
  }, [active, closeContextPanel, location.hash, location.pathname, location.search]);
};

const useTerminalActionClose = (panelRef, active, closePanel) => {
  useEffect(() => {
    const panel = panelRef.current;
    if (!active || !panel) return undefined;

    const handleClick = (event) => {
      const actionTarget = event.target instanceof Element
        ? event.target.closest(`[${CONTEXT_PANEL_TERMINAL_ACTION}="true"]`)
        : null;
      const isUnavailableAction =
        actionTarget?.getAttribute('aria-disabled') === 'true' ||
        actionTarget?.getAttribute('data-state') === 'unavailable';

      if (actionTarget && !isUnavailableAction) closePanel();
    };

    panel.addEventListener('click', handleClick);
    return () => panel.removeEventListener('click', handleClick);
  }, [active, closePanel, panelRef]);
};

export const ContextPanelShell = () => {
  const { isDesktop, usesCompactNavigation } = useNavigation();
  const { isContextPanelOpen, closeContextPanel } = useLayout();
  const copilot = useConsoleCopilot();
  const panelRef = useRef(null);
  const isCopilotPanel = copilot.isOpen && isDesktop;
  const isPanelActive = (isContextPanelOpen || isCopilotPanel) && !usesCompactNavigation;
  const closePanel = isCopilotPanel ? copilot.closeCopilot : closeContextPanel;

  useContextPanelInert(isPanelActive);
  useFocusTrap(panelRef, isPanelActive, closePanel);
  useCloseContextPanelOnRouteChange(isPanelActive, closePanel);
  useTerminalActionClose(panelRef, isPanelActive, closePanel);

  // Keep the legacy explicit close event for route-owned panel content.
  useEffect(() => {
    const handleCloseEvent = () => {
      closePanel();
    };
    const handleModalOpened = () => {
      closePanel();
    };

    if (isPanelActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    window.addEventListener('closeContextPanel', handleCloseEvent);
    window.addEventListener('modal-opened', handleModalOpened);

    return () => {
      window.removeEventListener('closeContextPanel', handleCloseEvent);
      window.removeEventListener('modal-opened', handleModalOpened);
      document.body.style.overflow = '';
    };
  }, [isPanelActive, closePanel]);

  // Compact-window quick actions live in the avatar account sheet.
  if (usesCompactNavigation) {
    return null;
  }
  if (typeof document === 'undefined') return null;

  return createPortal(
    isPanelActive && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-35 bg-black/10 backdrop-blur-xs overflow-hidden"
            aria-hidden="true"
            onClick={closePanel}
          />


          {/* Context Panel */}
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            id="quick-actions-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className={`fixed top-4 bottom-4 left-auto right-4 z-40 flex flex-col ${isDesktop ? 'w-[320px]' : 'w-72'} rounded-sheet bg-background/92 shadow-[0_12px_32px_rgb(0_0_0/0.12)] backdrop-blur-xl dark:bg-background/86 overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-label="Quick actions panel"
            data-context-panel-shell="true"
            data-context-panel-mode={isCopilotPanel ? 'copilot' : 'route'}
          >
            <div className="h-full flex flex-col">
              {/* Content area - full height */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {isCopilotPanel ? (
                  <DesktopCopilotRail
                    isOpen={copilot.isOpen}
                    onClose={copilot.closeCopilot}
                    proposal={copilot.proposal}
                      isPreparing={copilot.isPreparing}
                      error={copilot.error}
                      onRetry={copilot.retryCopilot}
                      pendingAction={copilot.pendingAction}
                      isExecuting={copilot.isExecuting}
                      executionError={copilot.executionError}
                      onPrepareAction={copilot.prepareCopilotAction}
                      onCancelAction={copilot.cancelCopilotAction}
                      onConfirmAction={copilot.confirmCopilotAction}
                      className="p-4"
                  />
                ) : (
                  <ContextPanel />
                )}
              </div>
            </div>
          </motion.aside>
        </>
    ),
    document.body,
  );
};
