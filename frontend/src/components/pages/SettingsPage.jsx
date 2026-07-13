import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { useAuth } from '../../contexts/AuthContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { useModalChromeSuppression } from '../../hooks/useModalChromeSuppression';
import { getAvatarFallback, getAvatarUrl, markAvatarUrlAsFailed } from '../../lib/avatarUtils';
import { getDisplayId } from '../../services/displayIdService';
import { handleAuthError } from '../../utils/errorHandler';
import { MobileSettings } from '../mobile/MobileSettings';
import { DoctorModal } from '../modals/DoctorModal';
import { ProfileEditModal } from '../modals/ProfileEditModal';
import { SecurityModal } from '../modals/SecurityModal';
import { Button } from '../ui/button';
import { SettingsDesktopWorkspace } from './settings/SettingsDesktopWorkspace';

const formatRoleLabel = (role) => {
    if (!role) return 'Viewer';
    return role
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

export const SettingsPage = () => {
    const {
        user,
        profile,
        signOut,
        isAdmin,
        isOrgAdmin,
        isProvider,
        isDriver,
        isSponsor,
        loading,
    } = useAuth();
    const { isMobile } = useNavigation();
    const { theme, toggleTheme } = useTheme();
    const { doctorProfile, loading: doctorProfileLoading } = useDoctorProfile();
    const navigate = useNavigate();
    const [displayId, setDisplayId] = useState(null);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

    useModalChromeSuppression(isProfileModalOpen || isSecurityModalOpen);

    const darkMode = theme === 'dark';
    const providerAccount = isProvider();
    const canOpenSupport = isAdmin() || isOrgAdmin() || providerAccount;
    const settingsLoading = Boolean(loading || (providerAccount && doctorProfileLoading && !doctorProfile));
    const avatarUrl = useMemo(() => getAvatarUrl(profile, user), [profile, user]);
    const avatarFallback = useMemo(() => getAvatarFallback(profile, user), [profile, user]);

    const roleKind = useMemo(() => {
        if (isAdmin()) return 'admin';
        if (isOrgAdmin()) return 'org_admin';
        if (isSponsor()) return 'sponsor';
        if (providerAccount) return isDriver() ? 'driver' : 'provider';
        return 'viewer';
    }, [isAdmin, isDriver, isOrgAdmin, isSponsor, providerAccount]);
    const moduleRailItems = useMemo(
        () => getConsoleModuleRailItems(roleKind),
        [roleKind]
    );

    const handleOpenProfile = useCallback(() => setIsProfileModalOpen(true), []);
    const handleOpenSecurity = useCallback(() => setIsSecurityModalOpen(true), []);
    const handleOpenDoctor = useCallback(() => {
        if (doctorProfileLoading && !doctorProfile) {
            toast.info('Professional profile is still loading');
            return;
        }

        if (!doctorProfile) {
            toast.info('No professional profile is available for this account.');
            return;
        }

        setIsDoctorModalOpen(true);
    }, [doctorProfile, doctorProfileLoading]);

    const handleOpenSupport = useCallback(() => {
        if (!isAdmin() && !isOrgAdmin() && !isProvider()) {
            toast.info('Support is unavailable for this role');
            return;
        }

        navigate('/support-tickets?add=true&from=settings');
    }, [isAdmin, isOrgAdmin, isProvider, navigate]);

    useEffect(() => {
        window.addEventListener('openProfileModal', handleOpenProfile);
        window.addEventListener('openSecurityModal', handleOpenSecurity);
        window.addEventListener('openSupportModal', handleOpenSupport);
        window.addEventListener('openDoctorModal', handleOpenDoctor);

        const params = new URLSearchParams(window.location.search);
        if (params.get('quick') === 'true') {
            setIsSecurityModalOpen(true);
            window.history.replaceState({}, '', '/settings');
        }

        return () => {
            window.removeEventListener('openProfileModal', handleOpenProfile);
            window.removeEventListener('openSecurityModal', handleOpenSecurity);
            window.removeEventListener('openSupportModal', handleOpenSupport);
            window.removeEventListener('openDoctorModal', handleOpenDoctor);
        };
    }, [handleOpenDoctor, handleOpenProfile, handleOpenSecurity, handleOpenSupport]);

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
    }, [isSigningOut, navigate, signOut]);

    const toggleDarkMode = useCallback(() => {
        toggleTheme();
    }, [toggleTheme]);

    const handleAvatarError = useCallback((event) => {
        markAvatarUrlAsFailed(avatarUrl);
        event.currentTarget.style.display = 'none';
    }, [avatarUrl]);

    const headerActions = useMemo(() => {
        if (isMobile) return null;

        return (
            <Button
                type="button"
                onClick={handleOpenProfile}
                aria-haspopup="dialog"
                aria-expanded={isProfileModalOpen}
                data-state={isProfileModalOpen ? 'open' : 'idle'}
                className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-[background,transform] hover:bg-foreground/90 active:scale-95 ${isProfileModalOpen ? 'scale-95' : ''}`}
            >
                <UserCog className="mr-2 h-4 w-4" />
                Edit profile
            </Button>
        );
    }, [handleOpenProfile, isMobile, isProfileModalOpen]);

    usePageHeader('Settings', headerActions);
    usePageFooter(null, 'status', false);
    usePageShell({ bleed: true, hideFab: true });

    const settingsRouteContext = useMemo(() => ({
        user,
        profile,
        displayId,
        avatarUrl,
        avatarFallback,
        darkMode,
        loading: settingsLoading,
        isSigningOut,
        isProvider: providerAccount,
        hasDoctorProfile: Boolean(doctorProfile),
        canOpenSupport,
        billingAvailable: false,
    }), [
        avatarFallback,
        avatarUrl,
        canOpenSupport,
        darkMode,
        displayId,
        doctorProfile,
        isSigningOut,
        profile,
        providerAccount,
        settingsLoading,
        user,
    ]);

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
                    onEditProfile={handleOpenProfile}
                    onOpenSecurity={handleOpenSecurity}
                    onOpenSupport={handleOpenSupport}
                    onSignOut={handleSignOut}
                    isSigningOut={isSigningOut}
                    isProvider={providerAccount}
                    hasDoctorProfile={Boolean(doctorProfile)}
                    doctorProfileLoading={doctorProfileLoading}
                    onOpenDoctor={handleOpenDoctor}
                />

                <ProfileEditModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
                <SecurityModal
                    isOpen={isSecurityModalOpen}
                    onClose={() => setIsSecurityModalOpen(false)}
                />
                {providerAccount && doctorProfile && (
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
        <div className="min-h-[calc(100dvh-3rem)] text-foreground">
            <SettingsDesktopWorkspace
                moduleRailItems={moduleRailItems}
                loading={settingsLoading}
                profile={profile}
                user={user}
                displayId={displayId}
                avatarUrl={avatarUrl}
                avatarFallback={avatarFallback}
                darkMode={darkMode}
                roleLabel={formatRoleLabel(profile?.role)}
                isSigningOut={isSigningOut}
                isProvider={providerAccount}
                doctorProfile={doctorProfile}
                canOpenSupport={canOpenSupport}
                onAvatarError={handleAvatarError}
                onToggleDarkMode={toggleDarkMode}
                onEditProfile={handleOpenProfile}
                onOpenSecurity={handleOpenSecurity}
                onOpenSupport={handleOpenSupport}
                onOpenDoctor={handleOpenDoctor}
                onSignOut={handleSignOut}
            />

            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
            <SecurityModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
            />
            {providerAccount && doctorProfile && (
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
