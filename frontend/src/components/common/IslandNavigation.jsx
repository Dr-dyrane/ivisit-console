'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, MapPin, FileCheck, TrendingUp, Menu,
  Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance,
  Users, Newspaper, Headphones, Shield, ChevronLeft, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ThemeToggle from '../ui/theme-toggle';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';

export const IslandNavigation = () => {
  const { sidebarExpanded, toggleSidebar, isScrolledDown } = useLayout();
  const { profile, user, hasMinRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState([]);

  // Determine if sidebar should act "expanded" (Manual toggle OR hover)
  const isBroad = sidebarExpanded || isHovered;
  const sidebarWidth = isBroad ? 260 : 72;
  const isNotHome = location.pathname !== '/';

  // --- Progressive Reveal & Auto-Cleanup Logic ---
  const operationItems = [
    { id: 'hospitals', path: '/hospitals', icon: Hospital, label: 'Hospitals' },
    { id: 'ambulances', path: '/ambulances', icon: Ambulance, label: 'Ambulances' },
    { id: 'doctors', path: '/doctors', icon: Stethoscope, label: 'Doctors' },
    { id: 'visits', path: '/visits', icon: Calendar, label: 'Visits' },
    { id: 'emergencies', path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
  ];

  const managementItems = [
    { id: 'verification', path: '/verification', icon: FileCheck, label: 'Queue', minRole: 'admin' },
    { id: 'insurance', path: '/insurance', icon: Shield, label: 'Insurance', minRole: 'admin' },
    { id: 'support', path: '/support-tickets', icon: Headphones, label: 'Support' },
    { id: 'users', path: '/users', icon: Users, label: 'Users', minRole: 'admin' },
    { id: 'news', path: '/health-news', icon: Newspaper, label: 'Health News', minRole: 'admin' },
  ];

  // Auto-expand the group containing the active route and close others
  useEffect(() => {
    const isOps = operationItems.some(item => item.path === location.pathname);
    const isMgmt = managementItems.some(item => item.path === location.pathname);

    if (isOps) setOpenGroups(['ops']);
    else if (isMgmt) setOpenGroups(['mgmt']);
    else setOpenGroups([]);
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => prev.includes(groupId) ? [] : [groupId]);
  };

  const renderNavButton = (item, isSubItem = false) => {
    const isActive = location.pathname === item.path;
    const canSee = !item.minRole || hasMinRole(item.minRole);
    if (!canSee) return null;

    return (
      <div key={item.id} className="relative flex items-center w-full px-3">
        {isActive && (
          <motion.div
            layoutId="activeRail"
            className="absolute left-0 w-1 h-6 bg-primary rounded-r-full z-10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <button
          onClick={() => navigate(item.path)}
          className={`w-full flex items-center h-10 rounded-lg transition-all duration-200 ${isSubItem ? 'pl-9' : 'px-3'
            } ${isActive
              ? 'bg-primary/10 text-primary font-bold'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
        >
          <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'opacity-70'}`} />
          <AnimatePresence>
            {isBroad && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="ml-3 text-sm truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    );
  };

  const renderGroup = (id, label, items) => {
    const isOpen = openGroups.includes(id);
    const isAnyChildActive = items.some(i => i.path === location.pathname);

    return (
      <div key={id} className="w-full space-y-1">
        <div className="px-3">
          <button
            onClick={() => toggleGroup(id)}
            className={`w-full flex items-center h-10 px-3 rounded-lg transition-colors ${isAnyChildActive && !isOpen ? 'bg-primary/5 text-primary' : 'text-muted-foreground/60 hover:text-foreground'
              }`}
          >
            {/* Folder Icon proxy for groups */}
            <div className="w-5 h-5 flex items-center justify-center">
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </div>
            {isBroad && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-[11px] font-black uppercase tracking-widest flex-1 text-left">
                {label}
              </motion.span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-1"
            >
              {items.map(item => renderNavButton(item, true))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.nav
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: sidebarWidth, x: isScrolledDown ? -sidebarWidth : 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 28 }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-background/80 backdrop-blur-xl border-r border-border/40"
    >
      {/* 1. BRANDING & BACK ARROW */}
      <div className="h-16 flex-shrink-0 flex items-center px-4">
        <div className="relative flex items-center w-full">
          <AnimatePresence mode="wait">
            {isNotHome ? (
              <motion.button
                key="back"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="logo" className="w-5 h-5 object-contain" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isBroad && isNotHome && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-xs font-bold text-muted-foreground">Go Back</motion.span>
          )}

          {isBroad && !isNotHome && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="ml-3 flex flex-col leading-none">
              <span className="text-lg font-black tracking-tighter">iVisit<span className="text-primary">.</span></span>
              <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Console</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* 2. DOCK-STYLE NAVIGATION */}
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar py-4">
        <div className="space-y-1">
          {renderNavButton({ id: 'home', path: '/', icon: Home, label: 'Dashboard' })}
          {renderNavButton({ id: 'map', path: '/map', icon: MapPin, label: 'Live Map' })}
          {renderNavButton({ id: 'analytics', path: '/analytics', icon: TrendingUp, label: 'Statistics' })}
        </div>

        <div className="h-px bg-border/40 mx-6" />

        {renderGroup('ops', 'Operations', operationItems)}
        {renderGroup('mgmt', 'Management', managementItems)}
      </div>

      {/* 3. PROFILE & THEME */}
      <div className="p-4 bg-muted/20 border-t border-border/40 space-y-3">
        <div className="flex justify-start pl-2">
          <ThemeToggle />
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-colors group"
        >
          <Avatar className="h-9 w-9 rounded-lg border border-border flex-shrink-0">
            <AvatarImage src={getAvatarUrl(profile, user)} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {getAvatarFallback(profile, user)}
            </AvatarFallback>
          </Avatar>
          {isBroad && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-left overflow-hidden">
              <p className="text-xs font-bold truncate text-foreground">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] opacity-50 truncate font-bold uppercase tracking-tight">Settings</p>
            </motion.div>
          )}
        </button>
      </div>
    </motion.nav>
  );
};