import React from 'react';

/**
 * MobileDetailIslands - the shared identity-island detail tiles.
 *
 * Extracted from the MobileVisits flagship (MobileVisitDetailLine) so every expanded
 * detail reads with identical anatomy: a labelled icon tile per fact, never a bare text
 * block (Mobile Energy Rollout, docs/design-system/MOBILE_ENERGY_ROLLOUT_PLAN.md,
 * criterion S6). Borderless, semantic radius, opaque content surface (never glass).
 *
 * @param {Array<{icon?:Function, label:string, value:React.ReactNode}>} items
 *        falsy entries are skipped, so callers can inline conditional rows.
 * @param {string} [className]
 */
export const MobileDetailIslands = ({ items = [], className = '' }) => {
  const rows = (items || []).filter(Boolean);
  if (!rows.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {rows.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={item.label ? `${item.label}-${idx}` : idx} className="flex items-center gap-3 rounded-button bg-background/30 p-3">
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
          </div>
        );
      })}
    </div>
  );
};

export default MobileDetailIslands;
