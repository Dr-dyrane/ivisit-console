import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ContextPanel } from './ContextPanel';
import { X } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';
import NoiseOverlay from '../ui/noise-overlay';

export const ContextPanelShell = () => {
  const { isMobile, isTablet, isDesktop } = useNavigation();
  const { isContextPanelOpen, closeContextPanel, isFocusMode, isScrolledDown } = useLayout();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isContextPanelOpen) {
        closeContextPanel();
      }
    };

    if (isContextPanelOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
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
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={closeContextPanel}
          />

          {/* Context Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className={`fixed top-0 bottom-0 right-0 z-50 flex flex-col ${isDesktop ? 'w-[320px]' : 'w-72'} backdrop-blur-xl  border-black/10 dark:border-white/10 ${isScrolledDown ? 'bg-background/80' : 'bg-background/40'
              }`}
            style={{
              boxShadow: '-4px 0 24px rgba(0,0,0,0.1)'
            }}
          >
            <NoiseOverlay />
            <div className="h-full flex flex-col relative">
              {/* Close button positioned at top-right */}
              <button
                onClick={closeContextPanel}
                className="absolute top-4 right-4 w-10 h-10 geo-round bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group shadow-premium z-10"
              >
                <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Content area - full height except for close button space */}
              <div
                className="flex-1 overflow-y-auto scrollbar-hide pt-16 border-border/20"
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
