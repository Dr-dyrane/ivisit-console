import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ConsoleStartupOverlay } from '../components/common/ConsoleStartupOverlay';
import { IslandNavigation } from '../components/common/IslandNavigation';
import { ContextAwareFAB } from '../components/navigation/ContextAwareFAB';
import { DynamicBottomBar } from '../components/navigation/DynamicBottomBar';
import { ContextPanelShell } from '../components/navigation/ResponsiveSidebar';
import { SmartFooter } from '../components/navigation/SmartFooter';
import { SmartHeader } from '../components/navigation/SmartHeader';
import { useLayout } from '../contexts/LayoutContext';
import { shouldHideShellChrome } from './shellVisibility';

export const AppShell = ({ children }) => {
  const location = useLocation();
  const { isScrolledDown, sidebarWidth, pageShellConfig } = useLayout();
  const hideNav = shouldHideShellChrome(location.pathname);
  const isMobile = window.innerWidth < 768;
  const isBleedPage = !hideNav && pageShellConfig?.bleed;

  return (
    <div className="relative h-screen w-full text-foreground overflow-hidden flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-[0_20px_64px_rgb(0_0_0/0.14)] focus:backdrop-blur-xl"
      >
        Skip to content
      </a>

      {!hideNav && <SmartHeader />}

      <div className="flex-1 flex relative overflow-hidden">
        {!hideNav && (
          <div className="flex-none z-50 hidden md:block">
            <IslandNavigation />
          </div>
        )}

        <main
          id="main-content"
          className={`flex-1 bg-background dark:bg-background relative overflow-y-auto overflow-x-hidden scroll-smooth ${(isMobile || isBleedPage) ? 'no-scrollbar' : 'custom-scrollbar'} transition-all duration-300 ${!hideNav ? (isMobile ? "pt-12 md:pt-16" : "pt-16") : ""}`}
        >
          <motion.div
            layout
            initial={false}
            animate={{
              paddingLeft: hideNav ? 0 : (window.innerWidth >= 768 ? sidebarWidth + (isBleedPage ? 20 : 48) : 0),
              paddingRight: (isMobile || isBleedPage) ? 0 : 48,
              paddingTop: (hideNav || isMobile) ? 0 : (isBleedPage ? 0 : (isScrolledDown ? 0 : 16)),
              paddingBottom: hideNav ? 0 : 'calc(16px + var(--safe-bottom))',
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10"
          >
            <div className={(hideNav || isBleedPage) ? "" : "md:p-6"}>
              {children}
            </div>
          </motion.div>
        </main>

        {!hideNav && (
          <div className="flex-none z-40">
            <ContextPanelShell />
          </div>
        )}
      </div>

      {!hideNav && (
        <>
          <SmartFooter />
          {!pageShellConfig?.hideFab && <ContextAwareFAB />}
          <DynamicBottomBar />
        </>
      )}

      <ConsoleStartupOverlay disabled={hideNav} />
    </div>
  );
};
