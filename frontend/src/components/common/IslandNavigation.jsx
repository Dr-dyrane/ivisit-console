import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Menu, X, Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance, Users, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const IslandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/verification', icon: FileCheck, label: 'Queue' },
    { path: '/analytics', icon: TrendingUp, label: 'Stats' },
  ];

  const menuItems = [
    { path: '/hospitals', icon: Hospital, label: 'Hospitals' },
    { path: '/ambulances', icon: Ambulance, label: 'Ambulances' },
    { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/visits', icon: Calendar, label: 'Visits' },
    { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  // Handle dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Scroll to hide/show for mobile/tablet
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Desktop - Top Right Island (lg and above) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:flex fixed top-6 right-6 z-50 glass shadow-premium px-3 py-2 squircle-lg gap-2"
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
        
        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2.5 squircle transition-all duration-300 hover:bg-muted/50"
          data-testid="theme-toggle"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        {/* Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`relative px-4 py-2.5 squircle transition-all duration-300 ${
            menuOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
          }`}
          data-testid="nav-menu-btn"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            className="hidden lg:block fixed top-24 right-6 z-50 glass shadow-premium p-3 squircle-lg min-w-[200px]"
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
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

      {/* Mobile/Tablet - Left Vertical Sidebar (below lg) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          x: isVisible ? 0 : -100,
        }}
        transition={{ duration: 0.3 }}
        className="lg:hidden fixed left-4 top-1/2 -translate-y-1/2 z-50 glass shadow-premium px-2 py-3 squircle-lg flex flex-col gap-1"
      >
        {navItems.map((item) => (
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
        
        {/* Divider */}
        <div className="h-px bg-border/50 my-1" />
        
        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 squircle transition-all duration-300 hover:bg-muted/50"
          data-testid="theme-toggle-mobile"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        {/* Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`p-3 squircle transition-all duration-300 ${
            menuOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
          }`}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </motion.div>

      {/* Mobile/Tablet Expanded Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed left-20 top-1/2 -translate-y-1/2 z-50 glass shadow-premium p-3 squircle-lg"
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>
    </>
  );
};
