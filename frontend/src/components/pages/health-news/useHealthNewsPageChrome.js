import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import {
  usePageFooter,
  usePageHeader,
  usePageShell,
} from '../../../contexts/LayoutContext';
import { Button } from '../../ui/button';

export const useHealthNewsPageChrome = ({
  filterSheetOpen,
  hasFilter,
  onOpenFilters,
}) => {
  const filterButtonComponent = useMemo(() => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpenFilters}
      className="squircle h-9 w-9 bg-muted/20 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
      aria-label="Filter health news"
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
    >
      <Filter className="h-4 w-4" />
      {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-sky-500" />}
    </Button>
  ), [filterSheetOpen, hasFilter, onOpenFilters]);

  usePageHeader('Health News', null, null, filterButtonComponent);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });
};
