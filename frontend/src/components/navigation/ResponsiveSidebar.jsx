import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ContextPanel } from './ContextPanel';
import { useLayout } from '../../contexts/LayoutContext';


export const ContextPanelShell = () => {
  const { isMobile, isDesktop } = useNavigation();
  const { isContextPanelOpen, closeContextPanel } = useLayout();

  // Handle escape key and custom events to close panel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isContextPanelOpen) {
        closeContextPanel();
      }
    };

    const handleCloseEvent = () => {
      closeContextPanel();
    };

    // Prevent body scroll when panel is open
    if (isContextPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('closeContextPanel', handleCloseEvent);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('closeContextPanel', handleCloseEvent);
      document.body.style.overflow = '';
    };
  }, [isContextPanelOpen, closeContextPanel]);

  // Mobile quick actions live in the avatar account sheet.
  if (isMobile) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isContextPanelOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-35 bg-black/10 backdrop-blur-xs overflow-hidden"
            aria-hidden="true"
            onClick={closeContextPanel}
          />


          {/* Context Panel */}
          <motion.aside
            id="quick-actions-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className={`fixed top-4 bottom-4 left-auto right-4 z-40 flex flex-col ${isDesktop ? 'w-[320px]' : 'w-72'} rounded-sheet bg-background/92 shadow-[0_12px_32px_rgb(0_0_0/0.12)] backdrop-blur-xl dark:bg-background/86 overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-label="Quick actions panel"
            data-context-panel-shell="true"
          >
            <div className="h-full flex flex-col">
              {/* Content area - full height */}
              <div
                className="flex-1 overflow-y-auto scrollbar-hide"
                onClick={(e) => {
                  const actionTarget = e.target.closest('button, a');
                  const isUnavailableAction =
                    actionTarget?.getAttribute('aria-disabled') === 'true' ||
                    actionTarget?.getAttribute('data-state') === 'unavailable';

                  if (actionTarget && !isUnavailableAction) {
                    // Slight delay to allow the action to fire first
                    setTimeout(closeContextPanel, 150);
                  }
                }}
              >
                <ContextPanel />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
