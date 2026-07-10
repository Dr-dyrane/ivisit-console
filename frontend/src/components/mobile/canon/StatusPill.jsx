// Mobile canon kit - status pill. HARD RULE (handoff): tones come ONLY from
// constants/vitalTracks.js - no local colour maps, ever. A page passes a status
// (+ optional domain for lifecycle-aware resolution); the pill classes resolve
// through the single status-tone truth.
import React from 'react';
import { resolveVital, statusPill } from '../../../constants/vitalTracks';

const VARIANT_CLASS = {
  // Trailing pill on a grouped-list row (ME/MV row anatomy).
  row: 'rounded-pill px-2.5 py-[5px] text-[11px] font-bold',
  // Detail-sheet status pill (MobileDetailSheet header).
  sheet: 'mt-2 inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold',
  // Inline chip (hero/status rows).
  chip: 'inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-semibold',
};

export const StatusPill = ({ status, domain = null, label = null, variant = 'row', className = '' }) => {
  const resolved = domain
    ? resolveVital(domain, status)
    : statusPill(status, label || undefined);
  const pillClass = resolved?.pill || 'bg-muted/34 text-muted-foreground';
  const pillLabel = label || resolved?.label || String(status || 'New');

  return (
    <span className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.row} ${pillClass} ${className}`.trim()}>
      {pillLabel}
    </span>
  );
};
