'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, MapPin, FileCheck, TrendingUp, Menu,
  Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance,
  Users, Newspaper, Headphones, Shield, ChevronLeft, ChevronDown, Check,
  FolderKanban, Handshake, Mail, PanelLeftDashed, Laptop, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import ThemeToggle from '../ui/theme-toggle';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import NoiseOverlay from '../ui/noise-overlay';

// Static navigation configuration
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
  { id: 'subscriptions', path: '/subscriptions', icon: Mail, label: 'Subscriptions', minRole: 'admin' },
  { id: 'support', path: '/support-tickets', icon: Headphones, label: 'Support' },
  { id: 'users', path: '/users', icon: Users, label: 'Users', minRole: 'admin' },
  { id: 'news', path: '/health-news', icon: Newspaper, label: 'Health News', minRole: 'admin' },
];

// Group icons for collapsed mode
const groupIcons = {
  ops: Handshake,
  mgmt: FolderKanban
};

export const IslandNavigation = () => {
  const { sidebarMode, setSidebarMode, sidebarWidth, isScrolledDown } = useLayout();
  const { profile, user, hasMinRole } = useAuth();
  const { toggle, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  // Determine effective expansion state
  const isBroad = useMemo(() => {
    if (sidebarMode === 'expanded') return true;
    if (sidebarMode === 'collapsed') return false;
    return isHovered; // 'smart' mode
  }, [sidebarMode, isHovered]);

  // Width for the navigation sidebar itself (visual)
  const navWidth = isBroad ? 260 : 72;

  const isNotHome = location.pathname !== '/';

  // --- Progressive Reveal & Auto-Cleanup Logic ---

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

  const renderNavButton = (item, isSubItem = false, isCentered = false) => {
    const isActive = location.pathname === item.path;
    const canSee = !item.minRole || hasMinRole(item.minRole);
    if (!canSee) return null;

    const buttonContent = (
      <button
        onClick={() => navigate(item.path)}
        className={`flex items-center h-10 rounded-xl transition-all duration-200 ${isCentered ? 'w-10 justify-center' : `w-full ${isSubItem ? 'pl-9' : 'px-3'}`
          } ${isActive
            ? 'bg-primary/15 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
      >
        <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'opacity-70'}`} />
        {isBroad && !isCentered && (
          <AnimatePresence>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="ml-3 text-sm truncate"
            >
              {item.label}
            </motion.span>
          </AnimatePresence>
        )}
      </button>
    );

    return (
      <div key={item.id} className={`relative flex items-center ${isCentered ? 'justify-center' : 'w-full'} px-3`}>
        {isActive && !isCentered && (
          <motion.div
            layoutId="activeRail"
            className="absolute left-0 w-1.5 h-7 bg-primary rounded-r-lg z-10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        {!isBroad ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background border-0 rounded-full px-4 py-2 font-bold tracking-wide shadow-xl">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ) : (
          buttonContent
        )}
      </div>
    );
  };

  const renderGroup = (id, label, items) => {
    const isOpen = openGroups.includes(id);
    const isAnyChildActive = items.some(i => i.path === location.pathname);
    const GroupIcon = groupIcons[id];

    // In collapsed mode, show centered group icon
    if (!isBroad) {
      return (
        <div key={id} className="w-full space-y-1">
          <div className="flex justify-center px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleGroup(id)}
                  className={`w-10 h-10 rounded-xl transition-colors flex items-center justify-center ${isAnyChildActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                >
                  <GroupIcon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background border-0 rounded-full px-4 py-2 font-bold tracking-wide shadow-xl">
                {label}
              </TooltipContent>
            </Tooltip>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1"
              >
                <div className="flex justify-center mb-1">
                  <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                </div>
                {items.map(item => renderNavButton(item, false, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Expanded mode - show full group with label
    return (
      <div key={id} className="w-full space-y-1">
        <div className="px-3">
          <button
            onClick={() => toggleGroup(id)}
            className={`w-full flex items-center h-10 px-3 rounded-xl transition-colors ${isAnyChildActive && !isOpen ? 'bg-primary/8 text-primary' : 'text-muted-foreground/60 hover:text-foreground'
              }`}
          >
            <GroupIcon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {isBroad && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-[11px] font-bold uppercase tracking-widest flex-1 text-left">
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? '' : '-rotate-90'}`} />
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
    <TooltipProvider delayDuration={0}>
      <motion.nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: navWidth, x: 0 }}
        transition={{ type: "spring", stiffness: 250, damping: 28 }}
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col backdrop-blur-xl border-r border-black/10 dark:border-white/10 ${isScrolledDown ? 'bg-background/80' : 'bg-background/40'}`}
      >
        <NoiseOverlay />
        {/* 1. BRANDING & BACK ARROW */}
        <div className="h-16 flex-shrink-0 flex items-center px-4 border-b border-black/10 dark:border-white/10">
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
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-xs font-semibold text-muted-foreground">Go Back</motion.span>
            )}

            {isBroad && !isNotHome && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="ml-3 flex flex-col leading-none">
                <span className="text-2xl font-bold tracking-tighter">iVisit<span className="text-primary text-base">.</span> <span className="text-primary text-sm font-normal italic  uppercase">Console</span></span>
              </motion.div>
            )}
          </div>
        </div>

        {/* 2. DOCK-STYLE NAVIGATION */}
        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar py-4 mt-4">
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
        <div className="p-4 bg-muted/20 border-border/40 space-y-3">
          {/* Sidebar Control Trigger */}
          {/* Sidebar Control Trigger */}
          <div className="flex w-full">
            {!isBroad ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfigOpen(true)}
                    className={`flex items-center gap-3 w-full rounded-xl h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group ${!isBroad ? 'justify-center px-0' : ''}`}
                  >
                    <PanelLeftDashed className="w-5 h-5 flex-shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background border-0 rounded-full px-4 py-2 font-bold tracking-wide shadow-xl">
                  Layout
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => setConfigOpen(true)}
                className={`flex items-center gap-3 w-full rounded-xl h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group`}
              >
                <PanelLeftDashed className="w-5 h-5 flex-shrink-0" />
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Layout
                </motion.span>
              </button>
            )}
          </div>

          <div className="flex w-full">
            {!isBroad ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggle}
                    className="flex justify-center w-full rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group"
                  >
                    <div className="pointer-events-none">
                      <ThemeToggle size="sm" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background border-0 rounded-full px-4 py-2 font-bold tracking-wide shadow-xl">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={toggle}
                className="flex items-center gap-3 w-full rounded-xl h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group"
              >
                <div className="w-5 h-5 flex items-center justify-center pointer-events-none">
                  <ThemeToggle size="sm" />
                </div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              </button>
            )}
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-colors group"
          >
            <Avatar className="h-9 w-9 rounded-lg border border-border flex-shrink-0">
              <AvatarImage src={getAvatarUrl(profile, user)} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                {getAvatarFallback(profile, user)}
              </AvatarFallback>
            </Avatar>
            {isBroad && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-left overflow-hidden">
                <p className="text-xs font-semibold truncate text-foreground">{profile?.full_name || 'User'}</p>
                <p className="text-[10px] opacity-50 truncate font-semibold uppercase tracking-tight">Settings</p>
              </motion.div>
            )}
          </button>
        </div>

        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl shadow-2xl rounded-[28px]">
            <DialogHeader className="pt-6 px-6">
              <DialogTitle className="text-center text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Sidebar Layout
              </DialogTitle>
            </DialogHeader>

            <div className="px-3 pb-6 pt-2">
              <div className="flex flex-col gap-1">
                {[
                  {
                    id: 'smart',
                    title: 'Smart Hover',
                    desc: 'Auto-reveals on hover',
                    icon: Laptop,
                  },
                  {
                    id: 'collapsed',
                    title: 'Always Collapsed',
                    desc: 'Minimal distraction, icon only',
                    icon: PanelLeftClose,
                  },
                  {
                    id: 'expanded',
                    title: 'Always Expanded',
                    desc: 'Fixed sidebar, pushes content',
                    icon: PanelLeftOpen,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSidebarMode(item.id);
                      setTimeout(() => setConfigOpen(false), 200); // Slight delay for visual feedback
                    }}
                    className={`
              relative flex items-center gap-4 p-3 rounded-[14px] transition-all duration-200 group
              ${sidebarMode === item.id
                        ? 'bg-white/40 dark:bg-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]'}
            `}
                  >
                    {/* Icon Container */}
                    <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center transition-colors
              ${sidebarMode === item.id
                        ? 'bg-primary text-white shadow-primary/20 shadow-lg'
                        : 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}
            `}>
                      <item.icon className="w-5 h-5" strokeWidth={2.2} />
                    </div>

                    {/* Text Labels */}
                    <div className="flex-1 text-left">
                      <h4 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[12px] text-muted-foreground font-normal">
                        {item.desc}
                      </p>
                    </div>

                    {/* Selection Checkmark */}
                    {sidebarMode === item.id && (
                      <div className="mr-2">
                        <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.nav>
    </TooltipProvider>
  );
};