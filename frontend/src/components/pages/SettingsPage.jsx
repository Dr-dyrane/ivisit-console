import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Mail, Shield, LogOut, Moon, Sun, Bell, Lock, Smartphone, Globe, CreditCard, ChevronRight } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { usePageHeader } from '../../contexts/LayoutContext';

export const SettingsPage = () => {
    const { user, profile, signOut, isAdmin, isSponsor, isProvider } = useAuth();
    const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
    const navigate = useNavigate();



    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
            toast.success('Signed out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Failed to sign out');
        }
    }, [signOut, navigate]);

    const headerActions = React.useMemo(() => (
        <Button
            variant="ghost"
            onClick={handleSignOut}
            className="glass squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase text-destructive hover:bg-destructive/10"
        >
            <LogOut className="h-4 w-4 mr-2" />
            SIGN OUT
        </Button>
    ), [handleSignOut]);

    usePageHeader("Control Center", headerActions);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            admin: 'bg-primary text-primary-foreground',
            sponsor: 'bg-secondary text-secondary-foreground',
            provider: 'bg-info text-info-foreground',
            viewer: 'bg-muted text-muted-foreground',
        };
        return colors[role] || colors.viewer;
    };

    return (
        <div className="min-h-screen bg-background px-0 md:px-12 py-6 md:py-8">
            <div className="pt-2" />

            <LayoutGroup>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">

                    {/* Main Profile Identity Card - Spans 2 cols */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-1 md:col-span-2 row-span-2"
                    >
                        <Card className="h-full squircle-2xl glass-strong border-0 p-0 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />

                            {/* Header Background */}
                            <div className="h-32 bg-gradient-to-r from-primary/10 via-background to-background relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10"
                                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                </div>
                            </div>

                            <div className="px-8 pb-8 -mt-16 relative z-10">
                                <div className="flex items-end gap-6 mb-6">
                                    <Avatar className="h-32 w-32 squircle-2xl border-4 border-background shadow-2xl">
                                        <AvatarImage 
                                          src={getAvatarUrl(profile, user)} 
                                          className="object-cover" 
                                        />
                                        <AvatarFallback className="squircle bg-muted text-muted-foreground font-black text-4xl">
                                            {getAvatarFallback(profile, user)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="mb-2">
                                        <h2 className="text-3xl font-black tracking-tighter">{profile?.username || 'User'}</h2>
                                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                                            <Mail className="h-4 w-4" /> {user?.email || profile?.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                    <div className="p-4 squircle-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 squircle bg-primary/10 text-primary">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-sm uppercase text-muted-foreground">Account Role</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`squircle font-black text-sm px-3 py-1 ${getRoleBadgeColor(profile?.role)}`}>
                                                {profile?.role?.toUpperCase() || 'VIEWER'}
                                            </Badge>
                                            {profile?.bvn_verified && (
                                                <Badge className="squircle bg-success/20 text-success font-bold border-0">
                                                    VERIFIED
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 squircle-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 squircle bg-info/10 text-info">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-sm uppercase text-muted-foreground">Contact</span>
                                        </div>
                                        <p className="font-mono font-bold text-lg">{profile?.phone || 'Not linked'}</p>
                                    </div>

                                    <div className="p-4 squircle-xl bg-muted/30 hover:bg-muted/50 transition-colors col-span-1 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 squircle bg-secondary/10 text-secondary">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm uppercase text-muted-foreground block">Subscription Plan</span>
                                                    <span className="font-black text-lg">Free Tier</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" className="squircle bg-primary/10 text-primary hover:bg-primary/20 font-bold">
                                                Upgrade
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Permissions Tile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="col-span-1"
                    >
                        <Card className="h-full squircle-2xl glass border-0 p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 squircle bg-primary/10 text-primary">
                                    <Lock className="h-6 w-6" />
                                </div>
                                <Badge className="squircle bg-primary/10 text-primary border-0">Security</Badge>
                            </div>
                            <h3 className="font-black text-xl mb-4">Access Rights</h3>

                            <div className="space-y-3 flex-1">
                                <div className="flex items-center justify-between p-3 squircle-lg bg-muted/30">
                                    <span className="font-semibold text-sm">Dashboard</span>
                                    <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                </div>
                                <div className="flex items-center justify-between p-3 squircle-lg bg-muted/30">
                                    <span className="font-semibold text-sm">CRUD Ops</span>
                                    <div className={`w-2 h-2 rounded-full ${isProvider() ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted-foreground'}`} />
                                </div>
                                <div className="flex items-center justify-between p-3 squircle-lg bg-muted/30">
                                    <span className="font-semibold text-sm">User Mgmt</span>
                                    <div className={`w-2 h-2 rounded-full ${isAdmin() ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted-foreground'}`} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Preferences Tile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="col-span-1"
                    >
                        <Card className="h-full squircle-2xl glass border-0 p-6 flex flex-col group hover-lift">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 squircle bg-warning/10 text-warning">
                                    <Globe className="h-6 w-6" />
                                </div>
                            </div>
                            <h3 className="font-black text-xl mb-4">App Preferences</h3>

                            <div className="space-y-4 flex-1">
                                <div className="flex items-center justify-between p-4 squircle-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                        <span className="font-bold">Dark Mode</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleDarkMode}
                                        className="squircle hover:bg-background"
                                    >
                                        {darkMode ? 'On' : 'Off'}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-4 squircle-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Bell className="h-5 w-5" />
                                        <span className="font-bold">Notifications</span>
                                    </div>
                                    <Badge className="squircle bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer">
                                        Enabled
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Session / Logout Tile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="col-span-1"
                    >
                        <Card className="h-full squircle-2xl glass border-0 p-6 flex flex-col justify-between bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer group" onClick={handleSignOut}>
                            <div className="flex items-center justify-between">
                                <div className="p-3 squircle bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                                    <LogOut className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-destructive mb-1">Sign Out</h3>
                                <p className="text-sm font-medium text-muted-foreground">End your current session securely</p>
                            </div>
                        </Card>
                    </motion.div>

                </div>
            </LayoutGroup>
        </div>
    );
};
