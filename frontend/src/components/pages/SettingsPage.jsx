import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getDisplayId } from '../../services/displayIdService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mail, Shield, LogOut, Moon, Sun, Smartphone, CreditCard, ChevronRight, Laptop, Key, HelpCircle } from 'lucide-react';
import { Switch } from '../ui/switch';
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { handleAuthError } from "../../utils/errorHandler";
import { getAvatarUrl, getAvatarFallback, markAvatarUrlAsFailed } from '../../lib/avatarUtils';
import { usePageHeader } from '../../contexts/LayoutContext';

import { ProfileEditModal } from '../modals/ProfileEditModal';
import { SecurityModal } from '../modals/SecurityModal';
import { SupportModal } from '../modals/SupportModal';
import { DoctorModal } from '../modals/DoctorModal';
import { DoctorProfileCard } from '../views/DoctorProfileCard';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { MobileSettings } from '../mobile/MobileSettings';

export const SettingsPage = () => {
    const { user, profile, signOut, isAdmin, isSponsor, isProvider, loading } = useAuth();
    const { isMobile } = useNavigation();
    const { doctorProfile } = useDoctorProfile();
    const [displayId, setDisplayId] = useState(null);
    const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
    const navigate = useNavigate();

    // Memoize avatar URL and fallback to prevent excessive re-computation
    const avatarUrl = useMemo(() => getAvatarUrl(profile, user), [profile, user]);
    const avatarFallback = useMemo(() => getAvatarFallback(profile, user), [profile, user]);

    // Modal States
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

    useEffect(() => {
        const handleOpenProfile = () => setIsProfileModalOpen(true);
        const handleOpenSecurity = () => setIsSecurityModalOpen(true);
        const handleOpenSupport = () => setIsSupportModalOpen(true);
        const handleOpenDoctor = () => setIsDoctorModalOpen(true);

        window.addEventListener('openProfileModal', handleOpenProfile);
        window.addEventListener('openSecurityModal', handleOpenSecurity);
        window.addEventListener('openSupportModal', handleOpenSupport);
        window.addEventListener('openDoctorModal', handleOpenDoctor);

        // Check URL params for quick actions (Context Aware FAB)
        const params = new URLSearchParams(window.location.search);
        if (params.get('quick') === 'true') {
            setIsSecurityModalOpen(true);
            // Clean up URL
            window.history.replaceState({}, '', '/settings');
        }

        return () => {
            window.removeEventListener('openProfileModal', handleOpenProfile);
            window.removeEventListener('openSecurityModal', handleOpenSecurity);
            window.removeEventListener('openSupportModal', handleOpenSupport);
            window.removeEventListener('openDoctorModal', handleOpenDoctor);
        };
    }, []);

    // Fetch display ID for beautification
    useEffect(() => {
        const fetchId = async () => {
            if (profile?.id) {
                const id = await getDisplayId(profile.id);
                setDisplayId(id);
            }
        };
        fetchId();
    }, [profile?.id]);



    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
            toast.success('Signed out successfully');
            navigate('/login');
        } catch (error) {
            handleAuthError(error, 'update');
        }
    }, [signOut, navigate]);

    usePageHeader("Account Settings");

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
    };

    const getRoleBadgeStyles = (role) => {
        const styles = {
            admin: 'bg-primary/5 text-primary border-primary/20 backdrop-blur-md shadow-sm',
            sponsor: 'bg-purple-500/5 text-purple-500 border-purple-500/20 backdrop-blur-md shadow-sm',
            provider: 'bg-blue-500/5 text-blue-500 border-blue-500/20 backdrop-blur-md shadow-sm',
            viewer: 'bg-white/5 text-muted-foreground border-white/10 backdrop-blur-md shadow-sm',
        };
        return styles[role] || styles.viewer;
    };

    if (isMobile) {
        return (
            <div className="min-h-screen">
                <MobileSettings
                    loading={loading}
                    profile={profile}
                    user={user}
                    avatarUrl={avatarUrl}
                    avatarFallback={avatarFallback}
                    displayId={displayId}
                    darkMode={darkMode}
                    onToggleDarkMode={toggleDarkMode}
                    onEditProfile={() => setIsProfileModalOpen(true)}
                    onOpenSecurity={() => setIsSecurityModalOpen(true)}
                    onOpenSupport={() => setIsSupportModalOpen(true)}
                    onSignOut={handleSignOut}
                    isProvider={isProvider()}
                    onOpenDoctor={() => setIsDoctorModalOpen(true)}
                />

                <ProfileEditModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
                <SecurityModal
                    isOpen={isSecurityModalOpen}
                    onClose={() => setIsSecurityModalOpen(false)}
                />
                <SupportModal
                    isOpen={isSupportModalOpen}
                    onClose={() => setIsSupportModalOpen(false)}
                />
                {isProvider() && doctorProfile && (
                    <DoctorModal
                        isOpen={isDoctorModalOpen}
                        onClose={() => setIsDoctorModalOpen(false)}
                        doctor={doctorProfile}
                        mode="view"
                    />
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6 md:py-8 space-y-8 animate-in fade-in duration-500">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <LayoutGroup>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grid-flow-row-dense">

                    {/* Main Profile Identity Card - Spans 2 cols on Large, 1 on Mobile */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-1 lg:col-span-2"
                    >
                        <Card className="h-full squircle-3xl glass-card-premium relative overflow-hidden group">
                            {/* Apple hover glow effect */}
                            <div className="hover-glow hover-glow-primary" />
                            {/* Dynamic Background Pattern */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
                            <div className="absolute inset-0 opacity-[0.03]"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                                }}
                            />

                            {/* Header Banner */}
                            <div className="h-40 bg-gradient-to-r from-primary/10 via-background/50 to-background/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                            </div>

                            <div className="px-6 md:px-10 pb-10 -mt-20 relative z-10">
                                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
                                    <div className="relative group">
                                        <Avatar className="h-36 w-36 squircle-2xl border-[6px] border-background shadow-2xl ring-1 ring-white/10">
                                            <AvatarImage
                                                src={avatarUrl}
                                                className="object-cover"
                                                onError={(e) => {
                                                    console.error('Avatar image failed to load:', e);
                                                    console.error('Failed src:', avatarUrl);
                                                    // Mark URL as failed to prevent repeated attempts
                                                    markAvatarUrlAsFailed(avatarUrl);
                                                    // Force re-render to get fallback
                                                    e.target.style.display = 'none';
                                                }}
                                                onLoad={() => {
                                                    console.log('Avatar image loaded successfully:', avatarUrl);
                                                }}
                                            />
                                            <AvatarFallback className="squircle bg-muted text-muted-foreground font-bold text-5xl">
                                                {avatarFallback}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-success rounded-full border-4 border-background shadow-sm pulse-dot" title="Online" />
                                    </div>

                                    <div className="text-center md:text-left flex-1 min-w-0 w-full space-y-1.5">
                                        {/* Primary Identity - Full Name (No Truncation) */}
                                        <div className="space-y-1">
                                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight break-words">
                                                {profile?.username || 'User Profile'}
                                            </h2>
                                        </div>

                                        {/* Badges Row - Pushed to its own line */}
                                        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                                            {profile?.bvn_verified && (
                                                <Badge className="squircle bg-blue-500/10 text-blue-500 border-blue-500/10 backdrop-blur-md px-2.5 py-1 font-bold text-[10px] tracking-widest uppercase shadow-sm">
                                                    <Shield className="w-3 h-3 mr-1.5" />
                                                    Verified
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className={`squircle border px-3 py-1 font-black text-[10px] tracking-widest uppercase shadow-sm ${getRoleBadgeStyles(profile?.role)}`}>
                                                {profile?.role?.toUpperCase() || 'VIEWER'}
                                            </Badge>
                                        </div>

                                        {/* Secondary Identifiers - IDs and Email */}
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                                            {displayId && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md shadow-inner group/id hover:bg-white/10 transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                                                    <span className="font-mono text-[10px] tracking-tighter text-foreground/80">{displayId}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md shadow-inner group/email hover:bg-white/10 transition-colors max-w-full overflow-hidden">
                                                <Mail className="h-3 w-3 opacity-50 shrink-0" />
                                                <span className="text-[11px] tracking-tight text-muted-foreground/80 break-all">
                                                    {user?.email || profile?.email}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <Button
                                            onClick={() => setIsProfileModalOpen(true)}
                                            className="squircle-xl shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                                        >
                                            Edit Profile
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Account Details */}
                                    <div className="p-5 squircle-2xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all duration-300 group/item">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 squircle-lg bg-background shadow-sm text-primary group-hover/item:scale-110 transition-transform">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Mobile Contact</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono font-bold text-lg tracking-tight">{profile?.phone || 'Not Linked'}</p>
                                            {profile?.phone && <Badge variant="secondary" className="squircle bg-success/10 text-success text-[10px] uppercase font-bold tracking-wider">Verified</Badge>}
                                        </div>
                                    </div>

                                    {/* Subscription Plan */}
                                    <div className="p-5 squircle-2xl bg-muted/20 border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 squircle-lg bg-background shadow-sm text-secondary">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Current Plan</span>
                                        </div>
                                        <p className="font-bold text-lg tracking-tight">Free Tier</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Doctor Professional Profile */}
                    {isProvider() && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="col-span-1 lg:col-span-2"
                        >
                            <DoctorProfileCard />
                        </motion.div>
                    )}

                    {/* Right Column Layout */}
                    <div className="space-y-6 flex flex-col">

                        {/* App Preferences */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex-1"
                        >
                            <Card className="h-full squircle-3xl glass-card-premium p-6 shadow-xl flex flex-col">
                                {/* Apple hover glow effect */}
                                <div className="hover-glow hover-glow-secondary" />
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 squircle-xl surface-raised text-orange-500">
                                        <Laptop className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl leading-none">Preferences</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Customize your experience</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {/* Dark Mode Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 squircle-lg bg-muted shadow-sm">
                                                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">Dark Mode</span>
                                                <span className="text-xs text-muted-foreground">Adjust display theme</span>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={darkMode}
                                            onCheckedChange={toggleDarkMode}
                                            aria-label="Toggle dark mode"
                                        />
                                    </div>

                                    {/* Sign Out */}
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-destructive/5 transition-colors group mt-2 glass-card-premium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 squircle-lg surface-raised text-destructive shadow-sm group-hover:bg-destructive/20 transition-colors">
                                                <LogOut className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-sm text-destructive">Sign Out</span>
                                                <span className="text-xs text-muted-foreground">End your current session</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Security Snapshot */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex-1"
                        >
                            <Card className="h-full squircle-3xl glass-card-premium p-6 shadow-xl relative overflow-hidden">
                                {/* Apple hover glow effect */}
                                <div className="hover-glow hover-glow-info" />
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 squircle-xl surface-raised text-blue-500">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl leading-none">Security</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Status: {user?.app_metadata?.providers?.includes('phone') || user?.app_metadata?.aad ? 'Strong' : 'Standard'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsSecurityModalOpen(true)}
                                        className="w-full justify-between h-auto py-3 px-4 squircle-xl border-white/10 hover:bg-muted/30 font-medium"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-muted-foreground" />
                                            Change Password
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsSupportModalOpen(true)}
                                        className="w-full justify-between h-auto py-3 px-4 squircle-xl border-white/10 hover:bg-muted/30 font-medium"
                                    >
                                        <span className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                            Support Center
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </LayoutGroup>

            {/* Modals */}
            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
            <SecurityModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
            />
            <SupportModal
                isOpen={isSupportModalOpen}
                onClose={() => setIsSupportModalOpen(false)}
            />
            {isProvider() && doctorProfile && (
                <DoctorModal
                    isOpen={isDoctorModalOpen}
                    onClose={() => setIsDoctorModalOpen(false)}
                    doctor={doctorProfile}
                    mode="view"
                />
            )}
        </div>
    );
};
