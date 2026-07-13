import React, { useMemo } from 'react';
import { BarChart3, Filter } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';

export const useSubscriptionPageChrome = (controller) => {
  const { analyticsModalOpen, filterSheetOpen, hasSubscriberFilters } = controller.state;
  const { handleOpenFilters, handleViewAnalytics } = controller.actions;

  const headerActions = useMemo(() => (
    <Button
      onClick={handleViewAnalytics}
      data-state={analyticsModalOpen ? 'open' : 'idle'}
      aria-label="Subscriber stats"
      aria-haspopup="dialog"
      aria-expanded={analyticsModalOpen}
      className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
    >
      <BarChart3 className="mr-2 h-4 w-4" />
      Subscriber stats
    </Button>
  ), [analyticsModalOpen, handleViewAnalytics]);

  const filterButtonComponent = useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
      data-state={filterSheetOpen ? 'open' : hasSubscriberFilters ? 'active' : 'idle'}
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
      className="relative h-9 w-9 rounded-icon bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter subscribers"
    >
      <Filter className="h-4 w-4" />
      {hasSubscriberFilters && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [filterSheetOpen, handleOpenFilters, hasSubscriberFilters]);

  usePageHeader('Email Subscribers', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
