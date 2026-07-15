import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TABLET_FOCUS_RING } from './TabletCollectionPage';

export const TabletPaginationFooter = ({ pagination, loading = false }) => (
  <div className="flex items-center justify-between gap-2" aria-label="Pagination">
    <button
      type="button"
      onClick={pagination.prevPage}
      disabled={!pagination.hasPrevPage || loading}
      className={`flex h-11 items-center gap-1 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold text-foreground transition-all active:scale-95 disabled:opacity-35 ${TABLET_FOCUS_RING}`}
    >
      <ChevronLeft className="h-4 w-4" />
      Previous
    </button>
    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
      Page {pagination.currentPage} of {pagination.totalPages}
    </span>
    <button
      type="button"
      onClick={pagination.nextPage}
      disabled={!pagination.hasNextPage || loading}
      className={`flex h-11 items-center gap-1 rounded-button bg-foreground/[0.055] px-3 text-xs font-semibold text-foreground transition-all active:scale-95 disabled:opacity-35 ${TABLET_FOCUS_RING}`}
    >
      Next
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);
