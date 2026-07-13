import React, { useMemo } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';

export const useAnalyticsPageChrome = ({ state, actions }) => {
  const { detailsOpening } = state;
  const { handleOpenDetails } = actions;
  const headerActions = useMemo(() => (
    <Button
      type="button"
      onClick={handleOpenDetails}
      aria-busy={detailsOpening}
      data-state={detailsOpening ? 'opening' : 'idle'}
      aria-label={detailsOpening ? 'Opening detailed statistics' : 'View detailed statistics'}
      className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-[background,transform] hover:bg-foreground/90 active:scale-95 ${detailsOpening ? 'scale-95' : ''}`}
    >
      {detailsOpening
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <BarChart3 className="mr-2 h-4 w-4" />}
      {detailsOpening ? 'Opening...' : 'View details'}
    </Button>
  ), [detailsOpening, handleOpenDetails]);

  usePageHeader('Statistics', headerActions);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
