import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { getConsoleModuleRailItems } from '../../../config/consoleModuleRail';
import { Button } from '../../ui/button';
import { useWayfindingNav } from '../../console/WorkspaceStage';

export const usePricingPageChrome = ({
  roleKind,
  analyticsModalOpen,
  handleOpenPricingStats,
}) => {
  const headerActions = useMemo(() => (
    <Button
      onClick={handleOpenPricingStats}
      data-state={analyticsModalOpen ? 'open' : 'idle'}
      aria-label="Pricing stats"
      aria-haspopup="dialog"
      aria-expanded={analyticsModalOpen}
      className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
    >
      <BarChart3 className="mr-2 h-4 w-4" />
      Pricing stats
    </Button>
  ), [analyticsModalOpen, handleOpenPricingStats]);

  usePageHeader('Pricing', headerActions);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const moduleRailItems = useMemo(
    () => getConsoleModuleRailItems(roleKind),
    [roleKind],
  );
  const { routingPath, handleRailNavigate } = useWayfindingNav();

  return {
    handleRailNavigate,
    moduleRailItems,
    routingPath,
  };
};
