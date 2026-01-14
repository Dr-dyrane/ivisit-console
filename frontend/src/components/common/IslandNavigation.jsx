import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Menu, X, Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const IslandNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/verification', icon: FileCheck, label: 'Queue' },
    { path: '/analytics', icon: TrendingUp, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const menuItems = [
    { path: '/hospitals', icon: Hospital, label: 'Hospitals' },
    { path: '/ambulances', icon: Ambulance, label: 'Ambulances' },
    { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/visits', icon: Calendar, label: 'Visits' },
    { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

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
            className="hidden md:block fixed top-24 right-6 z-50 glass shadow-premium p-3 squircle-lg min-w-[200px]"
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

      {/* Mobile - Bottom Pill */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass shadow-premium px-4 py-3 squircle-lg flex gap-1"
      >
        {navItems.slice(0, 4).map((item) => (
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
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`relative px-4 py-2.5 squircle transition-all duration-300 flex flex-col items-center gap-1 ${
            menuOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
          }`}
        >
          <Menu className="h-4 w-4" />
          <span className="text-[10px] font-bold opacity-60">More</span>
        </button>
      </motion.div>

      {/* Mobile Expanded Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed bottom-24 left-4 right-4 z-50 glass shadow-premium p-4 squircle-lg"
          >
            <div className="grid grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex flex-col items-center gap-2 p-4 squircle transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50 bg-muted/20'
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="font-bold text-xs">{item.label}</span>
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
