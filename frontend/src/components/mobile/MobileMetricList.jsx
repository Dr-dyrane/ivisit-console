import React, { useRef, useState } from 'react';
import { ChevronRight, Check, CheckSquare, Square, CheckCircle2, Circle, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileMotion } from './mobileMotion';

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

/**
 * MobileSectionHeader
 * Minimal authority header for mobile sections
 */
export const MobileSectionHeader = ({
    label,
    color = 'hsl(var(--primary))',
    count,
    onSelectAll,
    isAllSelected,
    selectionMode = false,
    selectedCount = 0,
    onClearSelection
}) => {
    const { triggerFromEvent } = useFeedback();

    const handleSelectAll = (e) => {
        onSelectAll?.(e);
        triggerFromEvent(e, {
            variant: isAllSelected ? FEEDBACK_TYPES.INFO : FEEDBACK_TYPES.SUCCESS,
            color: color || 'hsl(var(--spark))',
            haptic: true,
            sound: true
        });
    };

    const handleClearSelection = (e) => {
        onClearSelection?.(e);
        triggerFromEvent(e, {
            variant: FEEDBACK_TYPES.INFO,
            color: 'hsl(var(--spark))',
            haptic: true,
            sound: true
        });
    };

    return (
        <div className="px-1 pt-6 pb-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: color }} />
                <h5 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    {label}
                </h5>
            </div>
            <div className="flex items-center gap-2">
                {onSelectAll && (
                    <button
                        onClick={handleSelectAll}
                        className="w-8 h-8 flex items-center justify-center rounded-2xl apple-glass-heavy border-0 active:scale-90 transition-all text-primary/60 hover:text-primary"
                        aria-label={isAllSelected ? 'Deselect All' : 'Select All'}
                    >
                        {isAllSelected ? (
                            <CheckCircle2 size={16} className="text-primary" />
                        ) : (
                            <Circle size={16} className="text-primary/30" />

                        )}
                    </button>
                )}
                {count !== undefined && (
                    <span className="text-[10px] font-semibold text-muted-foreground/50 bg-white/5 px-2 py-1 rounded-lg">
                        {count}
                    </span>
                )}
            </div>
        </div>
        <AnimatePresence initial={false}>
            {selectionMode && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={mobileMotion.base}
                    className="mt-2 px-2 py-1.5 rounded-xl bg-[hsl(var(--spark)/0.08)] border border-[hsl(var(--spark)/0.14)] flex items-center justify-between gap-2"
                >
                    <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--spark)/0.95)]">
                        Selection Mode • {selectedCount} selected
                    </span>
                    {typeof onClearSelection === 'function' && (
                        <button
                            onClick={handleClearSelection}
                            className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--spark)/0.92)] px-2 py-1 rounded-lg bg-[hsl(var(--spark)/0.10)]"
                        >
                            Clear
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    );
};

/**
 * MobileMetricRow
 * Single row for a metric or navigation item on mobile
 * Canon #3: Reveal Gradually
 * Canon #28: Feels Touchable
 */
