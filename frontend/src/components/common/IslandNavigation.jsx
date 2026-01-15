import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Menu, X, Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance, Users, Moon, Sun, LogOut, User, Ellipsis, ChevronRight } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const hideTimerRef = useRef(null);

  // Touch handling refs
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

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
      touchCurrentX.current = e.changedTouches[0].screenX;
      setIsDragging(true);
      setDragProgress(0);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;

      touchCurrentX.current = e.changedTouches[0].screenX;
      const swipeDistance = touchCurrentX.current - touchStartX.current;
      const startZone = touchStartX.current < 50; // Only allow swipe from left edge (first 50px)

      if (startZone && swipeDistance > 0) {
        const progress = Math.min(swipeDistance / 150, 1); // 150px to fully open
        setDragProgress(progress);
      }
    };

    const handleTouchEnd = (e) => {
      if (!isDragging) return;

      const swipeDistance = touchCurrentX.current - touchStartX.current;
      const startZone = touchStartX.current < 50;

      setIsDragging(false);
      setDragProgress(0);

      // Swipe Right (Open) - threshold of 80px
      if (startZone && swipeDistance > 80) {
        setIsVisible(true);
        startHideTimer();
      }

      // Swipe Left (Close) - threshold of 50px
      if (swipeDistance < -50) {
        setIsVisible(false);
      }
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
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

  if (isMobile) return null;

  return (
    <>
      <motion.div
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col pointer-events-none"
      >
        {/* Glass Rail Container */}
        <div className="flex-1 flex flex-col items-center py-6 gap-4 w-[72px] pointer-events-auto">

          {/* Logo / Home */}
          <button
            onClick={() => handleNavigate('/')}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300 group"
          >
            <div className="w-6 h-6 rounded-lg bg-primary relative flex items-center justify-center">
              <div className="absolute inset-0 bg-white/20 rounded-lg" />
              <span className="font-black text-white text-xs">IV</span>
            </div>
          </button>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col items-center gap-2 mt-8">
            {filteredNavItems.map((item) => (
              <div key={item.path} className="relative group">
                <button
                  onClick={() => handleNavigate(item.path)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive(item.path)
                    ? 'bg-background text-primary shadow-lg ring-1 ring-black/5'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-50">
                  {item.label}
                </div>
                {/* Active Indicator */}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeRail"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  />
                )}
              </div>
            ))}

            <div className="w-8 h-px bg-white/10 my-2" />

            {filteredMenuItems.map((item) => (
              <div key={item.path} className="relative group">
                <button
                  onClick={() => handleNavigate(item.path)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive(item.path)
                    ? 'bg-background text-primary shadow-lg ring-1 ring-black/5'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-50">
                  {item.label}
                </div>
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeRail"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <ThemeToggle />
            <button
              onClick={() => handleNavigate('/settings')}
              className="relative"
            >
              <Avatar className="h-9 w-9 rounded-xl ring-2 ring-white/10 transition-transform hover:scale-105">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>

        {/* Global Glass Background for Rail */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[72px] -z-10"
          style={{
            background: 'rgba(20, 20, 20, 0.4)', // Very transparent
            backdropFilter: 'blur(20px) saturate(180%)',
            // No border-right, just shadow/depth if needed, effectively "borderless"
          }}
        />
      </motion.div>
    </>
  );
};
