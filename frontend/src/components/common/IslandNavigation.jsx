import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Menu, X, Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance, Users, Moon, Sun, LogOut, User, Ellipsis } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ThemeToggle from '../ui/theme-toggle';
import { Badge } from '../ui/badge';

export const IslandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isAdmin, isProvider, hasMinRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Default to hidden
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Mobile detection state
  const hideTimerRef = useRef(null);
  
  // Touch handling refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Detect Mobile Device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-hide timer function
  const startHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    
    // Only set timer if not hovered and menu is closed
    if (!isHovered && !menuOpen && !userMenuOpen) {
        hideTimerRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 3000); // Hide after 3 seconds of inactivity
    }
  };

  // Clear timer on interaction
  const clearHideTimer = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setIsVisible(true);
  };

  useEffect(() => {
      // Start timer on mount (if visible)
      if (isVisible) startHideTimer();
      return () => {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
  }, [isVisible]);

  // Watch hover state to manage timer
  useEffect(() => {
      if (isHovered) {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setIsVisible(true);
      } else {
          startHideTimer();
      }
  }, [isHovered, menuOpen, userMenuOpen]);

  // Mouse Edge Detection (Desktop) & Swipe Detection (Mobile)
  useEffect(() => {
    // Desktop: Show when mouse hits left edge
    const handleMouseMove = (e) => {
        if (!isMobile) {
            // If mouse is within 20px of left edge
            if (e.clientX < 20) {
                setIsVisible(true);
                startHideTimer();
            }
        }
    };
    
    // Mobile: Swipe Right to Open
    const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
        touchEndX.current = e.changedTouches[0].screenX;
        handleSwipe();
    };

    const handleSwipe = () => {
        const swipeDistance = touchEndX.current - touchStartX.current;
        const startZone = touchStartX.current < 50; // Only allow swipe from left edge (first 50px)

        // Swipe Right (Open)
        if (startZone && swipeDistance > 50) {
            setIsVisible(true);
            startHideTimer();
        }
        
        // Swipe Left (Close)
        if (swipeDistance < -50) {
            setIsVisible(false);
        }
    };

    if (!isMobile) {
        window.addEventListener('mousemove', handleMouseMove);
    } else {
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

  const navItems = [
    { path: '/', icon: Home, label: 'Home', minRole: 'viewer' },
    { path: '/map', icon: MapPin, label: 'Map', minRole: 'viewer' },
    { path: '/verification', icon: FileCheck, label: 'Queue', minRole: 'admin' },
    { path: '/analytics', icon: TrendingUp, label: 'Stats', minRole: 'viewer' },
  ];

  const menuItems = [
    { path: '/hospitals', icon: Hospital, label: 'Hospitals', minRole: 'provider' },
    { path: '/ambulances', icon: Ambulance, label: 'Ambulances', minRole: 'provider' },
    { path: '/doctors', icon: Stethoscope, label: 'Doctors', minRole: 'provider' },
    { path: '/users', icon: Users, label: 'Users', minRole: 'admin' },
    { path: '/visits', icon: Calendar, label: 'Visits', minRole: 'provider' },
    { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies', minRole: 'provider' },
    { path: '/settings', icon: Settings, label: 'Settings', minRole: 'viewer' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
    setUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter items based on role
  const filteredNavItems = navItems.filter(item => hasMinRole(item.minRole));
  const filteredMenuItems = menuItems.filter(item => hasMinRole(item.minRole));



  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-primary/20 text-primary',
      sponsor: 'bg-secondary/20 text-secondary',
      provider: 'bg-info/20 text-info',
      viewer: 'bg-muted text-muted-foreground',
    };
    return colors[role] || colors.viewer;
  };

  return (
    <>
      {/* Invisible Hover Zone (The Handler) - Desktop Only */}
      {!isMobile && (
          <div 
            className="fixed left-0 top-0 bottom-0 w-4 z-[51]"
            onMouseEnter={() => {
                setIsVisible(true);
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
          />
      )}

      {/* Mobile/Tablet/Desktop - Left Vertical Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -80 }}
        animate={{ 
          opacity: isVisible || isHovered || menuOpen ? 1 : 0.6,
          x: isVisible || isHovered || menuOpen ? 0 : -90,
          pointerEvents: isVisible || isHovered || menuOpen ? 'auto' : 'none'
        }}
        // Desktop Hover Logic
        onMouseEnter={() => {
            if (!isMobile) {
                setIsVisible(true);
                setIsHovered(true);
            }
        }}
        onMouseLeave={() => {
            if (!isMobile) setIsHovered(false)
        }}
        // Mobile Swipe Logic (Simple Touch Handlers)
        onTouchStart={() => {
            setIsVisible(true);
            startHideTimer();
        }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 glass shadow-premium px-2 py-3 squircle-lg flex flex-col gap-1"
      >
        {filteredNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative p-3 squircle transition-all duration-300 ${
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'hover:bg-muted/50'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {isActive(item.path) && (
              <motion.div
                layoutId="activeTabMobile"
                className="absolute inset-0 bg-primary squircle -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
        
        <div className="h-px bg-border/50 my-1" />
        
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`p-3 squircle transition-all duration-300 ${
            menuOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
          }`}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Ellipsis className="h-5 w-5" />}
        </button>

        {/* Mobile User Avatar */}
        <button
          onClick={() => handleNavigate('/settings')}
          className="mt-1"
        >
          <Avatar className="h-10 w-10 squircle ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} />
            <AvatarFallback className="squircle bg-primary/10 text-primary font-bold text-sm">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>

        <div className="h-px bg-border/50 my-2" />
        <ThemeToggle size="xs" />
      </motion.div>

      {/* Mobile Expanded Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-16 top-1/2 -translate-y-1/2 z-50 glass shadow-premium p-3 squircle-lg"
          >
            <div className="space-y-1">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 squircle transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>
                </button>
              ))}
              
              <div className="h-px bg-border/50 my-2" />
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 squircle hover:bg-destructive/10 text-destructive transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-bold text-sm">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {(menuOpen || userMenuOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}
            className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
    </>
  );
};
