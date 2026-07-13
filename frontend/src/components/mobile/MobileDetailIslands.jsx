import React from 'react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

/**
 * MobileDetailIslands - the shared identity-island detail tiles.
 *
 * Extracted from the MobileVisits flagship (MobileVisitDetailLine) so every expanded
 * detail reads with identical anatomy: a labelled icon tile per fact, never a bare text
 * block (Mobile Energy Rollout, docs/design-system/MOBILE_ENERGY_ROLLOUT_PLAN.md,
 * criterion S6). Borderless, semantic radius, opaque content surface (never glass).
 *
 * Tiles are static by default. An item may OPTIONALLY carry `href` (tile renders as an
 * anchor - tel:/maps deep links; http(s) opens in a new tab) or `onPress` (tile renders
 * as a button). Interactive tiles get the canon control press (active:scale-[0.96]) and
 * a subtle trailing affordance icon; static tiles render exactly as before.
 *
 * @param {Array<{icon?:Function, label:string, value:React.ReactNode, href?:string, onPress?:Function}>} items
 *        falsy entries are skipped, so callers can inline conditional rows.
 * @param {string} [className]
 */
const TILE_CLASS = 'flex items-center gap-3 rounded-button bg-background/30 p-3';
const PRESS_CLASS = 'w-full text-left transition-transform duration-200 active:scale-[0.96]';

const islandAriaLabel = (item) => {
  const value = (typeof item.value === 'string' || typeof item.value === 'number') ? String(item.value) : '';
  return value ? `${item.label}: ${value}` : item.label;
};

export const MobileDetailIslands = ({ items = [], className = '' }) => {
  const rows = (items || []).filter(Boolean);
  if (!rows.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {rows.map((item, idx) => {
        const Icon = item.icon;
        const key = item.label ? `${item.label}-${idx}` : idx;
        const body = (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground">
              {Icon && <Icon size={15} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="eyebrow block">
                {item.label}
              </span>
              <span className="mt-1 block truncate text-sm font-semibold text-foreground">
                {item.value || 'Not set'}
              </span>
            </span>
          </>
        );

        if (item.href) {
          return (
            <a
              key={key}
              href={item.href}
              rel="noopener noreferrer"
              target={/^https?:/i.test(item.href) ? '_blank' : undefined}
              aria-label={islandAriaLabel(item)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`${TILE_CLASS} ${PRESS_CLASS}`}
            >
              {body}
              <ArrowUpRight size={14} className="shrink-0 text-muted-foreground/60" />
            </a>
          );
        }

        if (item.onPress) {
          return (
            <button
              key={key}
              type="button"
              onClick={item.onPress}
              aria-label={islandAriaLabel(item)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`${TILE_CLASS} ${PRESS_CLASS}`}
            >
              {body}
              <ChevronRight size={14} className="shrink-0 text-muted-foreground/60" />
            </button>
          );
        }

        return (
          <div key={key} className={TILE_CLASS}>
            {body}
          </div>
        );
      })}
    </div>
  );
};

export default MobileDetailIslands;
