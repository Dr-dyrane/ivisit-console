// Mobile canon kit - the iOS-Settings grouped list (CANON_COMPONENT_SPECS S4):
// one frosted PANEL per recency bucket over the atlas; transparent rows separated
// by a hairline whisper. Grouping is render-only (utils/groupByRecency).
//
// UsersPage.contract bans blur on its surfaces -> the frosted panel is a PROP
// (frosted={false} drops backdrop-blur-xl), never a fork.
import React, { useRef } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { groupByRecency } from '../../../utils/groupByRecency';
import { TapCard } from './Tap';
import { useFeedback } from '../../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';

// Long-press to enter multi-select — mirrored VERBATIM from the estate's selection
// primitive (MobileMetricList) so the canon row feels identical to the live selection
// pages (Organizations/Subscriptions/Doctors). Selection is OPT-IN (selectable=false by
// default): the four gold-standard pages that don't wire it render exactly as before.
const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

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
  // Opt-in multi-select. Off by default -> the tap-only row is byte-identical for the
  // pages that don't wire selection. When on: long-press ENTERS selection; in selection
  // mode a tap toggles (instead of opening the sheet); the orb carries a check badge.
  selectable = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onLongPress,
}) => {
  const { triggerFromEvent } = useFeedback();
  const longPressTimerRef = useRef(null);
  const longPressHandledRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const clearLongPress = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const armLongPress = (event) => {
    if (!selectable || selectionMode || !onLongPress) return; // long-press only ENTERS selection
    clearLongPress();
    longPressHandledRef.current = false;
    const touch = event?.touches?.[0];
    touchStartRef.current = { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
    const target = event?.currentTarget;
    const px = touch?.clientX ?? event?.clientX;
    const py = touch?.clientY ?? event?.clientY;
    longPressTimerRef.current = setTimeout(() => {
      longPressHandledRef.current = true;
      onLongPress(item);
      triggerFromEvent({ currentTarget: target, clientX: px, clientY: py }, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
    }, LONG_PRESS_MS);
  };

  const trackLongPressMove = (event) => {
    if (!longPressTimerRef.current) return;
    const touch = event?.touches?.[0];
    if (!touch) return;
    if (Math.abs(touch.clientX - touchStartRef.current.x) > LONG_PRESS_MOVE_TOLERANCE_PX
      || Math.abs(touch.clientY - touchStartRef.current.y) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      clearLongPress();
    }
  };

  const handleClick = () => {
    if (longPressHandledRef.current) { longPressHandledRef.current = false; return; } // swallow the click after a long-press
    clearLongPress();
    if (selectable && selectionMode) onToggleSelect?.(item);
    else onOpen?.(item);
  };

  const handleContextMenu = (event) => {
    if (!selectable) return;
    event.preventDefault();
    clearLongPress();
    if (selectionMode) onToggleSelect?.(item);
    else onLongPress?.(item);
  };

  const selectionHandlers = selectable ? {
    onTouchStart: armLongPress,
    onTouchMove: trackLongPressMove,
    onTouchEnd: clearLongPress,
    onTouchCancel: clearLongPress,
    onMouseLeave: clearLongPress,
    onContextMenu: handleContextMenu,
    'aria-pressed': selected,
  } : {};

  return (
    <TapCard
      onClick={handleClick}
      className={`group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]${selected ? ' bg-foreground/[0.06] dark:bg-white/[0.08]' : ''}`}
      {...{ [dataAttr]: item.id }}
      {...selectionHandlers}
      style={selectable ? { WebkitTouchCallout: 'none' } : undefined}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
    >
      <span className={`h-10 w-10 shrink-0 rounded-pill flex items-center justify-center relative ${orbClass}`}>
        <Icon size={iconSize} />
        {selectable && selected && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-pill bg-foreground shadow-[0_0_0_3px_hsl(var(--background))] z-20">
            <Check size={10} className="text-background stroke-[4px]" />
          </span>
        )}
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
          {selectionMode
            ? null
            : <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
        </span>
      </span>
    </TapCard>
  );
};
