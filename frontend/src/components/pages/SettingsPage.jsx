import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getDisplayId } from '../../services/displayIdService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mail, Shield, LogOut, Moon, Sun, Smartphone, CreditCard, ChevronRight, Laptop, Key, HelpCircle } from 'lucide-react';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { handleAuthError } from "../../utils/errorHandler";
import { getAvatarUrl, getAvatarFallback, markAvatarUrlAsFailed } from '../../lib/avatarUtils';
import { usePageHeader } from '../../contexts/LayoutContext';

import { ProfileEditModal } from '../modals/ProfileEditModal';
import { SecurityModal } from '../modals/SecurityModal';
import { DoctorModal } from '../modals/DoctorModal';
import { DoctorProfileCard } from '../views/DoctorProfileCard';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { MobileSettings } from '../mobile/MobileSettings';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingsPage = () => {
    const { user, profile, signOut, isAdmin, isOrgAdmin, isProvider, loading } = useAuth();
    const { isMobile } = useNavigation();
    const { theme, toggleTheme } = useTheme();
    const { doctorProfile } = useDoctorProfile();
    const [displayId, setDisplayId] = useState(null);
    const darkMode = theme === 'dark';
    const navigate = useNavigate();
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Memoize avatar URL and fallback to prevent excessive re-computation
    const avatarUrl = useMemo(() => getAvatarUrl(profile, user), [profile, user]);
    const avatarFallback = useMemo(() => getAvatarFallback(profile, user), [profile, user]);

    // Modal States
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

    const handleOpenSupport = useCallback(() => {
        if (!isAdmin() && !isOrgAdmin() && !isProvider()) {
            toast.info('Support is unavailable for this role');
            return;
        }

        navigate('/support-tickets?add=true&from=settings');
    }, [isAdmin, isOrgAdmin, isProvider, navigate]);

    useEffect(() => {
        const handleOpenProfile = () => setIsProfileModalOpen(true);
        const handleOpenSecurity = () => setIsSecurityModalOpen(true);
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
    }, [handleOpenSupport]);

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
        if (isSigningOut) return;
        setIsSigningOut(true);

        try {
            await signOut();
            toast.success('Signed out successfully');
            navigate('/login');
        } catch (error) {
            setIsSigningOut(false);
            handleAuthError(error, 'update');
        }
    }, [isSigningOut, signOut, navigate]);

    usePageHeader("Settings");

    const toggleDarkMode = useCallback(() => {
        toggleTheme();
    }, [toggleTheme]);

    const formatRoleLabel = (role) => {
        if (!role) return 'Viewer';
        return role
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const getRoleBadgeStyles = (role) => {
        const styles = {
            admin: 'bg-muted text-muted-foreground shadow-sm',
            sponsor: 'bg-purple-500/10 text-purple-500 shadow-sm',
            provider: 'bg-blue-500/10 text-blue-500 shadow-sm',
            viewer: 'bg-muted/40 text-muted-foreground shadow-sm',
        };
        return styles[role] || styles.viewer;
    };

    const settingsRouteContext = useMemo(() => ({
        user,
        profile,
        displayId,
        avatarUrl,
        avatarFallback,
        darkMode,
        loading,
        isSigningOut,
        isProvider: isProvider(),
        hasDoctorProfile: Boolean(doctorProfile),
        canOpenSupport: isAdmin() || isOrgAdmin() || isProvider(),
        billingAvailable: false,
    }), [avatarFallback, avatarUrl, darkMode, displayId, doctorProfile, isAdmin, isOrgAdmin, isProvider, isSigningOut, loading, profile, user]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const publishSettingsRouteContext = () => window.dispatchEvent(new CustomEvent('settingsRouteContextUpdated', { detail: settingsRouteContext }));
        publishSettingsRouteContext();
        window.addEventListener('requestSettingsRouteContext', publishSettingsRouteContext);
        return () => window.removeEventListener('requestSettingsRouteContext', publishSettingsRouteContext);
    }, [settingsRouteContext]);

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
                    onOpenSupport={handleOpenSupport}
                    onSignOut={handleSignOut}
                    isSigningOut={isSigningOut}
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
        <div className="min-h-screen space-y-8 py-6 md:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grid-flow-row-dense">

                    {/* Main Profile Identity Card - Spans 2 cols on Large, 1 on Mobile */}
                    <div className="col-span-1 lg:col-span-2">
                        <div className="group relative h-full overflow-hidden rounded-card bg-card/80 shadow-sm">
                            <div className="h-32 bg-muted/35" />

                            <div className="px-6 md:px-10 pb-10 -mt-20 relative z-10">
                                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
                                    <div className="relative group">
                                        <Avatar className="h-36 w-36 rounded-card bg-background shadow-sm">
                                            <AvatarImage
                                                src={avatarUrl}
                                                className="object-cover"
                                                onError={(e) => {
                                                    markAvatarUrlAsFailed(avatarUrl);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                            <AvatarFallback className="squircle bg-muted text-muted-foreground font-bold text-5xl">
                                                {avatarFallback}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    <div className="text-center md:text-left flex-1 min-w-0 w-full space-y-1.5">
                                        {/* Primary Identity - Full Name (No Truncation) */}
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-bold text-foreground leading-tight break-words">
                                                {profile?.full_name
                                                    || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
                                                    || profile?.username
                                                    || 'User Profile'}
                                            </h2>
                                        </div>

                                        {/* Badges Row - Pushed to its own line */}
                                        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                                            {profile?.bvn_verified && (
                                                <Badge className="rounded-pill bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-500 shadow-sm">
                                                    <Shield className="w-3 h-3 mr-1.5" />
                                                    Verified
                                                </Badge>
                                            )}
                                            <Badge className={`rounded-pill px-3 py-1 text-[10px] font-semibold ${getRoleBadgeStyles(profile?.role)}`}>
                                                {formatRoleLabel(profile?.role)}
                                            </Badge>
                                        </div>

                                        {/* Secondary Identifiers - IDs and Email */}
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                                            {displayId && (
                                                <div className="flex items-center gap-2 rounded-pill bg-muted/30 px-3 py-1.5 shadow-inner transition-colors group/id hover:bg-muted/40">
                                                    <div className="h-1.5 w-1.5 rounded-pill bg-muted-foreground pulse-dot" />
                                                    <span className="font-mono text-[10px] text-foreground/80">{displayId}</span>
                                                </div>
                                            )}
                                            <div className="flex max-w-full items-center gap-2 overflow-hidden rounded-pill bg-muted/30 px-3 py-1.5 shadow-inner transition-colors group/email hover:bg-muted/40">
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
                                            className="rounded-button bg-foreground px-6 font-semibold text-background shadow-lg hover:bg-foreground/90"
                                        >
                                            Edit Profile
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Account Details */}
                                    <div className="group/item rounded-inner bg-muted/20 p-5 shadow-sm transition-all duration-300 hover:bg-muted/30">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="rounded-icon bg-background p-2.5 text-muted-foreground shadow-sm transition-transform group-hover/item:scale-110">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-semibold text-muted-foreground">Mobile contact</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono font-bold text-lg tracking-tight">{profile?.phone || 'Not Linked'}</p>
                                        </div>
                                    </div>

                                    {/* Billing readiness */}
                                    <div className="rounded-inner bg-muted/20 p-5 shadow-sm transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="rounded-icon bg-background p-2.5 text-muted-foreground shadow-sm">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-semibold text-muted-foreground">Billing</span>
                                        </div>
                                        <p className="font-bold text-lg tracking-tight">Plan unavailable</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Billing source not verified</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Doctor Professional Profile */}
                    {isProvider() && (
                        <div className="col-span-1 lg:col-span-2">
                            <DoctorProfileCard />
                        </div>
                    )}

                    {/* Right Column Layout */}
                    <div className="space-y-6 flex flex-col">

                        {/* App Preferences */}
                        <div className="flex-1">
                            <div className="flex h-full flex-col rounded-card bg-card/75 p-6 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="rounded-icon surface-raised p-3 text-orange-500">
                                        <Laptop className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl leading-none">Preferences</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Customize your experience</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {/* Dark Mode Toggle */}
                                    <div className="flex items-center justify-between rounded-inner p-3 transition-colors hover:bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-icon bg-muted p-2 shadow-sm">
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
                                        disabled={isSigningOut}
                                        aria-busy={isSigningOut ? 'true' : undefined}
                                        data-state={isSigningOut ? 'pending' : 'ready'}
                                        className={`group mt-2 flex w-full items-center justify-between rounded-inner bg-card/70 p-3 shadow-sm transition-colors ${isSigningOut ? 'cursor-wait opacity-75' : 'hover:bg-destructive/5'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-icon surface-raised p-2 text-destructive shadow-sm transition-colors group-hover:bg-destructive/20">
                                                <LogOut className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-sm text-destructive">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                                                <span className="text-xs text-muted-foreground">End your current session</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Security Snapshot */}
                        <div className="flex-1">
                            <div className="relative h-full overflow-hidden rounded-card bg-card/75 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-icon surface-raised p-3 text-blue-500">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl leading-none">Security</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Review password and authentication options</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsSecurityModalOpen(true)}
                                        className="h-auto w-full justify-between rounded-button bg-muted/20 px-4 py-3 font-medium shadow-sm hover:bg-muted/30"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-muted-foreground" />
                                            Change Password
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleOpenSupport}
                                        className="h-auto w-full justify-between rounded-button bg-muted/20 px-4 py-3 font-medium shadow-sm hover:bg-muted/30"
                                    >
                                        <span className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                            Support Center
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Modals */}
            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
            <SecurityModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
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
