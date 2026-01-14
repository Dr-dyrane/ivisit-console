import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Menu, X, Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance, Users, Moon, Sun, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

export const IslandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isAdmin, isProvider, hasMinRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

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

  // Handle dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY.current;
        
        if (scrollDelta > 5 && currentScrollY > 50) {
          setIsVisible(false);
        } else if (scrollDelta < -5 || currentScrollY < 50) {
          setIsVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
      {/* Desktop - Top Right Island (lg and above) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:flex fixed top-6 right-32 z-50 glass shadow-premium px-3 py-2 squircle-lg gap-2 items-center"
      >
        {filteredNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative px-4 py-2.5 squircle transition-all duration-300 ${
              isActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'hover:bg-muted/50'
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
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
        
        {/* Menu Button */}
        <button
          onClick={() => { setMenuOpen(!menuOpen); setUserMenuOpen(false); }}
          className={`relative px-4 py-2.5 squircle transition-all duration-300 ${
            menuOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
          }`}
          data-testid="nav-menu-btn"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* User Avatar */}
        <button
          onClick={() => { setUserMenuOpen(!userMenuOpen); setMenuOpen(false); }}
          className="ml-1"
        >
          <Avatar className="h-10 w-10 squircle ring-2 ring-border hover:ring-primary transition-all">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} />
            <AvatarFallback className="squircle bg-primary/10 text-primary font-bold">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>
      </motion.div>

      {/* Desktop Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block fixed top-24 right-12 z-50 glass shadow-premium p-3 squircle-lg min-w-[200px]"
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
                  data-testid={`menu-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Dropdown Menu */}
      <AnimatePresence>
        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block fixed top-24 right-12 z-50 glass shadow-premium p-4 squircle-lg min-w-[240px]"
          >
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
              <Avatar className="h-12 w-12 squircle">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} />
                <AvatarFallback className="squircle bg-primary/10 text-primary font-bold">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-black truncate">{profile?.username || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                <Badge className={`squircle-sm text-xs mt-1 ${getRoleBadgeColor(profile?.role)}`}>
                  {profile?.role || 'viewer'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 squircle hover:bg-muted/50 transition-all"
              >
                <User className="h-5 w-5" />
                <span className="font-bold text-sm">My Profile</span>
              </button>
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

      {/* Mobile/Tablet - Left Vertical Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          x: isVisible ? 0 : -80,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="lg:hidden fixed left-3 top-1/2 -translate-y-1/2 z-50 glass shadow-premium px-2 py-3 squircle-lg flex flex-col gap-1"
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
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
      </motion.div>

      {/* Mobile Expanded Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed left-16 top-1/2 -translate-y-1/2 z-50 glass shadow-premium p-3 squircle-lg"
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
