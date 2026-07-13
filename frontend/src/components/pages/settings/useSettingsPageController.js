import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useDoctorProfile } from '../../../hooks/useDoctorProfile';
import { useModalChromeSuppression } from '../../../hooks/useModalChromeSuppression';
import { getAvatarFallback, getAvatarUrl, markAvatarUrlAsFailed } from '../../../lib/avatarUtils';
import { handleAuthError } from '../../../utils/errorHandler';
import {
  buildSettingsRouteContext,
  formatSettingsRoleLabel,
  resolveSettingsLoading,
  resolveSettingsRoleKind,
} from './settingsPageModel';
import {
  useSettingsActionBridge,
  useSettingsDisplayId,
  useSettingsRouteContextPublisher,
} from './useSettingsRouteBridge';
import { useSettingsPageChrome } from './useSettingsPageChrome';

export const useSettingsPageController = () => {
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  useModalChromeSuppression(isProfileModalOpen || isSecurityModalOpen);

  const displayId = useSettingsDisplayId(profile?.id);
  const darkMode = theme === 'dark';
  const providerAccount = isProvider();
  const adminAccount = isAdmin();
  const orgAdminAccount = isOrgAdmin();
  const sponsorAccount = isSponsor();
  const driverAccount = isDriver();
  const canOpenSupport = adminAccount || orgAdminAccount || providerAccount;
  const settingsLoading = resolveSettingsLoading({
    authLoading: loading,
    provider: providerAccount,
    doctorProfileLoading,
    doctorProfile,
  });
  const avatarUrl = useMemo(() => getAvatarUrl(profile, user), [profile, user]);
  const avatarFallback = useMemo(() => getAvatarFallback(profile, user), [profile, user]);
  const roleKind = resolveSettingsRoleKind({
    admin: adminAccount,
    orgAdmin: orgAdminAccount,
    sponsor: sponsorAccount,
    provider: providerAccount,
    driver: driverAccount,
  });
  const moduleRailItems = useMemo(() => getConsoleModuleRailItems(roleKind), [roleKind]);

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

  useSettingsActionBridge({
    onOpenProfile: handleOpenProfile,
    onOpenSecurity: handleOpenSecurity,
    onOpenSupport: handleOpenSupport,
    onOpenDoctor: handleOpenDoctor,
  });

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

  useSettingsPageChrome({
    isMobile,
    isProfileModalOpen,
    onOpenProfile: handleOpenProfile,
  });

  const settingsRouteContext = useMemo(() => buildSettingsRouteContext({
    user,
    profile,
    displayId,
    avatarUrl,
    avatarFallback,
    darkMode,
    loading: settingsLoading,
    isSigningOut,
    isProvider: providerAccount,
    doctorProfile,
    canOpenSupport,
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

  useSettingsRouteContextPublisher(settingsRouteContext);

  return {
    isMobile,
    isProfileModalOpen,
    isSecurityModalOpen,
    isDoctorModalOpen,
    providerAccount,
    doctorProfile,
    onCloseProfile: () => setIsProfileModalOpen(false),
    onCloseSecurity: () => setIsSecurityModalOpen(false),
    onCloseDoctor: () => setIsDoctorModalOpen(false),
    mobileProps: {
      loading,
      profile,
      user,
      avatarUrl,
      avatarFallback,
      displayId,
      darkMode,
      onToggleDarkMode: toggleDarkMode,
      onEditProfile: handleOpenProfile,
      onOpenSecurity: handleOpenSecurity,
      onOpenSupport: handleOpenSupport,
      onSignOut: handleSignOut,
      isSigningOut,
      isProvider: providerAccount,
      hasDoctorProfile: Boolean(doctorProfile),
      doctorProfileLoading,
      onOpenDoctor: handleOpenDoctor,
    },
    desktopProps: {
      moduleRailItems,
      loading: settingsLoading,
      profile,
      user,
      displayId,
      avatarUrl,
      avatarFallback,
      darkMode,
      roleLabel: formatSettingsRoleLabel(profile?.role),
      isSigningOut,
      isProvider: providerAccount,
      doctorProfile,
      canOpenSupport,
      onAvatarError: handleAvatarError,
      onToggleDarkMode: toggleDarkMode,
      onEditProfile: handleOpenProfile,
      onOpenSecurity: handleOpenSecurity,
      onOpenSupport: handleOpenSupport,
      onOpenDoctor: handleOpenDoctor,
      onSignOut: handleSignOut,
    },
  };
};
