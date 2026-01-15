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
      className="fixed top-20 right-4 z-40"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSidebarOpen(true)}
        className="w-12 h-12 squircle-lg glass-strong shadow-premium bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center group"
      >
        <PanelRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
        <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />
      </motion.button>
    </motion.div>
  );
};
