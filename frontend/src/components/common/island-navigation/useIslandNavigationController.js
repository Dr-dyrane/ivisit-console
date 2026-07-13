import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessibleNav } from '../../../config/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  getActiveNavigationGroup,
  getAvatarToneClass,
  getIsBroad,
} from './islandNavigationModel';

export const useIslandNavigationController = () => {
  const { sidebarMode, setSidebarMode, isScrolledDown } = useLayout();
  const { profile, user, can } = useAuth();
  const { toggle, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [openGroups, setOpenGroups] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  const accessibleNav = useMemo(
    () => getAccessibleNav(profile, can),
    [profile, can],
  );
  const isBroad = useMemo(
    () => getIsBroad({ sidebarMode, isHovered, isFocusWithin }),
    [sidebarMode, isHovered, isFocusWithin],
  );

  useEffect(() => {
    const activeGroup = getActiveNavigationGroup(accessibleNav, location.pathname);
    if (activeGroup) setOpenGroups([activeGroup]);
  }, [location.pathname, accessibleNav]);

  const closeSmartReveal = () => {
    if (sidebarMode !== 'smart') return;
    setIsHovered(false);
    setIsFocusWithin(false);
  };

  const handleNavigate = (path) => {
    closeSmartReveal();
    navigate(path);
  };

  const handleBack = () => {
    closeSmartReveal();
    navigate(-1);
  };

  const handleNavBlur = (event) => {
    const nextTarget = event.relatedTarget;
    if (!event.currentTarget.contains(nextTarget)) {
      closeSmartReveal();
    }
  };

  const handleNavKeyDown = (event) => {
    if (event.key === 'Tab' && sidebarMode === 'smart') {
      setIsHovered(false);
    }

    if (event.key === 'Escape') {
      closeSmartReveal();
    }
  };

  const handleSidebarModeSelect = (mode) => {
    setSidebarMode(mode);
    setTimeout(() => setConfigOpen(false), 200);
  };

  const toggleGroup = (groupId) => {
    setOpenGroups((previous) => previous.includes(groupId) ? [] : [groupId]);
  };

  return {
    accessibleNav,
    avatarToneClass: getAvatarToneClass(profile?.role),
    configOpen,
    handleBack,
    handleNavigate,
    handleNavBlur,
    handleNavKeyDown,
    handleSidebarModeSelect,
    isBroad,
    isNotHome: location.pathname !== '/',
    isScrolledDown,
    navWidth: isBroad ? 260 : 72,
    onNavFocus: () => setIsFocusWithin(true),
    onNavMouseEnter: () => setIsHovered(true),
    onNavMouseLeave: () => setIsHovered(false),
    openGroups,
    pathname: location.pathname,
    profile,
    setConfigOpen,
    sidebarMode,
    theme,
    toggleGroup,
    toggleTheme: toggle,
    user,
  };
};
