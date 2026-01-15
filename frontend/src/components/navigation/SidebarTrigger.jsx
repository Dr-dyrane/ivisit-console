import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { PanelRight } from 'lucide-react';

export const SidebarTrigger = () => {
  const { isMobile, isTablet, sidebarOpen, setSidebarOpen } = useNavigation();

  // Only show on tablet when sidebar is closed
  if (!isTablet || sidebarOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed top-24 right-6 z-40"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSidebarOpen(true)}
        className="w-14 h-14 geo-round shadow-premium transition-all duration-300 flex items-center justify-center group"
        style={{
          // Water bubble effect matching sidebar
          background: 'hsl(var(--background) / 0.75)',
          backdropFilter: 'blur(32px) saturate(200%)',
          boxShadow: `
            0 8px 16px rgba(0, 0, 0, 0.15),
            0 2px 4px rgba(0, 0, 0, 0.08),
            inset 0 0 0 1px rgba(255, 255, 255, 0.15)
          `,
          border: 'none',
        }}
      >
        <PanelRight className="h-6 w-6 text-primary group-hover:translate-x-0.5 transition-transform" />
        <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse opacity-50" />
      </motion.button>
    </motion.div>
  );
};
