'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home, MapPin, FileCheck, TrendingUp, Settings,
    Hospital, Ambulance, Stethoscope, Users,
    Calendar, AlertTriangle, LogOut, Sun, Moon,
    Newspaper, Headphones, Shield, ChevronDown, ChevronLeft,
    FolderKanban, Handshake, Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLayout } from '../../contexts/LayoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAccessibleNav } from '../../config/navigation';
import { ContextPanel } from './ContextPanel';

export const MobileNavMenu = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, can, profile, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { headerConfig } = useLayout();
    const isNotHome = location.pathname !== '/';
    const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'context'

    // Get accessible navigation items based on current user permissions
    const accessibleNav = useMemo(() => {
        return getAccessibleNav(profile, can);
    }, [profile, can]);

    // ... (rest of the logic preserved)
    const [activeGroup, setActiveGroup] = useState(null);

    useEffect(() => {
        const isOps = accessibleNav.ops?.items.some(item => item.path === location.pathname);
        const isMgmt = accessibleNav.mgmt?.items.some(item => item.path === location.pathname);

        if (isOps) setActiveGroup('ops');
        else if (isMgmt) setActiveGroup('mgmt');
    }, [location.pathname, accessibleNav]);

    // Auto-close sheet when context panel actions trigger a modal
    // Canon #18: Preserve Spatial Memory — sheet dismisses, modal appears
    useEffect(() => {
        const modalEvents = [
            'openAnalyticsModal', 'openVisitModal', 'openEmergencyModal',
            'openDoctorModal', 'openHospitalModal', 'openHealthNewsModal',
            'openSupportTicketModal', 'openInsuranceModal', 'openFilters',
            'openProfileModal', 'openSecurityModal', 'openSupportModal',
            'openSubscriptionModal', 'openEmailActionsModal', 'openPricingModal',
            'openOrganizationModal', 'openTopUpModal', 'openWithdrawModal',
            'openUserAnalytics', 'openVisitAnalytics',
            'openUserModal', 'openInviteUserModal', 'exportAnalytics', 'exportLedger',
        ];

        const handleModalOpen = () => onClose();

        modalEvents.forEach(evt => window.addEventListener(evt, handleModalOpen));
        return () => modalEvents.forEach(evt => window.removeEventListener(evt, handleModalOpen));
    }, [onClose]);

    const handleNavigate = (path) => {
        navigate(path);
        onClose();
    };

    const renderLink = (item, isSub = false) => {
        const active = location.pathname === item.path;

        return (
            <motion.button
                key={item.path}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    } ${isSub ? 'pl-12' : ''}`}
            >
                <item.icon className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-50'}`} />
                <span className={`text-xs md:text-base tracking-tight ${active ? 'font-semibold' : 'font-normal'}`}>
                    {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </motion.button>
        );
    };

    return (
        <div className="flex flex-col h-full text-foreground no-scrollbar">
            {/* 1. BRANDING & TOGGLE */}
            <div className="flex-shrink-0 p-2 pb-0">
                <div className="h-14 flex items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <img src="/logo.png" alt="logo" className="w-5 h-5 object-contain" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-bold tracking-tighter">iVisit<span className="text-primary text-base">.</span> <span className="text-primary text-[10px] font-normal italic uppercase tracking-wider">Console</span></span>
                        </div>
                    </div>
                </div>

                {/* TAB TOGGLE (Subtle Segmented Control) */}
                <div className="p-1 rounded-xl bg-muted/20 backdrop-blur-md flex relative mb-4">
                    <motion.div
                        className="absolute top-1 bottom-1 bg-[hsl(var(--spark)/0.10)] shadow-sm rounded-lg"
                        initial={false}
                        animate={{
                            left: activeTab === 'menu' ? '4px' : '50%',
                            width: 'calc(50% - 4px)',
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'menu' ? 'text-[hsl(var(--spark)/0.92)]' : 'text-muted-foreground/50'
                            }`}
                    >
                        Menu
                    </button>
                    <button
                        onClick={() => setActiveTab('context')}
                        className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-center transition-colors duration-200 ${activeTab === 'context' ? 'text-[hsl(var(--spark)/0.92)]' : 'text-muted-foreground/50'
                            }`}
                    >
                        Context
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'menu' ? (
                        <motion.div
                            key="menu-content"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-6"
                        >
                            {/* Groups with Accordion logic */}
                            <div className="space-y-1">
                                {['ops', 'mgmt', 'finance'].map(groupId => {
                                    const group = accessibleNav[groupId];
                                    if (!group) return null;

                                    const isOpen = activeGroup === groupId;

                                    return (
                                        <div key={groupId} className="space-y-1">
                                            <button
                                                onClick={() => setActiveGroup(isOpen ? null : groupId)}
                                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isOpen ? 'text-foreground' : 'text-muted-foreground/60'
                                                    }`}
                                            >
                                                <group.icon className="h-5 w-5 opacity-50" />
                                                <span className="text-xs md:text-sm font-normal uppercase tracking-[0.2em]">{group.label}</span>
                                                <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-300 ${isOpen ? '' : '-rotate-90 opacity-30'}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden space-y-1"
                                                    >
                                                        {group.items.map(item => renderLink(item, true))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-border/40 mx-4" />

                            {/* Page Actions (Moved below Groups) */}
                            {headerConfig.actions && (
                                <div className="p-4 rounded-2xl bg-primary/10">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-3 ml-1">Page Actions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {headerConfig.actions}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="context-content"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="pt-2"
                        >
                            <ContextPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 3. UTILITY FOOTER */}
            <div className="flex-shrink-0 p-6 pt-0 space-y-4">
                <div className="h-px bg-white/5 mb-4" />
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex-1 flex items-center justify-center h-12 rounded-2xl bg-black/5 dark:bg-white/5 text-muted-foreground transition-[background,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:bg-white/10 hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => { signOut(); navigate('/login'); }}
                        className="flex-1 flex items-center justify-center h-12 rounded-2xl bg-destructive/5 text-destructive transition-colors active:bg-destructive/10"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>

                <button
                    onClick={() => handleNavigate('/settings')}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl apple-glass shadow-sm border-0"
                >
                    <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&background=random`} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs">
                            {profile?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || profile?.username || 'User'}</p>
                        <p className="text-[8px] font-normal text-muted-foreground uppercase tracking-wider">Account Settings</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
