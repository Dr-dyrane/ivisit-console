// Mobile canon kit - loading truth (CANON_COMPONENT_SPECS S9).
//   - useSkeletonWarmup: forced skeleton on EVERY mount (covers cached bottom-nav
//     mounts); mobile-only idiom, SKELETON_WARMUP_MS = 400.
//   - UpdatingPill: the ONLY background-refetch signal; the list never re-skeletons.
//   - SkeletonGroupPanel: group-shaped scaffold that mirrors the REAL grouped-list
//     layout 1:1 (same panel class, row rhythm, hairline inset) so content replaces
//     it with zero jump. aria-hidden always.
import React, { useEffect, useState } from 'react';
import { SKELETON_WARMUP_MS } from './constants';
import { GROUP_PANEL_FROSTED, GROUP_PANEL_FLAT, Hairline } from './GroupedList';

export const useSkeletonWarmup = () => {
  const [warmingUp, setWarmingUp] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWarmingUp(false), SKELETON_WARMUP_MS);
    return () => clearTimeout(t);
  }, []);
  return warmingUp;
};

export const UpdatingPill = () => (
  <span role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
    Updating
  </span>
);

// List-page anchor row: right-aligned under the KPI rail (ME:400-406).
export const UpdatingPillRow = ({ show }) => (
  <div className="mt-4 flex items-center justify-end px-2">
    {show && <UpdatingPill />}
  </div>
);

const ORB_SKELETON = {
  40: 'h-10 w-10 rounded-pill bg-muted/25 shimmer',
  36: 'h-9 w-9 rounded-pill bg-muted/25 shimmer',
};

// One group-shaped scaffold: header bars + panel + rows + hairlines.
export const SkeletonGroupPanel = ({ rows = 3, orbSize = 40, frosted = true }) => (
  <div aria-hidden="true">
    <div className="flex items-center justify-between px-1 pb-2.5">
      <span className="h-[13px] w-24 rounded-pill bg-muted/25 shimmer" />
      <span className="h-[13px] w-5 rounded-pill bg-muted/25 shimmer" />
    </div>
    <div className={frosted ? GROUP_PANEL_FROSTED : GROUP_PANEL_FLAT}>
      {Array.from({ length: rows }).map((_, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center gap-3 px-2 py-3">
            <span className={ORB_SKELETON[orbSize] || ORB_SKELETON[40]} />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="block h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer" />
              <span className="block h-3 w-3/5 rounded-pill bg-muted/25 shimmer" />
            </span>
            <span className="h-6 w-14 shrink-0 rounded-pill bg-muted/25 shimmer" />
          </div>
          {index < rows - 1 && <Hairline inset={orbSize === 36 ? 56 : 62} />}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// Full list scaffold: N groups with a natural row distribution.
export const SkeletonGroupList = ({ groups = 2, rowsPerGroup = [3, 2], orbSize = 40, frosted = true }) => (
  <div className="space-y-[18px]" aria-hidden="true">
    {Array.from({ length: groups }).map((_, index) => (
      <SkeletonGroupPanel
        key={index}
        rows={rowsPerGroup[index] ?? rowsPerGroup[rowsPerGroup.length - 1] ?? 3}
        orbSize={orbSize}
        frosted={frosted}
      />
    ))}
  </div>
);
