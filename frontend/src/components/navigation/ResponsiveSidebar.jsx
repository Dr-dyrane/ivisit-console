import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePageData } from '../../contexts/PageDataContext';
import { ContextPanel } from './ContextPanel';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { X, ChevronLeft, Heart, Sparkles, AlertTriangle, Users, Activity, Stethoscope, Calendar, Shield, Hospital, Ambulance, Settings, BarChart3, Menu } from 'lucide-react';

export const ResponsiveSidebar = () => {
  const { isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen } = useNavigation();
  const { emergencyData, verificationData, analyticsData, doctorsData, visitsData, getEmergencyStats } = usePageData();
  const [showExpandedPanel, setShowExpandedPanel] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Mobile: Bottom sheet only
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetOverlay className="bg-black/50" />
          <SheetContent 
            side="bottom" 
            className="h-[85vh] max-h-[600px] rounded-t-3xl border-0 bg-background/95 backdrop-blur-xl"
            style={{
              background: 'hsl(var(--background) / 0.98)',
              backdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-black text-lg tracking-tight">Context</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Quick Access</p>
              </div>
              {/* Close button removed - Sheet has built-in close */}
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <ContextPanel />
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Mobile FAB trigger - OUTSIDE of Sheet */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMobileSheetOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 geo-round bg-primary text-primary-foreground shadow-premium z-40 flex items-center justify-center"
          style={{
            boxShadow: `
              0 10px 25px rgba(0, 0, 0, 0.2),
              0 4px 10px rgba(0, 0, 0, 0.1),
              inset 0 0 0 1px rgba(255, 255, 255, 0.1)
            `,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2)',
          }}
        >
          <Menu className="h-6 w-6" />
        </motion.button>
      </>
    );
  }

  // Don't render on other breakpoints
  if (isMobile) return null;

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
      icon: Users, 
      path: '/users', 
      badge: null,
      color: 'muted'
    },
  ];

  // Desktop: Pinned bento column (always visible)
  if (isDesktop) {
    return (
      <motion.div
        initial={{ 
          x: '100%', 
          opacity: 0 
        }}
        animate={{ 
          x: 0, 
          opacity: 1 
        }}
        transition={{ 
          type: 'spring', 
          damping: 25, 
          stiffness: 300,
          mass: 0.8
        }}
        className="fixed top-16 bottom-0 right-0 w-80 z-30"
        style={{
          background: 'hsl(var(--background) / 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderLeft: '1px solid hsl(var(--border) / 0.2)',
        }}
      >
        <ContextPanel />
      </motion.div>
    );
  }

  // Tablet: Collapsed icon rail + expandable panel
  if (isTablet) {
    return (
      <>
        {/* Icon Rail */}
        <motion.div
          initial={{ 
            x: '100%', 
            opacity: 0 
          }}
          animate={{ 
            x: 0, 
            opacity: 1 
          }}
          transition={{ 
            type: 'spring', 
            damping: 25, 
            stiffness: 300,
            mass: 0.8
          }}
          className="fixed top-16 bottom-0 right-0 w-16 z-30"
          style={{
            background: 'hsl(var(--background) / 0.9)',
            backdropFilter: 'blur(16px) saturate(180%)',
            borderLeft: '1px solid hsl(var(--border) / 0.2)',
          }}
        >
          <div className="h-full flex flex-col py-4 gap-2">
            {iconRailItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setShowExpandedPanel(true)}
                  className="relative w-12 h-12 mx-auto geo-round flex items-center justify-center group"
                  style={{
                    backgroundColor: `hsl(var(--${item.color}) / 0.1)`,
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: `hsl(var(--${item.color}) / 0.2)`
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-5 h-5" style={{ color: `hsl(var(--${item.color}))` }} />
                  
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 geo-round bg-destructive text-white text-xs font-black flex items-center justify-center"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.div>
                  )}
                  
                  {/* Pulse indicator */}
                  {item.pulse && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 geo-round border-2"
                      style={{ borderColor: `hsl(var(--${item.color}) / 0.5)` }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Expanded Panel Overlay */}
        <AnimatePresence>
          {showExpandedPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setShowExpandedPanel(false)}
              />
              
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
                className="fixed top-16 bottom-0 right-0 w-80 z-50"
                style={{
                  background: 'hsl(var(--background) / 0.95)',
                  backdropFilter: 'blur(32px) saturate(200%)',
                  borderRadius: '32px 0 0 32px',
                  boxShadow: `
                    0 30px 60px rgba(0, 0, 0, 0.25),
                    0 12px 24px rgba(0, 0, 0, 0.15),
                    0 4px 8px rgba(0, 0, 0, 0.08),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.15)
                  `,
                }}
              >
                <ContextPanel />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Tablet: Collapsible floating island

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
