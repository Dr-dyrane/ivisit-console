import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export const IslandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/verification', icon: FileCheck, label: 'Queue' },
    { path: '/analytics', icon: TrendingUp, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop - Top Right Island */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex fixed top-6 right-6 z-50 glass shadow-premium px-3 py-2 squircle-lg gap-2"
      >
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative px-4 py-2.5 squircle transition-all duration-300 ${
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'hover:bg-muted/50'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {isActive(item.path) && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary squircle -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Mobile - Bottom Pill */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass shadow-premium px-4 py-3 squircle-lg flex gap-1"
      >
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative px-4 py-2.5 squircle transition-all duration-300 flex flex-col items-center gap-1 ${
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'hover:bg-muted/50'
            }`}
          >
            <item.icon className={`${isActive(item.path) ? 'h-5 w-5' : 'h-4 w-4'} transition-all`} />
            <span className={`text-[10px] font-bold transition-all ${
              isActive(item.path) ? 'opacity-100' : 'opacity-60'
            }`}>
              {item.label}
            </span>
            {isActive(item.path) && (
              <motion.div
                layoutId="activeTabMobile"
                className="absolute inset-0 bg-primary squircle -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </motion.div>
    </>
  );
};
