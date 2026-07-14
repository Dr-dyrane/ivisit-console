import { useMemo } from 'react';
import { CalendarClock, Filter, Plus } from 'lucide-react';
import { usePageFooter, usePageHeader, usePageShell } from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';
import { hasActiveStaffFilters } from './staffPageModel';

export const useDoctorsPageChrome = (controller) => {
  const { role, state, actions } = controller;
  const { handleCreate, handleOpenFilters, handleSchedule } = actions;

  const filterButtonComponent = useMemo(() => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleOpenFilters}
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
  ), [handleOpenFilters, state.filterSheetOpen, state.filters]);

  const headerActions = useMemo(() => {
    if (!role.canManageStaff) return null;

    return (
      <div className="flex items-center gap-2">
        {role.canManageSchedules && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSchedule(null)}
            className="h-9 w-9 rounded-pill bg-muted/25 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            aria-label="Open staff schedules"
            title="Staff schedules"
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
        )}
        <Button
          onClick={handleCreate}
          className="h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-95"
          aria-label="Add staff"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add staff
        </Button>
      </div>
    );
  }, [handleCreate, handleSchedule, role.canManageSchedules, role.canManageStaff]);

  usePageHeader('Staff', headerActions, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
