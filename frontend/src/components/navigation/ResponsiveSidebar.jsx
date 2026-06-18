import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ContextPanel } from './ContextPanel';
import { X } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';


export const ContextPanelShell = () => {
  const { isMobile, isTablet, isDesktop } = useNavigation();
  const { isContextPanelOpen, closeContextPanel, isFocusMode, isScrolledDown } = useLayout();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Handle escape key and custom events to close panel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isContextPanelOpen) {
        closeContextPanel();
      }
    };

    const handleCloseEvent = (e) => {
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

  // Mobile: Don't render context panel (future: full-screen modal)
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
            onClick={closeContextPanel}
          />


          {/* Context Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className={`fixed top-4 bottom-4 left-auto right-0 z-40 flex flex-col ${isDesktop ? 'w-[320px]' : 'w-72'} rounded-3xl backdrop-blur-sm bg-transparent border-none overflow-hidden`}
            style={{
              border: 'none !important',
              borderWidth: '0 !important',
              borderColor: 'transparent !important'
            }}
          >      {/* Simple Static Dot Grid - Apple-level simplicity */}
            
            <div className="h-full flex flex-col">
              {/* Content area - full height */}
              <div
                className="flex-1 overflow-y-auto scrollbar-hide"
                onClick={(e) => {
                  // If clicking a button or link inside the panel, close it
                  if (e.target.closest('button') || e.target.closest('a')) {
                    // Slight delay to allow the action to fire first
                    setTimeout(closeContextPanel, 150);
                  }
                }}
              >
                <ContextPanel />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
