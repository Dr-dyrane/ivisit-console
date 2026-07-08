import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    Ambulance,
    BedDouble,
    Calendar,
    CheckCheck,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Eye,
    Filter,
    Hospital,
    Info,
    MapPin,
    Search,
    User,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { MobileDetailSheet } from './MobileDetailSheet';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';
import { resolveVital } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';

// State filter chips for MobileKPIStrip. `color` is the raw status hue for the chip
// dot (active chip is brand-filled by MobileKPIStrip itself). Hues mirror the row
// avatars/pills and the desktop RequestKpiStrip: attention=destructive, active=amber,
// bed=cyan, ambulance=sky. `icon` feeds the compact signal header.
const mobileKpis = [
    { id: 'pending', label: 'Needs attention', icon: AlertCircle, color: 'hsl(var(--destructive))' },
    { id: 'active', label: 'Active', icon: Clock, color: '#f59e0b' },
    { id: 'bed', label: 'Beds', icon: BedDouble, color: '#06b6d4' },
    { id: 'ambulance', label: 'Ambulance', icon: Ambulance, color: '#0ea5e9' },
];

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getInitials = (name = 'Request') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || 'R'}${parts[1]?.[0] || ''}`.toUpperCase();
};

const formatRequestTime = (value) => {
    if (!value) return 'No time';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No time';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const serviceLabel = (request) => {
    const raw = String(request?.service_type || 'request').replace(/_/g, ' ');
    return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const createdDateLabel = (value) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getMobileRequestAvatarClass = (request) => {
    const key = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
    if (key === 'pending_approval' || key === 'payment_declined') {
        return 'bg-destructive/14 text-destructive';
    }
    if (key === 'completed') {
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
    }
    if (key === 'cancelled') {
        return 'bg-muted/34 text-muted-foreground';
    }
    if (key === 'in_progress') {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
    }
    if (key === 'accepted') {
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
    }
    if (key === 'arrived') {
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
    }
    return 'bg-muted/34 text-muted-foreground';
};

const hasMobileRequestFilters = (filters = {}) => Boolean(
    filters.search ||
    (Array.isArray(filters.status) && filters.status.length > 0) ||
    filters.created_at?.start ||
    filters.created_at?.end
);

const getKpiValue = ({ id, statistics, emergencies }) => {
    if (id === 'pending') {
        const rowCount = emergencies.filter((item) => item.status === 'pending_approval').length;
        return countNumber(statistics?.pending, rowCount);
    }
    if (id === 'active') {
        const rowCount = emergencies.filter((item) => {
            const status = canonicalizeEmergencyStatus(item?.status, null);
            return status === 'pending_approval' || status === 'in_progress' || status === 'accepted' || status === 'arrived';
        }).length;
        return countNumber(statistics?.active, rowCount);
    }
    if (id === 'critical') {
        const rowCount = emergencies.filter((item) => item.service_type === 'critical_care').length;
        return countNumber(statistics?.critical, rowCount);
    }
    if (id === 'bed') {
        const rowCount = emergencies.filter((item) => item.service_type === 'bed').length;
        return countNumber(statistics?.bed, rowCount);
    }
    if (id === 'ambulance') {
        const rowCount = emergencies.filter((item) => item.service_type === 'ambulance').length;
        return countNumber(statistics?.ambulance, rowCount);
    }
    return countNumber(statistics?.total, emergencies.length);
};

const mobileSignalTone = {
    pending: 'bg-destructive/14 text-destructive shadow-[0_16px_42px_rgba(239,68,68,0.16)]',
    clear: 'bg-emerald-500/10 text-emerald-700 shadow-[0_16px_42px_rgba(16,185,129,0.14)] dark:text-emerald-200',
    active: 'bg-amber-500/10 text-amber-700 shadow-[0_16px_42px_rgba(245,158,11,0.14)] dark:text-amber-200',
    bed: 'bg-cyan-500/10 text-cyan-700 shadow-[0_16px_42px_rgba(6,182,212,0.14)] dark:text-cyan-200',
    ambulance: 'bg-sky-500/10 text-sky-700 shadow-[0_16px_42px_rgba(14,165,233,0.14)] dark:text-sky-200',
};

const MobileRequestsAtlasLayer = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
            style={{
                backgroundImage:
                    'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--destructive) / 0.07) 64% 67%, transparent 67%)',
                backgroundSize: '260px 180px, 340px 240px, 420px 280px',
                backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(circle at 22% 34%, hsl(var(--destructive) / 0.11), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
            }}
        />
    </div>
);

const getMobileRequestSignal = ({ kpis, kpiFilter }) => {
    const activeId = kpiFilter || 'pending';
    const active = kpis.find((item) => item.id === activeId) || kpis[0];
    const count = countNumber(active?.value, 0);

    if (active?.id === 'active') {
        return {
            ...active,
            headline: count > 0 ? `${count} active request${count === 1 ? '' : 's'}` : 'No active requests',
            subhead: count > 0 ? 'Check current care activity.' : 'Active requests will appear here.',
        };
    }

    if (active?.id === 'bed') {
        return {
            ...active,
            headline: count > 0 ? `${count} bed request${count === 1 ? '' : 's'}` : 'No bed requests',
            subhead: count > 0 ? 'Review facility needs first.' : 'Bed requests will appear here.',
        };
    }

    if (active?.id === 'ambulance') {
        return {
            ...active,
            headline: count > 0 ? `${count} ambulance request${count === 1 ? '' : 's'}` : 'No ambulance requests',
            subhead: count > 0 ? 'Check response state before acting.' : 'Ambulance requests will appear here.',
        };
    }

    const hasPending = count > 0;
    return {
        ...active,
        id: hasPending ? active.id : 'clear',
        label: hasPending ? active.label : 'Clear',
        icon: hasPending ? active.icon : CheckCheck,
        headline: hasPending ? `${count} request${count === 1 ? '' : 's'} to review` : 'No requests need review',
        subhead: hasPending ? 'Start with the newest request.' : 'Keep Requests open for new care needs.',
    };
};

export const MobileEmergency = ({
    emergencies,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    onOpenFilters,
    filterSheetOpen = false,
    analyticsOpen = false,
    hasMore,
    onLoadMore,
    loadError,
    onRetry,
    kpiFilter,
    setKpiFilter
}) => {
    const observerTarget = useRef(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const { triggerFromEvent } = useFeedback();
    const { displayItems, isBuffering } = useStableList(emergencies, loading);
    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
    const showSkeleton = loading && displayItems.length === 0;
    const filterTriggerState = filterSheetOpen ? 'open' : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';
    const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';

    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) triggerLoad();
            },
            { threshold: 0.1, rootMargin: '120px' }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, triggerLoad]);

    const kpis = useMemo(() => mobileKpis.map((item) => ({
        ...item,
        value: getKpiValue({ id: item.id, statistics, emergencies }),
    })), [statistics, emergencies]);
    const signal = useMemo(() => getMobileRequestSignal({ kpis, kpiFilter }), [kpis, kpiFilter]);
    const SignalIcon = signal.icon || AlertCircle;

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-16 text-foreground"
            >
                <MobileRequestsAtlasLayer />
                <div className="relative z-10 space-y-5">
                    {/* Compact signal header (title + subtitle). Replaces the old big 34px
                        headline; the state filter now lives in the MobileKPIStrip chip row
                        below, recycled from the shared mobile DS (see MobileSupportTickets). */}
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 px-5"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-button ${mobileSignalTone[signal.id] || mobileSignalTone.pending}`}>
                                <SignalIcon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground">Requests</p>
                                <h2 className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                                    {signal.headline}
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                    {signal.subhead}
                                </p>
                            </div>
                        </div>
                    </motion.section>

                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={kpiFilter || 'pending'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                        loading={loading}
                        labelTone="plain"
                    />

                    <section className="-mx-1 rounded-t-sheet bg-card/78 p-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55">
                        <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                        <div className="flex items-center gap-2 rounded-modal bg-background/42 p-2 dark:bg-black/[0.10]">
                            <div className="relative flex-1">
                                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="search"
                                    placeholder="Search requests..."
                                    value={filters?.search || ''}
                                    onChange={(event) => setFilters?.(prev => ({ ...prev, search: event.target.value }))}
                                    className="h-11 w-full rounded-inner bg-background/60 pl-10 pr-4 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
                                />
                            </div>
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={(event) => {
                                    onOpenFilters?.();
                                    triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                }}
                                data-state={filterTriggerState}
                                className="flex h-11 w-11 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 dark:bg-white/[0.06]"
                                aria-label="Filter requests"
                                aria-haspopup="dialog"
                                aria-expanded={filterSheetOpen}
                            >
                                <Filter size={18} />
                            </motion.button>

                            {isAdmin && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(event) => {
                                        onViewAnalytics?.();
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                    }}
                                    data-state={analyticsTriggerState}
                                    className="flex h-11 w-11 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 dark:bg-white/[0.06]"
                                    aria-label="Open request statistics"
                                    aria-haspopup="dialog"
                                    aria-expanded={analyticsOpen}
                                >
                                    <Info size={18} />
                                </motion.button>
                            )}
                        </div>

                        <div className="mt-4 flex items-center justify-between px-2">
                            <h2 className="text-lg font-semibold tracking-tight">Requests</h2>
                            {isBuffering && (
                                <span className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                                    Updating
                                </span>
                            )}
                        </div>

                        <div className="mt-3 space-y-2">
                        {!loading && loadError && displayItems.length > 0 && (
                            <div className="rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)]">
                                <p className="font-semibold">Requests could not refresh</p>
                                <p className="mt-1 text-xs text-destructive/75">{loadError}</p>
                                <button
                                    type="button"
                                    onClick={() => onRetry?.()}
                                    className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-95"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {/* Date-grouped feed (rollout S5): newest-first, a month header at each
                                boundary. Grouping is render-only; id-keyed state is unaffected. */}
                            {groupByMonth(displayItems, (request) => request?.created_at).map(({ item: request, header }) => (
                                <React.Fragment key={request.id}>
                                    {header && (
                                        <div className="px-2 pb-1 pt-3 eyebrow">
                                            {header}
                                        </div>
                                    )}
                                    <MobileRequestRow
                                        request={request}
                                        onOpen={setActiveRequest}
                                    />
                                </React.Fragment>
                            ))}
                        </AnimatePresence>

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                            {showSkeleton && <MobileListSkeletonRows />}
                            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayItems.length > 0 && (
                                <MobileListEnd label="End of requests" />
                            )}
                        </div>

                        {displayItems.length === 0 && !loading && loadError && (
                            <MobileListEmpty
                                icon={AlertCircle}
                                label="Requests did not load"
                                hint={loadError}
                                onRecover={onRetry}
                                recoverLabel="Retry"
                                labelTone="plain"
                            />
                        )}

                        {displayItems.length === 0 && !loading && !loadError && (
                            <MobileListEmpty icon={ClipboardCheck} label="No requests found" />
                        )}
                        </div>
                    </section>
                </div>

                {activeRequest && (() => {
                    const projection = buildEmergencyRenderProjection(activeRequest);
                    const vital = resolveVital('emergency', activeRequest.status);
                    const name = projection.patientDisplay.name;
                    const facility = projection.facilityDisplay.name;
                    const location = projection.locationDisplay.label;
                    const responder = projection.responderDisplay.label;
                    // For an admin reviewing a request that needs attention, Review is the filled
                    // primary and Details is demoted; otherwise Details is the single action. Both
                    // route to the existing onView receiver — no new mutation is introduced here.
                    const canAct = isAdmin && canonicalizeEmergencyStatus(activeRequest.status, null) === 'pending_approval';
                    // Islands render through MobileDetailSheet -> MobileDetailIslands (canon tiles).
                    return (
                        <MobileDetailSheet
                            isOpen
                            onClose={() => setActiveRequest(null)}
                            icon={ClipboardCheck}
                            iconTone={vital?.tone}
                            eyebrow={serviceLabel(activeRequest)}
                            title={name}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Request status' } : null}
                            islands={[
                                { icon: User, label: 'Patient', value: name },
                                { icon: ClipboardCheck, label: 'Service type', value: serviceLabel(activeRequest) },
                                { icon: Hospital, label: 'Facility', value: facility },
                                { icon: Ambulance, label: 'Ambulance', value: responder },
                                { icon: MapPin, label: 'Location', value: location },
                                { icon: Calendar, label: 'Created', value: createdDateLabel(activeRequest.created_at) },
                            ]}
                            primary={canAct
                                ? { label: 'Review', icon: ClipboardCheck, tone: 'hsl(var(--destructive))', onClick: () => { setActiveRequest(null); onView?.(activeRequest); } }
                                : { label: 'Details', icon: Eye, onClick: () => { setActiveRequest(null); onView?.(activeRequest); } }}
                            secondary={canAct
                                ? { label: 'Details', icon: Eye, onClick: () => { setActiveRequest(null); onView?.(activeRequest); } }
                                : undefined}
                        />
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};

const MobileRequestRow = ({
    request,
    onOpen,
}) => {
    const projection = buildEmergencyRenderProjection(request);
    const vital = resolveVital('emergency', request.status);
    const avatarClass = getMobileRequestAvatarClass(request);
    const name = projection.patientDisplay.name;

    return (
        <motion.div
            layout
            data-mobile-request-row={request.id}
            className="overflow-hidden rounded-card bg-muted/22 shadow-sm transition-all"
        >
            {/* Tap opens the detail bottom sheet (MobileDetailSheet) — the approved design +
                desktop rail behaviour — not an inline dropdown. */}
            <button
                type="button"
                onClick={() => onOpen(request)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="flex w-full items-start gap-3 p-4 text-left transition-transform duration-100 active:scale-[0.98]"
                aria-label={`Open ${name}`}
                aria-haspopup="dialog"
            >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-icon text-sm font-semibold ${avatarClass}`}>
                    {getInitials(name)}
                </span>
                {/* Readable identity: patient name is the primary line (2-line clamp); the request
                    time drops to its own line so it never steals width. See canon §2.1. */}
                <span className="min-w-0 flex-1">
                    <span className="text-[15px] font-semibold leading-tight text-foreground line-clamp-2 break-words">{name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{serviceLabel(request)}</span>
                    <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{formatRequestTime(request.created_at)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 pl-1">
                    <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${vital?.pill?.className || 'bg-muted/34 text-muted-foreground'}`}>{vital?.pill?.label || 'New'}</span>
                    <ChevronRight size={18} className="text-muted-foreground" />
                </span>
            </button>
        </motion.div>
    );
};
