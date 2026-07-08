import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    Hospital,
    Eye,
    Edit,
    Trash2,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Stethoscope,
    Search,
    SlidersHorizontal,
    BarChart3,
    Siren,
    RefreshCw,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { visitRowProjection } from '../../utils/visitRowProjection';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const mobileVisitStates = [
    {
        id: 'all',
        label: 'All',
        icon: Calendar,
        countKey: 'total',
        activeClass: 'bg-sky-500/10 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.16)] dark:text-sky-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'scheduled',
        label: 'Scheduled',
        icon: Clock,
        countKey: 'scheduled',
        activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_18px_54px_rgba(6,182,212,0.14)] dark:text-cyan-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'in_progress',
        label: 'Active',
        icon: Stethoscope,
        countKey: 'inProgress',
        activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_18px_54px_rgba(245,158,11,0.14)] dark:text-amber-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'completed',
        label: 'Done',
        icon: CheckCircle2,
        countKey: 'completed',
        activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.14)] dark:text-emerald-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'cancelled',
        label: 'Cancelled',
        icon: AlertCircle,
        countKey: 'cancelled',
        activeClass: 'bg-muted/36 text-foreground shadow-[0_18px_54px_rgb(0_0_0/0.10)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
];

const mobileVisitSignalTone = {
    all: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
    scheduled: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    in_progress: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
    completed: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
    cancelled: 'bg-muted/34 text-muted-foreground shadow-[0_16px_42px_rgb(0_0_0/0.08)]',
};

const MobileVisitsAtlasLayer = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
            style={{
                backgroundImage:
                    'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
                backgroundSize: '250px 178px, 330px 236px, 410px 276px',
                backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
            }}
        />
    </div>
);

const getMobileVisitStateCount = ({ item, statistics, visits }) => {
    const fallback = item.id === 'all'
        ? visits.length
        : visits.filter((visit) => visit.status === item.id).length;

    return countNumber(statistics?.[item.countKey], fallback);
};

const getMobileVisitSignal = ({ states, activeKpi }) => {
    const activeId = activeKpi || 'all';
    const active = states.find((item) => item.id === activeId) || states[0];
    const count = countNumber(active?.value, 0);

    if (active.id === 'scheduled') {
        return {
            ...active,
            headline: count > 0 ? `${count} scheduled visit${count === 1 ? '' : 's'}` : 'No scheduled visits',
            subhead: count > 0 ? 'Open the next visit before changing the schedule.' : 'Scheduled visits will appear here.',
        };
    }

    if (active.id === 'in_progress') {
        return {
            ...active,
            headline: count > 0 ? `${count} active visit${count === 1 ? '' : 's'}` : 'No active visits',
            subhead: count > 0 ? 'Check the focused record before acting.' : 'Active visits will appear here.',
        };
    }

    if (active.id === 'completed') {
        return {
            ...active,
            headline: count > 0 ? `${count} completed visit${count === 1 ? '' : 's'}` : 'No completed visits',
            subhead: count > 0 ? 'Use completed visits as read-only care history.' : 'Completed visits will appear here.',
        };
    }

    if (active.id === 'cancelled') {
        return {
            ...active,
            headline: count > 0 ? `${count} cancelled visit${count === 1 ? '' : 's'}` : 'No cancelled visits',
            subhead: count > 0 ? 'Review these records without changing outcomes.' : 'Cancelled visits will appear here.',
        };
    }

    return {
        ...active,
        headline: count > 0 ? `${count} visit record${count === 1 ? '' : 's'}` : 'No visit records',
        subhead: count > 0 ? 'Pick one visit, then view details or edit scheduling.' : 'Schedule the first visit when care is ready.',
    };
};

const getStatusTone = (status) => {
    switch (status) {
        case 'completed': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
        case 'in_progress': return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
        case 'cancelled': return 'bg-muted/34 text-muted-foreground';
        default: return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
    }
};

/**
 * MobileVisits
 * Visit Management interface with clean, accessible design
 * Features: Infinite scroll, user-friendly terminology, Apple-level UI
 */
