// Mobile canon kit - the iOS-Settings grouped list (CANON_COMPONENT_SPECS S4):
// one frosted PANEL per recency bucket over the atlas; transparent rows separated
// by a hairline whisper. Grouping is render-only (utils/groupByRecency).
//
// UsersPage.contract bans blur on its surfaces -> the frosted panel is a PROP
// (frosted={false} drops backdrop-blur-xl), never a fork.
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { groupByRecency } from '../../../utils/groupByRecency';
import { TapCard } from './Tap';

export const GROUP_PANEL_FROSTED = 'rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5';
export const GROUP_PANEL_FLAT = 'rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] px-3 py-1.5';

// Hairline whisper: /0.08 alpha, h-px, inset past the orb + gap (62px for 40px
// orbs, 56px for 36px orbs). Tailwind JIT needs literal classes - fixed variants.
const HAIRLINE_INSET = {
  62: 'h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]',
  56: 'h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[56px]',
  0: 'h-px bg-[hsl(var(--muted-foreground)/0.08)]',
};

export const Hairline = ({ inset = 62 }) => (
  <div className={HAIRLINE_INSET[inset] || HAIRLINE_INSET[62]} aria-hidden="true" />
);

// Group header: sentence-case BOLD + tabular count (never all-caps).
export const GroupPanel = ({ label, count, frosted = true, children }) => (
  <div>
    <div className="flex items-center justify-between px-1 pb-2.5">
      <span className="text-[13px] font-bold leading-[17px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-bold text-muted-foreground/60 tabular-nums">{count}</span>
    </div>
    <div className={frosted ? GROUP_PANEL_FROSTED : GROUP_PANEL_FLAT}>
      {children}
    </div>
  </div>
);

// Recency-bucketed list: buckets from groupByRecency (active_now..older, newest
// first, empty buckets dropped); rows render via the page's renderRow.
export const GroupedList = ({ items, getDate, getStatus, renderRow, frosted = true, hairlineInset = 62 }) => (
  <div className="space-y-[18px]">
    {groupByRecency(items, getDate, getStatus).map(({ key, label, items: groupItems }) => (
      <GroupPanel key={key} label={label} count={groupItems.length} frosted={frosted}>
        {groupItems.map((item, index) => (
          <React.Fragment key={item.id}>
            {renderRow(item)}
            {index < groupItems.length - 1 && <Hairline inset={hairlineInset} />}
          </React.Fragment>
        ))}
      </GroupPanel>
    ))}
  </div>
);

// THE row anatomy (freshest donor: MobileVisits MobileVisitRow): 40px status-
// tinted orb -> identity (15/500 title, 12 meta) -> trailing day-aware time
// (bold tabular) over pill + chevron. Card press 0.988 + CLICK feedback on
// pointerdown baked via TapCard. Row tap opens a detail sheet, never an inline
// dropdown.
export const MobileListRow = ({
  item,
  dataAttr = 'data-mobile-row',
  onOpen,
  ariaLabel,
  orbClass,
  icon: Icon,
  iconSize = 20,
  title,
  meta,
  time,
  markerChip = null,
  pill,
}) => (
  <TapCard
    onClick={() => onOpen(item)}
    className="group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]"
    {...{ [dataAttr]: item.id }}
    aria-haspopup="dialog"
    aria-label={ariaLabel}
  >
    <span className={`h-10 w-10 shrink-0 rounded-pill flex items-center justify-center ${orbClass}`}>
      <Icon size={iconSize} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[15px] leading-5 font-medium text-foreground truncate">{title}</p>
      <p className="mt-0.5 text-xs leading-[17px] text-muted-foreground truncate">{meta}</p>
    </div>
    <span className="ml-2 shrink-0 flex flex-col items-end gap-2 min-w-[72px]">
      <span className="text-xs leading-[15px] font-bold text-foreground tabular-nums">{time}</span>
      <span className="flex items-center gap-2">
        {markerChip && (
          <span className="rounded-pill bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{markerChip}</span>
        )}
        <span
          className={`rounded-pill px-2.5 py-[5px] text-[11px] font-bold ${pill?.className || 'bg-muted/34 text-muted-foreground'}`}
          {...(pill?.dataStatus ? { 'data-status': pill.dataStatus } : {})}
        >{pill?.label || 'New'}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
      </span>
    </span>
  </TapCard>
);
