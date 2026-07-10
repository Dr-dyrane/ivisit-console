// Console design system - the full-bleed workspace stage (donor: Requests).
// ARCHITECTURE RULES LIVE HERE:
//   - the stage = ambient atlas backdrop + shared wayfinding dock + full-height
//     flex: content column (flex-1) + fixed-width detail rail aside
//   - the atlas is the ONLY sanctioned home for the ambient brand tint
//     (backdrop-only; do NOT strip it in canon audits)
//   - the detail rail aside: frosted sheet radius, lg:w-[380px] xl:w-[440px],
//     full height, drag handle -- neutral shadow-e3, never a colored glow
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConsoleModuleRail } from '../common/ConsoleModuleRail';

// Route-feedback window for the wayfinding dock pills.
export const routeFeedbackMs = 320;

// First-click-wins dock navigation with the pressed-pill feedback state.
export const useWayfindingNav = () => {
  const navigate = useNavigate();
  const [routingPath, setRoutingPath] = useState(null);

  const handleRailNavigate = useCallback((path) => {
    if (!path) return;
    setRoutingPath(path);
    window.setTimeout(() => {
      if (path !== window.location.pathname) {
        navigate(path);
      }
      setRoutingPath(null);
    }, routeFeedbackMs);
  }, [navigate]);

  return { routingPath, handleRailNavigate };
};

// Ambient atlas backdrop -- sanctioned ambient brand tint (backdrop-only).
export const ConsoleAtlasLayer = () => (
  <div className="absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--destructive) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(var(--destructive) / 0.11), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const WorkspaceStage = ({ moduleRailItems, activePath, routingPath, onRailNavigate, rail, children }) => (
  <section className="relative min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground">
    <ConsoleAtlasLayer />
    <ConsoleModuleRail
      items={moduleRailItems}
      activePath={activePath}
      routingPath={routingPath}
      onNavigate={onRailNavigate}
    />

    <div className="relative z-10 flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col gap-5 px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28">
      <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
        {children}
      </section>

      {rail}
    </div>
  </section>
);

// Fixed-width frosted detail rail aside (donor spec). Pages compose the inset
// hero, film rows, and actions inside; loading/empty variants are children too.
export const DetailRailShell = ({ children }) => (
  <aside className="relative z-20 mt-auto overflow-y-auto rounded-t-sheet bg-card/78 p-4 text-foreground shadow-e3 backdrop-blur-2xl no-scrollbar dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
    <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    {children}
  </aside>
);

// Recessed inset hero panel inside the rail (Today-sheet surface recipe S1.4).
export const RailInsetHero = ({ children }) => (
  <div className="mb-4 rounded-modal bg-background/55 p-3 dark:bg-white/[0.05] md:p-4">
    {children}
  </div>
);