export const MobileVisits = ({
    visits,
    loading,
    statistics,
    filters,
    setFilters,
    activeKpi = 'all',
    onKpiChange,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    errorMessage,
    onRetry,
    onViewAnalytics,
    isAdmin,
    isOrgAdmin,
    canEdit = isAdmin || isOrgAdmin,
    canDelete = false,
    selectionEnabled = false,
    onOpenFilters,
    hasMore,
    onLoadMore,
    selectedIds = [],
    onSelect
}) => {
    // 1. Infinite scroll setup with Intersection Observer
    const observerTarget = useRef(null);
    const [expandedVisitId, setExpandedVisitId] = useState(null);
    const selectionMode = selectionEnabled && selectedIds.length > 0;
    const { triggerFromEvent } = useFeedback();




    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) triggerLoad();
            },
            { threshold: 0.1, rootMargin: '120px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, triggerLoad]);
    const visitRows = Array.isArray(visits) ? visits : [];
    const { displayItems: displayVisits, isBuffering } = useStableList(visitRows, loading);
    const showSkeleton = loading && displayVisits.length === 0;
    const stateChoices = mobileVisitStates.map((item) => ({
        ...item,
        value: loading ? '...' : getMobileVisitStateCount({ item, statistics, visits: visitRows }),
    }));
    const signal = getMobileVisitSignal({ states: stateChoices, activeKpi });
    const SignalIcon = signal.icon || Calendar;
    const totalCount = countNumber(statistics?.total, visitRows.length);
    const hasFilter = Boolean(
        filters?.search ||
        (filters?.status && filters.status.length > 0) ||
        (filters?.visit_type && filters.visit_type.length > 0) ||
        filters?.date
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'hsl(var(--success))';
            case 'in_progress': return 'hsl(var(--warning))';
            case 'cancelled': return 'hsl(var(--destructive))';
            default: return 'hsl(var(--info))';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return CheckCircle2;
            case 'in_progress': return Clock;
            case 'cancelled': return AlertCircle;
            default: return Calendar;
        }
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-16 text-foreground"
            >
                <MobileVisitsAtlasLayer />
                <div className="relative z-10 space-y-5">
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 px-5"
                    >
                        <div className={`inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${mobileVisitSignalTone[signal.id] || mobileVisitSignalTone.all}`}>
                            <SignalIcon size={15} />
                            {signal.label}
                        </div>
                        <div>
                            <h1 className="text-[34px] font-semibold leading-[1.03] tracking-normal text-foreground">
                                {loading ? 'Loading visits' : signal.headline}
                            </h1>
                            <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-muted-foreground">
                                {loading ? 'One moment while the latest records come in.' : signal.subhead}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {stateChoices.map((item) => {
                                const Icon = item.icon;
                                const active = (activeKpi || 'all') === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        type="button"
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => onKpiChange?.(item.id)}
                                        className={`min-h-[82px] rounded-card px-4 py-3 text-left transition-all ${active ? item.activeClass : item.restClass}`}
                                        aria-pressed={active}
                                        aria-label={`Show ${item.label.toLowerCase()} visits`}
                                        data-state={active ? 'selected' : 'idle'}
                                    >
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="block text-xs font-semibold leading-tight">{item.label}</span>
                                                <span className="mt-2 block text-2xl font-semibold tracking-normal text-foreground">{item.value}</span>
                                            </span>
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/40">
                                                <Icon size={16} />
                                            </span>
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.section>

                    <section
                        className="-mx-1 rounded-t-sheet bg-card/78 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] dark:bg-card/55"
                        data-testid="mobile-visits-activity-sheet"
                    >
                        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                        <div className="flex items-center gap-2 rounded-modal bg-background/42 p-2 dark:bg-black/[0.10]">
                            <div className="relative flex-1">
                                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="search"
                                    placeholder="Search visits..."
                                    value={filters?.search || ''}
                                    onChange={(event) => setFilters?.(prev => ({ ...prev, search: event.target.value }))}
                                    className="h-11 w-full rounded-inner bg-background/60 pl-10 pr-4 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
                                    data-testid="mobile-visits-sheet-search"
                                />
                            </div>
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={(event) => {
                                    onOpenFilters?.();
                                    triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--primary))', haptic: true, sound: true });
                                }}
                                className="relative flex h-11 w-11 items-center justify-center rounded-inner bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95 dark:bg-white/[0.06]"
                                aria-label="Filter visits"
                                data-state={hasFilter ? 'filtered' : 'idle'}
                            >
                                <SlidersHorizontal size={18} />
                                {hasFilter && <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-primary" />}
                            </motion.button>

                            {(isAdmin || isOrgAdmin) && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(event) => {
                                        onViewAnalytics?.();
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--primary))', haptic: true, sound: true });
                                    }}
                                    className="flex h-11 w-11 items-center justify-center rounded-inner bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95 dark:bg-white/[0.06]"
                                    aria-label="Open visit statistics"
                                    data-state="idle"
                                >
                                    <BarChart3 size={18} />
                                </motion.button>
                            )}
                        </div>

                        <div className="mt-4 flex items-center justify-between px-2">
                            <h2 className="text-lg font-semibold tracking-tight">Visits</h2>
                            <span className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                                {isBuffering ? 'Updating' : `${totalCount} total`}
                            </span>
                        </div>

                        <div className="mt-3 space-y-2">
                            {errorMessage && (
                                <MobileVisitErrorBanner message={errorMessage} onRetry={onRetry || onRefresh} />
                            )}

                            <AnimatePresence mode="popLayout">
                                {displayVisits.map((visit) => (
                                    <MobileVisitRow
                                        key={visit.id}
                                        visit={visit}
                                        expanded={expandedVisitId === visit.id}
                                        setExpandedVisitId={setExpandedVisitId}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        selectionEnabled={selectionEnabled}
                                        selectionMode={selectionMode}
                                        isSelected={selectionEnabled && selectedIds.includes(visit.id)}
                                        onSelect={selectionEnabled ? onSelect : undefined}
                                        getStatusIcon={getStatusIcon}
                                        getStatusColor={getStatusColor}
                                    />
                                ))}
                            </AnimatePresence>

                            <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                                {showSkeleton && <MobileListSkeletonRows />}
                                {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
                                {!loading && !hasMore && displayVisits.length > 0 && (
                                    <MobileListEnd label="End of visits" />
                                )}
                            </div>

                            {displayVisits.length === 0 && !loading && (
                                <MobileListEmpty icon={Calendar} label="No visits found" />
                            )}
                        </div>
                    </section>
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};

