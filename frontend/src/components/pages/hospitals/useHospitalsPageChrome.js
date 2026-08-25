import { useMemo } from 'react';
import { FileCheck, Filter } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';
import { hasActiveHospitalFilters } from './hospitalPageModel';

export const useHospitalsPageChrome = (controller) => {
  const { role, state, actions } = controller;

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={actions.handleOpenFilters}
      data-state={state.filterSheetOpen ? 'open' : 'idle'}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter hospitals"
      aria-haspopup="dialog"
      aria-expanded={state.filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasActiveHospitalFilters(state.filters) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [actions.handleOpenFilters, state.filterSheetOpen, state.filters]);

  const headerActions = useMemo(() => {
    if (!role.canReviewFacilityApprovals) return null;

    const opening = state.activeActionFeedback === 'facility-approvals';
    return (
      <Button
        onClick={actions.handleFacilityApprovals}
        title="Review pending facility approvals"
        aria-busy={opening}
        data-state={opening ? 'opening' : 'idle'}
        className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95 ${opening ? 'scale-95' : ''}`}
        aria-label="Facility approvals"
      >
        <FileCheck className="mr-2 h-4 w-4" />
        Facility approvals
      </Button>
    );
  }, [actions.handleFacilityApprovals, role.canReviewFacilityApprovals, state.activeActionFeedback]);

  usePageHeader('Hospitals', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