export const MobileMetricRow = ({
    icon: Icon,
    label,
    value,
    trend,
    statusIndicators = [], // Array of { icon, color, label }
    onClick,
    color = 'hsl(var(--primary))',
    description,
    expandedContent,
    isExpanded,
    onExpand,
    itemId,
    isSelected,
    onSelect,
    selectionMode,
    rightBlade
}) => {
    const { triggerFromEvent } = useFeedback();
    // Backward compatibility: Use internal state if controlled props not provided
    const [internalExpanded, setInternalExpanded] = useState(false);
    const [ripple, setRipple] = useState(null);
    const isCurrentlyExpanded = isExpanded !== undefined ? isExpanded : internalExpanded;
    const longPressTimerRef = useRef(null);
    const longPressHandledRef = useRef(false);
    const touchStartRef = useRef({ x: 0, y: 0 });

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const createTapRipple = (e) => {
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        if (!rect) return;
        const x = Number.isFinite(e?.clientX) ? e.clientX - rect.left : rect.width / 2;
        const y = Number.isFinite(e?.clientY) ? e.clientY - rect.top : rect.height / 2;
        setRipple({ x, y, key: Date.now() });
    };

    const startLongPress = (e) => {
        if (!onSelect || selectionMode) return;
        clearLongPressTimer();
        longPressHandledRef.current = false;
        const touch = e?.touches?.[0];
        touchStartRef.current = {
            x: Number.isFinite(touch?.clientX) ? touch.clientX : 0,
            y: Number.isFinite(touch?.clientY) ? touch.clientY : 0
        };
        const target = e?.currentTarget;
        const pointX = Number.isFinite(touch?.clientX) ? touch.clientX : e?.clientX;
        const pointY = Number.isFinite(touch?.clientY) ? touch.clientY : e?.clientY;
        longPressTimerRef.current = setTimeout(() => {
            longPressHandledRef.current = true;
            onSelect(itemId, true);
            triggerFromEvent({
                currentTarget: target,
                clientX: pointX,
                clientY: pointY
            }, {
                variant: FEEDBACK_TYPES.INFO,
                color: 'hsl(var(--spark))',
                haptic: true,
                sound: true
            });
        }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e) => {
        if (!longPressTimerRef.current) return;
        const touch = e?.touches?.[0];
        if (!touch) return;
        const dx = Math.abs(touch.clientX - touchStartRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartRef.current.y);
        if (dx > LONG_PRESS_MOVE_TOLERANCE_PX || dy > LONG_PRESS_MOVE_TOLERANCE_PX) {
            clearLongPressTimer();
        }
    };

    const handleInteraction = (e) => {
        if (longPressHandledRef.current) {
            longPressHandledRef.current = false;
            return;
        }
        clearLongPressTimer();
        createTapRipple(e);

        if (expandedContent) {
            if (onExpand && itemId !== undefined) {
                // Controlled expansion (new pattern for MobileUsers/MobileVisits)
                onExpand(itemId);
            } else {
                // Internal state (old pattern for MobileDashboard/MobileAnalytics)
                setInternalExpanded(!internalExpanded);
            }
            triggerFromEvent(e, {
                variant: FEEDBACK_TYPES.INFO,
                color,
                haptic: true,
                sound: true
            });
        } else if (selectionMode && onSelect) {
            onSelect(itemId, !isSelected);
            triggerFromEvent(e, {
                variant: FEEDBACK_TYPES.SUCCESS,
                color,
                haptic: true,
                sound: true
            });
        } else if (onClick) {
            onClick(e);
            triggerFromEvent(e, {
                variant: FEEDBACK_TYPES.CLICK,
                color,
                haptic: true,
                sound: true
            });
        }
    };

    const handleLongPress = (e) => {
        clearLongPressTimer();
        if (onSelect) {
            e.preventDefault();
            onSelect(itemId, !isSelected);
            triggerFromEvent(e, {
                variant: FEEDBACK_TYPES.INFO,
                color: 'hsl(var(--spark))',
                haptic: true,
                sound: true
            });
        }
    };

    const blade = rightBlade || (trend ? {
        badge: trend,
        label: 'Signal',
        value: typeof value === 'number' ? value.toLocaleString() : value,
        color
    } : null);

    return (
        <motion.div
            layout
            initial={false}
            className="w-full flex flex-col mb-2 last:mb-0"
        >
            <motion.div
                whileTap={{ scale: 0.986 }}
                transition={mobileMotion.base}
                onClick={handleInteraction}
                onContextMenu={handleLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={clearLongPressTimer}
                onTouchMove={handleTouchMove}
                onTouchCancel={clearLongPressTimer}
                onMouseLeave={clearLongPressTimer}
                className={`w-full flex items-center gap-3 p-3 apple-glass-heavy border-0 rounded-2xl relative overflow-hidden group select-none transition-[background,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : isCurrentlyExpanded ? 'bg-muted/80 rounded-b-none shadow-[0_10px_30px_hsl(var(--spark)/0.12)] -translate-y-[1px]' : 'bg-muted/50 active:bg-muted/70'
                    }`}
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                }}
            >
                <AnimatePresence>
                    {ripple && (
                        <motion.span
                            key={ripple.key}
                            initial={{ opacity: 0.25, scale: 0 }}
                            animate={{ opacity: 0, scale: 16 }}
                            exit={{ opacity: 0 }}
                            transition={mobileMotion.linger}
                            className="absolute pointer-events-none rounded-full"
                            style={{
                                left: ripple.x - 8,
                                top: ripple.y - 8,
                                width: 16,
                                height: 16,
                                background: `radial-gradient(circle, ${color.replace(/\)$/, ' / 0.30)')} 0%, ${color.replace(/\)$/, ' / 0.18)')} 40%, transparent 72%)`
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* 2px Left Accent - The only differentiator */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[2px] opacity-60"
                    style={{ backgroundColor: color }}
                />

                <div
                    className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 relative z-10 shadow-md transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.2)')}, ${color.replace(/\)$/, ' / 0.1)')})`,
                        boxShadow: isSelected ? `0 0 15px ${color.replace(/\)$/, ' / 0.4)')}` : 'none',
                        border: isSelected ? `1.5px solid ${color}` : 'none'
                    }}
                >
                    {Icon && <Icon size={16} className="opacity-95" style={{ color }} />}

                    <AnimatePresence>
                        {isSelected && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background z-20"
                            >
                                <Check size={10} className="text-white stroke-[4px]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-[8px] font-normal uppercase tracking-[0.15em] mb-0.5 truncate text-muted-foreground/85">
                        {label}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium tracking-tight text-foreground truncate font-dashboard-numbers">{value}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto relative z-10">
                    {statusIndicators.map((indicator, idx) => (
                        <div
                            key={idx}
                            title={indicator.label}
                            className="flex items-center justify-center transition-all"
                        >
                            {indicator.icon && <indicator.icon size={16} style={{ color: indicator.color || 'white' }} className="opacity-95" />}
                        </div>
                    ))}

                    {blade && (
                        <div
                            className="relative min-w-[118px] max-w-[132px] h-9 rounded-xl px-2.5 py-1 overflow-hidden"
                            style={{
                                background: `linear-gradient(120deg, ${blade.color.replace(/\)$/, ' / 0.16)')}, ${blade.color.replace(/\)$/, ' / 0.04)')})`,
                                boxShadow: `0 0 14px ${blade.color.replace(/\)$/, ' / 0.16)')}`
                            }}
                        >
                            <div
                                className="absolute inset-0 opacity-75 dark:opacity-100"
                                style={{ background: `radial-gradient(circle at 100% 0%, ${blade.color.replace(/\)$/, ' / 0.35)')}, transparent 72%)` }}
                            />
                            <div className="relative z-10 h-full flex items-center gap-2">
                                {blade.badge && (
                                    <span className="inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-none tracking-wide text-foreground/90 bg-black/10 dark:bg-white/10">
                                        {blade.direction === 'up' && <TrendingUp size={8} className="mr-1 text-success" />}
                                        {blade.direction === 'down' && <TrendingDown size={8} className="mr-1 text-destructive" />}
                                        {blade.badge}
                                    </span>
                                )}
                                <div className="min-w-0 leading-none">
                                    <p className="text-[7px] font-medium uppercase tracking-[0.1em] text-foreground/65 truncate">
                                        {blade.label || 'Signal'}
                                    </p>
                                    <p className="mt-0.5 text-[10px] font-semibold tracking-tight text-foreground truncate font-dashboard-numbers">
                                        {blade.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {(onClick || expandedContent) && (
                    <motion.div
                        animate={{ rotate: isCurrentlyExpanded ? 90 : 0 }}
                        transition={mobileMotion.base}
                        className="opacity-20 group-active:opacity-40"
                    >
                        <ChevronRight size={14} />
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence initial={false}>
                {isCurrentlyExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            height: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: mobileMotion.quick
                        }}
                        className="bg-primary/[0.025] overflow-hidden rounded-b-2xl -mt-2 pt-2"
                    >
                        <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full opacity-70" style={{ backgroundColor: color }} />
                            <span className="text-[8px] uppercase tracking-[0.16em] font-medium text-foreground/45">Detail Layer</span>
                        </div>
                        <div className="p-3 pt-2 text-[11px] text-muted-foreground/80 tracking-tight leading-relaxed font-medium">
                            {typeof expandedContent === 'string'
                                ? <p className="text-foreground/75">{expandedContent}</p>
                                : expandedContent}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
