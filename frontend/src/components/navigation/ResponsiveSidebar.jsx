import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePageData } from '../../contexts/PageDataContext';
import { ContextPanel } from './ContextPanel';
import { DynamicBottomBar } from './DynamicBottomBar';
import { X, ChevronLeft, AlertTriangle, Users, BarChart3, Stethoscope, Calendar, Shield, Hospital, Ambulance, Newspaper, Headphones } from 'lucide-react';

import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';

export const ResponsiveSidebar = () => {
  const { isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen } = useNavigation();
  const { emergencyData, verificationData, analyticsData, doctorsData, visitsData, getEmergencyStats } = usePageData();
  const { isScrolledDown } = useLayout();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showExpandedPanel, setShowExpandedPanel] = useState(false);

  // Mobile: Handled by DynamicBottomBar
  if (isMobile) {
    return <DynamicBottomBar />;
  }

  // Get status counts for badges
  const emergencyStats = getEmergencyStats();

  const iconRailItems = [
    {
      icon: AlertTriangle,
      path: '/emergencies',
      badge: emergencyStats.critical + emergencyStats.pending,
      color: 'destructive',
      pulse: emergencyStats.critical > 0
    },
    {
      icon: Shield,
      path: '/verification',
      badge: verificationData.pending,
      color: 'warning',
      pulse: verificationData.pending > 0
    },
    {
      icon: BarChart3,
      path: '/analytics',
      badge: null,
      color: 'primary'
    },
    {
      icon: Stethoscope,
      path: '/doctors',
      badge: doctorsData.onCall,
      color: 'success',
      pulse: doctorsData.onCall > 0
    },
    {
      icon: Calendar,
      path: '/visits',
      badge: visitsData.today,
      color: 'primary'
    },
    {
      icon: Hospital,
      path: '/hospitals',
      badge: analyticsData.activeHospitals,
      color: 'info'
    },
    {
      icon: Ambulance,
      path: '/ambulances',
      badge: analyticsData.availableAmbulances,
      color: 'warning'
    },
    {
      icon: Newspaper,
      path: '/health-news',
      badge: null,
      color: 'muted'
    },
    {
      icon: Headphones,
      path: '/support-tickets',
      badge: null,
      color: 'muted'
    },
    {
      icon: Users,
      path: '/users',
      badge: null,
      color: 'muted'
    },
  ];

  /* 
     DESKTOP & TABLET LOGIC
     - Desktop: Always show Floating Sidebar (if sidebarOpen is usually true).
     - Tablet:
        - If !sidebarOpen: Show Icon Rail.
        - If sidebarOpen: Show Floating Sidebar (Overlay).
  */

  return (
    <>
      <AnimatePresence mode="wait">
        {/* CASE 1: Icon Rail (Tablet Only when closed) */}
        {isTablet && !sidebarOpen && (
          <motion.div
            key="icon-rail"
            initial={{ x: '100%', opacity: 0 }}
            animate={{
              x: isScrolledDown ? '120%' : 0,
              opacity: isScrolledDown ? 0 : 1
            }}
            whileHover={{ x: 0, opacity: 1 }} // Peek on hover
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-24 bottom-24 right-4 w-16 z-30 flex flex-col items-center gap-3 py-4 rounded-full border border-white/10"
            style={{
              background: 'hsl(var(--background) / 0.8)',
              backdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
            onClick={() => setSidebarOpen(true)} // Open full sidebar on click
          >
            {iconRailItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.1, backgroundColor: `hsl(var(--${item.color}) / 0.2)` }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSidebarOpen(true)}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: `hsl(var(--${item.color}))` }}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* CASE 2: Floating Sidebar (Desktop or Open Tablet) */}
        {(isDesktop || (isTablet && sidebarOpen)) && (
          <>
            {/* Tablet Overlay */}
            {isTablet && sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <motion.div
              key="sidebar-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{
                x: isScrolledDown && isDesktop ? '100%' : 0,
                opacity: isScrolledDown && isDesktop ? 0 : 1
              }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className={`fixed top-0 bottom-0 right-0 z-40 ${isDesktop ? 'w-[320px]' : 'w-72 shadow-2xl'}`}
              style={{
                background: isDark ? 'hsl(var(--background) / 0.4)' : 'hsl(var(--background) / 0.6)',
                backdropFilter: 'blur(32px) saturate(200%)',
                boxShadow: 'none',
              }}
            >
              <div className="h-full flex flex-col">
                {/* Unified Space at the top to clear header */}
                <div className="h-16 flex-shrink-0" />

                <div className="flex items-center justify-between p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 squircle-lg bg-primary/10 flex items-center justify-center shadow-inner">
                      <div className="w-4 h-0.5 bg-primary rounded-full" />
                    </div>
                    <h2 className="font-black text-lg tracking-tight uppercase">Context Panel</h2>
                  </div>
                  {!isDesktop && (
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="w-10 h-10 geo-round bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group shadow-sm"
                    >
                      <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  <ContextPanel />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
