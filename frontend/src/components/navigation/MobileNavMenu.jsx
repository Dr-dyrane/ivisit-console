'use client';

import React, { useState, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';

import { NAV_CONFIG, getAccessibleNav } from '../../config/navigation';

export const MobileNavMenu = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, can, profile, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const isNotHome = location.pathname !== '/';

    // Get accessible navigation items based on current user permissions
    const accessibleNav = useMemo(() => {
        return getAccessibleNav(profile, can);
    }, [profile, can]);

    // State to track which section is currently focused
    const [activeGroup, setActiveGroup] = useState(null);

    // Auto-focus the group based on current URL
    useEffect(() => {
        const isOps = accessibleNav.ops?.items.some(item => item.path === location.pathname);
        const isMgmt = accessibleNav.mgmt?.items.some(item => item.path === location.pathname);

        if (isOps) setActiveGroup('ops');
        else if (isMgmt) setActiveGroup('mgmt');
    }, [location.pathname, accessibleNav]);

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
                <span className={`text-base tracking-tight ${active ? 'font-semibold' : 'font-normal'}`}>
                    {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </motion.button>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* 1. BRANDING & BACK ARROW */}
            <div className="h-16 flex-shrink-0 flex items-center">
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

                    {isNotHome && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-xs font-semibold text-muted-foreground">Go Back</motion.span>
                    )}

                    {!isNotHome && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="ml-3 flex flex-col leading-none">
                            <span className="text-2xl font-bold tracking-tighter">iVisit<span className="text-primary text-base">.</span> <span className="text-primary text-sm font-normal italic  uppercase">Console</span></span>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* 2. CONTEXTUAL CONTENT (Progressive Reveal) */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-4">

                {/* Always show Top-Level */}
                <div className="space-y-1">
                    {accessibleNav.main.map(link => renderLink(link))}
                </div>

                <div className="h-px bg-border/40 mx-4 my-4" />

                {/* Groups with Accordion logic */}
                {['ops', 'mgmt'].map(groupId => {
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
                                <span className="text-sm font-bold uppercase tracking-[0.2em]">{group.label}</span>
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

            {/* 3. UTILITY FOOTER (Sticky & Clean) */}
            <div className="flex-shrink-0 bg-muted/20 border-t border-border/40 space-y-4 py-10">
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-background border border-border/40 text-muted-foreground font-semibold text-xs uppercase tracking-widest"
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        Mode
                    </button>
                    <button
                        onClick={() => { signOut(); navigate('/login'); }}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-destructive/5 border border-destructive/10 text-destructive font-semibold text-xs uppercase tracking-widest"
                    >
                        <LogOut className="h-4 w-4" />
                        Exit
                    </button>
                </div>

                <button
                    onClick={() => handleNavigate('/settings')}
                    className="w-full flex items-center gap-4 p-2 rounded-2xl bg-background border border-border/40"
                >
                    <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage src={getAvatarUrl(profile, user)} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs">
                            {getAvatarFallback(profile, user)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || 'User'}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Account Settings</p>
                    </div>
                </button>
            </div>
        </div>
    );
};