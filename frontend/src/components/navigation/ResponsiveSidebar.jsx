import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ContextPanel } from './ContextPanel';
import { X, ChevronLeft, Heart, Sparkles } from 'lucide-react';

export const ResponsiveSidebar = () => {
  const { isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen } = useNavigation();

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Subtle overlay for tablet */}
          {isTablet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.1) 100%)' }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* True Floating Island */}
          <motion.div
            initial={{ 
              x: '100%', 
              scale: 0.8,
              opacity: 0 
            }}
            animate={{ 
              x: 0, 
              scale: 1,
              opacity: 1 
            }}
            exit={{ 
              x: '100%', 
              scale: 0.8,
              opacity: 0 
            }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              mass: 0.8
            }}
            className={`fixed top-12 bottom-12 right-8 z-50 ${
              isDesktop ? 'w-80' : 'w-72'
            }`}
            style={{
              // Water bubble effect with more transparency
              background: 'hsl(var(--background) / 0.75)',
              backdropFilter: 'blur(32px) saturate(200%)',
              borderRadius: '32px',
              boxShadow: `
                0 30px 60px rgba(0, 0, 0, 0.25),
                0 12px 24px rgba(0, 0, 0, 0.15),
                0 4px 8px rgba(0, 0, 0, 0.08),
                inset 0 0 0 1px rgba(255, 255, 255, 0.15)
              `,
              border: 'none',
            }}
          >
            {/* Island Content */}
            <div className="h-full flex flex-col">
              {/* Header with depth differential */}
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center shadow-sm">
                    <div className="w-4 h-0.5 bg-primary rounded-full" />
                  </div>
                  <h2 className="font-black text-lg tracking-tight">Context Panel</h2>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-10 h-10 geo-round bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group shadow-sm"
                >
                  {isDesktop ? <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />}
                </button>
              </div>

              {/* Content with subtle depth */}
              <div className="flex-1 overflow-y-auto p-4">
                <ContextPanel />
              </div>

              {/* Bottom accent with depth */}
              <div className="p-4">
                <div 
                  className="w-full h-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent rounded-full"
                  style={{
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
