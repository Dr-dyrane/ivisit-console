// Console design system - primitives (desktop workspace grammar).
// Source of truth extracted from the Requests gold standard so pages COMPOSE the
// canon instead of re-remembering it. Rules these components enforce:
//   - elevation: NEUTRAL shadow-e1/e2/e2-strong/e2-lift/e3 tokens only; colored
//     "bleeding" glows are banned everywhere except the backdrop atlas
//   - identity: circles (rounded-pill) for entity markers, squircle tokens for tiles
//   - copy affordances, film rows, stage strips and status pills share ONE markup
import React from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export const Shimmer = ({ className = '' }) => (
  <span className={`block animate-pulse bg-muted/38 dark:bg-white/[0.055] ${className}`} />
);

export const SkeletonRows = ({ count = 7, height = 'h-[80px]' }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <Shimmer key={index} className={`${height} rounded-card`} />
    ))}
  </div>
);

// Background-refetch signal (S1.6): shown while isFetching after first assembly;
// the list itself never re-skeletons.
export const UpdatingPill = () => (
  <span role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
    Updating
  </span>
);

// Click-to-copy affordance for values the operator re-keys elsewhere (phone, case
// id). Ghost pill; stopPropagation keeps the copy from bubbling into row/rail clicks.
export const CopyChip = ({ value, label }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
      if (clipboard?.writeText) {
        clipboard.writeText(String(value)).catch(() => {});
      }
      toast('Copied');
    }}
    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground active:scale-95"
    aria-label={label}
    title={label}
  >
    <Copy className="h-3 w-3" />
  </button>
);

// Status pill: tone class comes from the page's canonical status map (literal
// palette only -- the theme's info/success/warning tokens all render red).
export const StatusPill = ({ label, icon: Icon = null, className = '', compact = false }) => (
  <span className={`inline-flex w-fit max-w-full shrink-0 justify-self-start items-center gap-2 whitespace-nowrap rounded-pill font-semibold ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'} ${className}`}>
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {label}
  </span>
);

// Two-letter initials (donor: Requests getInitials): first letters of the first
// two name parts.
export const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '?';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase();
};

// Entity marker: CIRCLE (rounded-pill), status-toned well, two-letter initials.
export const TonedAvatar = ({ name, className = '', size = 'h-9 w-9', textSize = 'text-sm' }) => (
  <span className={`flex ${size} shrink-0 items-center justify-center rounded-pill ${textSize} font-semibold ${className}`}>
    {getInitials(name)}
  </span>
);

// Fill-film detail row (Today-sheet surface recipe S1.4): films over the pane,
// no per-card shadow.
export const DetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-foreground/[0.045] p-2.5 dark:bg-white/[0.055]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-background/45 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground" title={typeof value === 'string' ? value : undefined}>
        {value || 'Not set'}
      </div>
    </div>
  </div>
);

// Compact lifecycle progression: filled to the current stage; cancelled all-muted.
export const StageStrip = ({ order, fillClass, activeIndex, muted = false }) => (
  <div className="mt-3 flex w-[200px] max-w-full gap-1" aria-hidden="true">
    {order.map((stage, index) => (
      <span key={stage} className={`h-1 flex-1 rounded-pill ${!muted && index <= activeIndex ? fillClass : 'bg-muted/40'}`} />
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, heading, body, children }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-muted/16 p-10 text-center">
    <Icon className="mb-4 h-12 w-12 text-muted-foreground/65" />
    <h3 className="text-xl font-semibold">{heading}</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    {children && <div className="mt-5 flex items-center gap-2">{children}</div>}
  </div>
);

// Failed-empty: the whole list failed with nothing cached -- the scroller owns an
// honest destructive card with a working retry. Never a generic empty state.
export const LoadErrorState = ({ title, message, onRetry }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-card bg-destructive/10 p-10 text-center shadow-e2">
    <AlertCircle className="mb-4 h-12 w-12 text-destructive/75" />
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{message || 'Try again to refresh this list.'}</p>
    <Button
      type="button"
      onClick={onRetry}
      className="mt-5 h-10 rounded-button bg-foreground px-4 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

// Partial-failure notice: rows are visible but the last refetch failed; keep the
// rows and surface the failure inline.
export const ErrorBanner = ({ title, message, onRetry, testId }) => (
  <div
    className="mt-3 flex flex-col gap-3 rounded-card bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    data-testid={testId}
  >
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive/75" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p>
      </div>
    </div>
    <Button
      type="button"
      variant="ghost"
      onClick={onRetry}
      className="h-10 shrink-0 rounded-button bg-background/55 px-4 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);