const MobileVisitErrorBanner = ({ message, onRetry }) => (
    <div
        className="rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200"
        data-testid="mobile-visits-error-state"
    >
        <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
                <p className="text-sm font-semibold">Visits could not load</p>
                <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
            </div>
        </div>
        <Button
            type="button"
            variant="ghost"
            onClick={onRetry}
            className="mt-3 h-10 w-full rounded-button bg-background/55 text-sm font-semibold text-foreground transition-all hover:bg-background active:scale-95"
        >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
        </Button>
    </div>
);

const getDoctorName = (visit) => (
    visit?.doctor?.name ||
    visit?.doctor ||
    visit?.doctor_name ||
    'Unassigned'
);

const getFacilityName = (visit) => (
    visit?.hospital?.name ||
    visit?.hospital_name ||
    visit?.hospital ||
    (visit?.hospital_id ? 'Linked facility' : 'No facility')
);

const MobileVisitRow = ({
    visit,
    expanded,
    setExpandedVisitId,
    onView,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
    selectionEnabled,
    selectionMode,
    isSelected,
    onSelect,
    getStatusIcon,
    getStatusColor,
}) => {
    const row = visitRowProjection(visit);
    const StatusIcon = getStatusIcon(visit.status);
    const isEmergency = String(visit.visit_type || visit.type || '').includes('emergency');
    const ServiceIcon = isEmergency ? Siren : Stethoscope;
    const rowColor = getStatusColor(visit.status);

    return (
        <motion.div
            layout
            className={`overflow-hidden rounded-card bg-muted/22 shadow-sm transition-all ${expanded ? 'bg-muted/34 shadow-[0_20px_60px_rgba(0,0,0,0.18)]' : ''}`}
        >
            <button
                type="button"
                onClick={() => setExpandedVisitId(expanded ? null : visit.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
                aria-label={`${expanded ? 'Close' : 'Open'} ${row.primary}`}
                aria-expanded={expanded}
                data-state={expanded ? 'open' : 'closed'}
            >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${getStatusTone(visit.status)}`}>
                    <StatusIcon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{row.caption}</span>
                    <span className="mt-0.5 block truncate text-[15px] font-semibold text-foreground">{row.primary}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{row.secondary}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${getStatusTone(visit.status)}`} data-status={row.statusKey}>{row.statusLabel}</span>
                    <span className="text-xs font-medium text-muted-foreground">{row.meta}</span>
                </span>
                {expanded ? (
                    <ChevronDown size={18} className="text-muted-foreground" />
                ) : (
                    <ChevronRight size={18} className="text-muted-foreground" />
                )}
            </button>

            {expanded && (
                <div className="space-y-3 px-4 pb-4">
                    <MobileVisitDetailLine icon={ServiceIcon} label="Visit type" value={row.caption} />
                    <MobileVisitDetailLine icon={Stethoscope} label="Practitioner" value={getDoctorName(visit)} />
                    <MobileVisitDetailLine icon={Hospital} label="Facility" value={getFacilityName(visit)} />
                    <MobileVisitDetailLine icon={MapPin} label="Location" value={visit.room_number ? `Room ${visit.room_number}` : 'No room'} />
                    <MobileVisitDetailLine icon={Calendar} label="Record" value={`#${visit.id?.slice(0, 12) || 'visit'}`} />

                    <div className={`${canEdit ? 'grid-cols-2' : 'grid-cols-1'} grid gap-2 pt-1`}>
                        <Button
                            variant="ghost"
                            className="h-12 rounded-button bg-background/36 font-semibold transition-all hover:bg-foreground hover:text-background active:scale-95"
                            onClick={() => onView(visit)}
                            data-state="idle"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                        </Button>
                        {canEdit && (
                            <Button
                                variant="ghost"
                                className="h-12 rounded-button bg-background/36 font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                                onClick={() => onEdit(visit)}
                                data-state="idle"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        )}
                    </div>

                    {canDelete && (
                        <Button
                            variant="ghost"
                            className="h-12 w-full rounded-button bg-destructive/10 font-semibold text-destructive transition-all hover:bg-destructive/16 active:scale-95"
                            onClick={() => onDelete?.(visit)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    )}

                    {selectionEnabled && (
                        <Button
                            variant="ghost"
                            className="h-11 w-full rounded-button bg-muted/26 text-sm font-semibold transition-all hover:bg-muted/38 active:scale-95"
                            onClick={() => onSelect?.(visit.id, !isSelected)}
                            style={{ color: rowColor }}
                        >
                            {selectionMode || isSelected ? (isSelected ? 'Selected' : 'Select') : 'Select visit'}
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const MobileVisitDetailLine = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 rounded-button bg-background/30 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground">
            <Icon size={15} />
        </span>
        <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value || 'Not set'}</span>
        </span>
    </div>
);
