import React from 'react';
import { motion } from 'framer-motion';
import { TooltipProvider } from '../../ui/tooltip';
import { IslandNavigationFooter } from './IslandNavigationFooter';
import { IslandNavigationGroup } from './IslandNavigationGroup';
import { IslandNavigationHeader } from './IslandNavigationHeader';
import { IslandNavigationItem } from './IslandNavigationItem';
import { SidebarLayoutDialog } from './SidebarLayoutDialog';

export const IslandNavigationView = ({
  accessibleNav,
  avatarToneClass,
  configOpen,
  handleBack,
  handleNavigate,
  handleNavBlur,
  handleNavKeyDown,
  handleSidebarModeSelect,
  isBroad,
  isNotHome,
  isScrolledDown,
  navWidth,
  onNavFocus,
  onNavMouseEnter,
  onNavMouseLeave,
  openGroups,
  pathname,
  profile,
  setConfigOpen,
  sidebarMode,
  theme,
  toggleGroup,
  toggleTheme,
  user,
}) => (
  <TooltipProvider delayDuration={0}>
    <motion.nav
      onMouseEnter={onNavMouseEnter}
      onMouseLeave={onNavMouseLeave}
      onFocus={onNavFocus}
      onBlur={handleNavBlur}
      onKeyDown={handleNavKeyDown}
      animate={{ width: navWidth, x: 0 }}
      transition={{ type: 'spring', stiffness: 250, damping: 28 }}
      className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col backdrop-blur-sm ${isScrolledDown ? 'bg-background/70' : 'bg-background/30'}`}
      aria-label="Primary desktop"
      data-desktop-nav-shell="true"
      data-modal-chrome="true"
    >
      <IslandNavigationHeader
        isBroad={isBroad}
        isNotHome={isNotHome}
        onBack={handleBack}
      />

      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar py-4 mt-4">
        <div className="space-y-1">
          {accessibleNav.main.map((item) => (
            <IslandNavigationItem
              key={item.id}
              isBroad={isBroad}
              item={item}
              onNavigate={handleNavigate}
              pathname={pathname}
            />
          ))}
        </div>

        <div className="mx-4 py-1" aria-hidden="true" />

        {[accessibleNav.ops, accessibleNav.mgmt, accessibleNav.finance].filter(Boolean).map((groupConfig) => (
          <IslandNavigationGroup
            key={groupConfig?.id}
            groupConfig={groupConfig}
            isBroad={isBroad}
            onNavigate={handleNavigate}
            onToggle={toggleGroup}
            openGroups={openGroups}
            pathname={pathname}
          />
        ))}
      </div>

      <IslandNavigationFooter
        avatarToneClass={avatarToneClass}
        configOpen={configOpen}
        isBroad={isBroad}
        onNavigate={handleNavigate}
        onOpenLayout={() => setConfigOpen(true)}
        onToggleTheme={toggleTheme}
        profile={profile}
        theme={theme}
        user={user}
      />

      <SidebarLayoutDialog
        onOpenChange={setConfigOpen}
        onSelectMode={handleSidebarModeSelect}
        open={configOpen}
        sidebarMode={sidebarMode}
      />
    </motion.nav>
  </TooltipProvider>
);
