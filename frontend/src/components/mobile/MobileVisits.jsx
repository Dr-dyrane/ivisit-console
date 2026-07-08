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
    ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { visitRowProjection } from '../../utils/visitRowProjection';
import { MobileDetailSheet } from './MobileDetailSheet';
import { resolveVital } from '../../constants/vitalTracks';

// Month-year label for date-grouped list sections (e.g. "May 2026"). Null if undated.
const visitMonthLabel = (visit) => {
  const value = visit?.date || visit?.scheduled_at || visit?.created_at;
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// State choices feed the compact chip row (recycled MobileKPIStrip). Colors are raw
// status hues (vitalTracks TONES): scheduled cyan, active amber, done emerald,
// cancelled slate; All uses the brand token. countKey maps into `statistics`.
const mobileVisitStates = [
    { id: 'all', label: 'All', countKey: 'total', color: 'hsl(var(--primary))' },
    { id: 'scheduled', label: 'Scheduled', countKey: 'scheduled', color: '#0891B2' },
    { id: 'in_progress', label: 'Active', countKey: 'inProgress', color: '#B45309' },
    { id: 'completed', label: 'Done', countKey: 'completed', color: '#047857' },
    { id: 'cancelled', label: 'Cancelled', countKey: 'cancelled', color: '#64748B' },
];

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
    const [activeVisit, setActiveVisit] = useState(null);
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
    const kpis = mobileVisitStates.map((item) => ({
        id: item.id,
        label: item.label,
        value: getMobileVisitStateCount({ item, statistics, visits: visitRows }),
        color: item.color,
    }));
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
                kpiStrip={(
                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={activeKpi || 'all'}
                        onKpiClick={onKpiChange}
                        loading={loading}
                    />
                )}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-4 text-foreground"
            >
                <MobileVisitsAtlasLayer />
                <div className="relative z-10 space-y-5">
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="px-5"
                    >
                        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">Visits</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {loading ? 'Loading records...' : `${totalCount} record${totalCount === 1 ? '' : 's'}`}
                        </p>
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
                                {(() => {
                                    // Date-grouped sections: sort newest-first so month headers read
                                    // chronologically, then emit a header at each month boundary
                                    // (see mobile design canon). Order is render-only; id-keyed state
                                    // (expand/select) is unaffected.
                                    const timeOf = (v) => new Date(v?.date || v?.scheduled_at || v?.created_at || 0).getTime();
                                    const ordered = [...displayVisits].sort((a, b) => timeOf(b) - timeOf(a));
                                    let lastMonth = null;
                                    const out = [];
                                    ordered.forEach((visit) => {
                                        const month = visitMonthLabel(visit);
                                        if (month && month !== lastMonth) {
                                            lastMonth = month;
                                            out.push(
                                                <div key={`grp-${month}`} className="px-2 pb-1 pt-3 eyebrow">
                                                    {month}
                                                </div>
                                            );
                                        }
                                        out.push(
                                            <MobileVisitRow
                                                key={visit.id}
                                                visit={visit}
                                                onOpen={setActiveVisit}
                                                canEdit={canEdit}
                                                canDelete={canDelete}
                                                selectionEnabled={selectionEnabled}
                                                selectionMode={selectionMode}
                                                isSelected={selectionEnabled && selectedIds.includes(visit.id)}
                                                onSelect={selectionEnabled ? onSelect : undefined}
                                                getStatusIcon={getStatusIcon}
                                                getStatusColor={getStatusColor}
                                            />
                                        );
                                    });
                                    return out;
                                })()}
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

                {activeVisit && (() => {
                    const row = visitRowProjection(activeVisit);
                    const vital = resolveVital('visit', row.statusKey);
                    const isEmergency = String(activeVisit.visit_type || activeVisit.type || '').includes('emergency');
                    const ServiceIcon = isEmergency ? Siren : Stethoscope;
                    return (
                        <MobileDetailSheet
                            isOpen
                            onClose={() => setActiveVisit(null)}
                            icon={ServiceIcon}
                            iconTone={vital?.tone}
                            eyebrow={row.caption}
                            title={row.primary}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Visit status' } : null}
                            islands={[
                                { icon: Stethoscope, label: 'Practitioner', value: getDoctorName(activeVisit) },
                                { icon: Hospital, label: 'Facility', value: getFacilityName(activeVisit) },
                                { icon: MapPin, label: 'Location', value: activeVisit.room_number ? `Room ${activeVisit.room_number}` : 'No room' },
                                { icon: Calendar, label: 'Record', value: `#${activeVisit.id?.slice(0, 12) || 'visit'}` },
                            ]}
                            primary={canEdit
                                ? { label: 'Edit visit', icon: Edit, onClick: () => { setActiveVisit(null); onEdit?.(activeVisit); } }
                                : { label: 'View details', icon: Eye, onClick: () => { setActiveVisit(null); onView?.(activeVisit); } }}
                            secondary={canEdit
                                ? { label: 'Details', icon: Eye, onClick: () => { setActiveVisit(null); onView?.(activeVisit); } }
                                : undefined}
                        >
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    className="h-11 w-full rounded-button bg-destructive/10 font-semibold text-destructive transition-all hover:bg-destructive/16 active:scale-95"
                                    onClick={() => { setActiveVisit(null); onDelete?.(activeVisit); }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete visit
                                </Button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
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
    onOpen,
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

    return (
        <motion.div
            layout
            className="overflow-hidden rounded-card bg-muted/22 shadow-sm transition-all"
        >
            {/* Tap opens the detail bottom sheet (MobileDetailSheet) — the approved design +
                desktop rail behaviour — not an inline dropdown. */}
            <button
                type="button"
                onClick={() => onOpen(visit)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="flex w-full items-start gap-3 p-4 text-left transition-transform duration-100 active:scale-[0.98]"
                aria-label={`Open ${row.primary}`}
                aria-haspopup="dialog"
            >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${getStatusTone(visit.status)}`}>
                    <StatusIcon size={17} />
                </span>
                {/* Identity column owns the width: facility is the primary identity and must stay
                    readable (2-line clamp, never a stub). when·ref drops to its own line so it can
                    never steal width from the facility. See MOTION_AND_INTERACTION_CANON.md §2.1. */}
                <span className="min-w-0 flex-1">
                    <span className="block truncate eyebrow">{row.caption}</span>
                    <span className="mt-0.5 text-[15px] font-semibold leading-tight text-foreground line-clamp-2 break-words">{row.primary}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{row.secondary}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{row.meta}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 pl-1">
                    <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${getStatusTone(visit.status)}`} data-status={row.statusKey}>{row.statusLabel}</span>
                    <ChevronRight size={18} className="text-muted-foreground" />
                </span>
            </button>

            {selectionEnabled && (
                <div className="px-4 pb-4">
                    <Button
                        variant="ghost"
                        className="h-11 w-full rounded-button bg-muted/26 text-sm font-semibold transition-all hover:bg-muted/38 active:scale-95"
                        onClick={() => onSelect?.(visit.id, !isSelected)}
                        style={{ color: getStatusColor(visit.status) }}
                    >
                        {selectionMode || isSelected ? (isSelected ? 'Selected' : 'Select') : 'Select visit'}
                    </Button>
                </div>
            )}
        </motion.div>
    );
};
