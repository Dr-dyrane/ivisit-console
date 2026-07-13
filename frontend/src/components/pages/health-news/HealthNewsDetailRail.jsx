import React from 'react';
import {
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Info,
  Newspaper,
  Tag,
} from 'lucide-react';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import {
  CopyChip,
  DetailLine,
  Shimmer,
} from '../../console/primitives';
import { Button } from '../../ui/button';
import {
  formatHealthNewsDate,
  getStatusMeta,
} from './healthNewsPageModel';

export const HealthNewsDetailRail = ({
  news,
  loading,
  hasFilter,
  onView,
  activeActionFeedback,
}) => {
  if (loading && !news) {
    return (
      <DetailRailShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Shimmer key={index} className="h-[52px] w-full rounded-inner" />
          ))}
        </div>
      </DetailRailShell>
    );
  }

  if (!news) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Newspaper className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No article selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Articles that match your filters will appear here.' : 'Select an article to see its details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const statusMeta = getStatusMeta(news.published);
  const hostLabel = news.source_host || news.source || 'Unknown source';
  const displayId = news.id ? `Article ${String(news.id).slice(0, 8)}` : null;
  const viewOpening = activeActionFeedback === `view-${news.id}`;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Article details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={news.id} label="Copy article ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Newspaper className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(news)}
            aria-label="Open full article details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={news.title || 'Untitled article'}>{news.title || 'Untitled article'}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatHealthNewsDate(news.created_at)}
          </p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Globe} label="Source" value={hostLabel} />
        <DetailLine icon={Tag} label="Category" value={news.category || 'General'} />
        <DetailLine icon={Clock} label="Published" value={formatHealthNewsDate(news.created_at)} />
        <DetailLine icon={Eye} label="Link" value={news.source_url_valid ? 'Valid link' : 'No valid link'} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(news)}
          data-state={viewOpening ? 'opening' : 'idle'}
          aria-busy={viewOpening}
        >
          <Eye className="mr-2 h-5 w-5" />
          {viewOpening ? 'Opening' : 'View details'}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          Writing, publish changes, imports, and deletion stay locked until the content receiver is proved.
        </div>
      </div>
    </DetailRailShell>
  );
};
