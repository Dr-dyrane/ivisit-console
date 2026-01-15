import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ContextPanel } from './ContextPanel';
import { X, ChevronLeft } from 'lucide-react';

export const ResponsiveSidebar = () => {
  const { isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen } = useNavigation();

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Overlay for tablet */}
          {isTablet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className={`fixed top-0 right-0 h-full bg-background border-l border-border z-50 ${
              isDesktop ? 'w-80' : 'w-72'
            }`}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-black text-lg">Context Panel</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {isDesktop ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <ContextPanel />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
