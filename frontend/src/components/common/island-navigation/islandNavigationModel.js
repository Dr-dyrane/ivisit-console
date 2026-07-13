import { Laptop, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const SIDEBAR_LAYOUT_OPTIONS = [
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
];

export const normalizeNavigationPathname = (pathname) => {
  const value = String(pathname || '/');
  if (value === '/') return value;
  return value.replace(/\/+$/, '') || '/';
};

export const getActiveNavigationGroup = (accessibleNav, pathname) => {
  const normalizedPathname = normalizeNavigationPathname(pathname);
  if (accessibleNav.ops?.items.some((item) => item.path === normalizedPathname)) return 'ops';
  if (accessibleNav.mgmt?.items.some((item) => item.path === normalizedPathname)) return 'mgmt';
  if (accessibleNav.finance?.items.some((item) => item.path === normalizedPathname)) return 'finance';
  return null;
};

export const getAvatarToneClass = (role) => {
  if (role === 'admin') {
    return 'bg-[hsl(var(--spark)/0.14)] text-[hsl(var(--spark)/0.92)]';
  }
  if (role === 'org_admin') {
    return 'bg-blue-500/15 text-blue-500 dark:text-blue-100';
  }
  if (role === 'provider') {
    return 'bg-green-500/15 text-green-500 dark:text-green-100';
  }
  if (role === 'sponsor') {
    return 'bg-purple-500/15 text-purple-500 dark:text-purple-100';
  }
  return 'bg-muted text-muted-foreground';
};

export const getIsBroad = ({ sidebarMode, isHovered, isFocusWithin }) => {
  if (sidebarMode === 'expanded') return true;
  if (sidebarMode === 'collapsed') return false;
  return isHovered || isFocusWithin;
};
