import { useMemo } from 'react';
import { Filter, Plus } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';
import { hasActiveStaffFilters } from './staffPageModel';

export const useDoctorsPageChrome = (controller) => {
  const { role, state, actions } = controller;

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={actions.handleOpenFilters}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter staff"
      aria-haspopup="dialog"
      aria-expanded={state.filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasActiveStaffFilters(state.filters) && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />
      )}
    </Button>
  ), [actions.handleOpenFilters, state.filterSheetOpen, state.filters]);

  const headerActions = useMemo(() => {
    if (!role.canManageStaff) return null;

    return (
      <Button
        onClick={actions.handleCreate}
        className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
        aria-label="Add staff"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add staff
      </Button>
    );
  }, [actions.handleCreate, role.canManageStaff]);

  usePageHeader('Staff', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
