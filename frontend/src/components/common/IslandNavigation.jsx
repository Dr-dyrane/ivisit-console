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


import { NAV_CONFIG, getAccessibleNav } from '../../config/navigation';

export const IslandNavigation = () => {
  const { sidebarMode, setSidebarMode, sidebarWidth, isScrolledDown } = useLayout();
  const { profile, user, can } = useAuth();
  const { toggle, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  // Get accessible navigation items based on current user permissions
  const accessibleNav = useMemo(() => {
    return getAccessibleNav(profile, can);
  }, [profile, can]);

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
    const isOps = accessibleNav.ops?.items.some(item => item.path === location.pathname);
    const isMgmt = accessibleNav.mgmt?.items.some(item => item.path === location.pathname);

    if (isOps) setOpenGroups(['ops']);
    else if (isMgmt) setOpenGroups(['mgmt']);
    else setOpenGroups([]);
  }, [location.pathname, accessibleNav]);

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => prev.includes(groupId) ? [] : [groupId]);
  };

  const renderNavButton = (item, isSubItem = false, isCentered = false) => {
    const isActive = location.pathname === item.path;

    const buttonContent = (
      <button
        onClick={() => navigate(item.path)}
        className={`flex items-center h-10 rounded-2xl transition-all duration-300 relative overflow-hidden group ${isCentered ? 'w-10 justify-center' : `w-full ${isSubItem ? 'pl-9' : 'px-3'}`}`}
        aria-label={item.label}
      >
        {/* Shared RGB Hive Effect - Subtle */}
        <div className={`hover-glow ${isActive ? 'hover-glow-primary/50' : 'hover-glow-muted/30'}`} />
        
        <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'}`} />
        {isBroad && !isCentered && (
          <AnimatePresence>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="ml-3 text-sm font-normal truncate transition-colors duration-300"
              style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
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
          // Active indicator - Apple-style
          <motion.div
            layoutId="activeRail"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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

  const renderGroup = (groupConfig) => {
    if (!groupConfig) return null;
    const { id, label, icon: GroupIcon, items } = groupConfig;
    const isOpen = openGroups.includes(id);
    const isAnyChildActive = items.some(i => i.path === location.pathname);

    // In collapsed mode, show centered group icon
    if (!isBroad) {
      return (
        <div key={id} className="w-full space-y-1">
          <div className="flex justify-center px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleGroup(id)}
                  className={`w-10 h-10 rounded-xl transition-colors flex items-center justify-center ${isAnyChildActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground'
                    }`}
                  aria-label={`Toggle ${label} group`}
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
            className={`w-full flex items-center h-10 px-3 rounded-xl transition-colors ${isAnyChildActive && !isOpen ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground/60 hover:text-foreground'
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
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col glass-card border-r border-border/10 ${isScrolledDown ? 'bg-background/70' : 'bg-background/30'}`}
      >
        {/* 1. BRANDING & BACK ARROW */}
        <div className="h-[63px] flex-shrink-0 flex items-center px-4 border-b border-primary/20">
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
                  aria-label="Go back"
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
            {accessibleNav.main.map(item => renderNavButton(item))}
          </div>

          <div className="h-px bg-border/10 mx-4" />

          {renderGroup(accessibleNav.ops)}
          {renderGroup(accessibleNav.mgmt)}
        </div>

        {/* 3. PROFILE & THEME */}
        <div className="p-4 border-t border-border/10 space-y-3">
          {/* Sidebar Control Trigger */}
          <div className="flex w-full">
            {!isBroad ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfigOpen(true)}
                    className={`flex items-center gap-3 w-full rounded-xl h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group ${!isBroad ? 'justify-center px-0' : ''}`}
                    aria-label="Sidebar Layout Settings"
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
                aria-label="Sidebar Layout Settings"
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
                  <div
                    onClick={toggle}
                    role="button"
                    tabIndex={0}
                    className="flex justify-center w-full rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group cursor-pointer"
                    aria-label="Toggle Theme"
                  >
                    <div className="pointer-events-none">
                      <ThemeToggle size="sm" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background border-0 rounded-full px-4 py-2 font-bold tracking-wide shadow-xl">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div
                onClick={toggle}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 w-full rounded-xl h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group cursor-pointer"
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
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-colors group"
            aria-label="User Settings"
          >
            <div className="relative">
              <Avatar className={`h-9 w-9 rounded-lg border-2 flex-shrink-0 ${
                !isBroad ? profile?.role === 'admin' ? 'border-red-500' :
                profile?.role === 'org_admin' ? 'border-blue-500' :
                profile?.role === 'provider' ? 'border-green-500' :
                profile?.role === 'sponsor' ? 'border-purple-500' :
                'border-gray-500' : 'border-border'
              }`}>
                <AvatarImage src={getAvatarUrl(profile, user)} />
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                  {getAvatarFallback(profile, user)}
                </AvatarFallback>
              </Avatar>
              {/* Status dot for expanded state - Apple style */}
              {isBroad && (
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                  profile?.role === 'admin' ? 'bg-red-500' :
                  profile?.role === 'org_admin' ? 'bg-blue-500' :
                  profile?.role === 'provider' ? 'bg-green-500' :
                  profile?.role === 'sponsor' ? 'bg-purple-500' :
                  'bg-gray-500'
                }`} />
              )}
            </div>
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
    </TooltipProvider >
  );
};