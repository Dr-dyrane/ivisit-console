import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Ambulance,
    BarChart3,
    BedDouble,
    Calendar,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Eye,
    Filter,
    Hospital,
    MapPin,
    Search,
    Send,
    User,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore } from './MobileListStates';
import { MobileDetailSheet } from './MobileDetailSheet';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';
import { resolveVital } from '../../constants/vitalTracks';
import { groupByRecency } from '../../utils/groupByRecency';

// Minimum skeleton time on every mount. Bottom-nav navigation mounts with cached
// data (loading already false), so without this the page would skip the skeleton and
// assemble cached content top-to-bottom. A short forced warm-up makes navigation load
// skeleton-first then reveal in one commit — identical to a hard refresh. Tunable.
const SKELETON_WARMUP_MS = 400;

// State filter chips for MobileKPIStrip. `color` is the raw status hue for the chip
// dot (active chip is brand-filled by MobileKPIStrip itself). Hues mirror the row
// avatars/pills and the desktop RequestKpiStrip: attention=destructive, active=amber,
// bed=cyan, ambulance=sky. `icon` feeds the compact signal header.
const mobileKpis = [
    { id: 'all', label: 'All', color: 'hsl(var(--muted-foreground))' },
    { id: 'pending', label: 'Needs attention', icon: AlertCircle, color: 'hsl(var(--destructive))' },
    { id: 'active', label: 'Active', icon: Clock, color: '#f59e0b' },
    { id: 'bed', label: 'Beds', icon: BedDouble, color: '#06b6d4' },
    { id: 'ambulance', label: 'Ambulance', icon: Ambulance, color: '#0ea5e9' },
];

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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

// Orb glyph by service type: ambulance/bed get their literal icon, everything else the
// generic facility mark. Mirrors the app's inferRequestType icon mapping.
const getMobileRequestTypeIcon = (request) => {
    const type = String(request?.service_type || '').toLowerCase();
    if (type === 'ambulance') return Ambulance;
    if (type === 'bed') return BedDouble;
    return Hospital;
};

const hasMobileRequestFilters = (filters = {}) => Boolean(
    filters.search ||
    (Array.isArray(filters.status) && filters.status.length > 0) ||
    filters.created_at?.start ||
    filters.created_at?.end
);

const getKpiValue = ({ id, statistics, emergencies }) => {
    if (id === 'all') {
        return countNumber(statistics?.total, emergencies.length);
    }
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

// Group-shaped load scaffold: mirrors the real recency panel 1:1 (same header row,
// frosted panel, row rhythm, and 62px hairline inset) so the list REPLACES it in place
// with zero layout jump — no top-to-bottom entrance, the skeleton holds the layout and
// content materializes where it already sat. Apple/iOS loading model.
const MobileRequestsListSkeleton = ({ groups = 2, rowsPerGroup = 3 }) => (
    <div className="space-y-[18px]" aria-hidden="true">
        {Array.from({ length: groups }).map((_, groupIndex) => (
            <div key={groupIndex}>
                <div className="flex items-center justify-between px-1 pb-2.5">
                    <span className="h-[13px] w-24 rounded-pill bg-muted/25 shimmer" />
                    <span className="h-[13px] w-5 rounded-pill bg-muted/20 shimmer" />
                </div>
                <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
                    {Array.from({ length: rowsPerGroup }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            <div className="flex items-center gap-3 px-2 py-3">
                                <span className="h-10 w-10 shrink-0 rounded-pill bg-muted/25 shimmer" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <span className="block h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer" />
                                    <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                                </div>
                                <span className="ml-2 h-6 w-14 shrink-0 rounded-pill bg-muted/20 shimmer" />
                            </div>
                            {rowIndex < rowsPerGroup - 1 && (
                                <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export const MobileEmergency = ({
    emergencies,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onDispatch,
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
    // Forced skeleton on every mount (see SKELETON_WARMUP_MS): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const [warmingUp, setWarmingUp] = useState(true);
    const { triggerFromEvent } = useFeedback();
    const { displayItems, isBuffering } = useStableList(emergencies, loading);
    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
    // Skeleton while warming up OR while the first real fetch is still pending.
    // When it clears, the whole list swaps in a single commit — no top-to-bottom assemble.
    const showSkeleton = warmingUp || (loading && displayItems.length === 0);
    const filterTriggerState = filterSheetOpen ? 'open' : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';
    const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';

    useEffect(() => {
        const timer = setTimeout(() => setWarmingUp(false), SKELETON_WARMUP_MS);
        return () => clearTimeout(timer);
    }, []);

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
    // Header count tracks the ACTIVE KPI, not the raw total — otherwise "40 requests"
    // sits above a 3-row Ambulance-filtered list (the count must equal the visible scope,
    // matching the desktop filtered count). KPI-agnostic stats give the right per-KPI total.
    const totalRequests = getKpiValue({ id: kpiFilter || 'pending', statistics, emergencies });

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileRequestsAtlasLayer />
                <div className="relative z-10 space-y-3">
                    {/* Chrome (title + summary) is always present — no entrance motion.
                        Only DATA regions load; they scaffold with skeletons and replace
                        in place, so nothing sweeps in top-to-bottom. */}
                    <section className="px-4">
                        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">Requests</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {showSkeleton ? 'Loading requests...' : `${totalRequests} request${totalRequests === 1 ? '' : 's'}`}
                        </p>
                    </section>

                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={kpiFilter || 'pending'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                        loading={showSkeleton}
                    />

                    <section className="px-4">
                        {/* Flat search row (canon Apple search bar): no wrapping surface,
                            no drag-handle. The input + filter + stats controls sit directly
                            on the page over the atlas; the grouped list follows below. */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="search"
                                    placeholder="Search requests..."
                                    value={filters?.search || ''}
                                    onChange={(event) => setFilters?.(prev => ({ ...prev, search: event.target.value }))}
                                    className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-4 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
                                />
                            </div>
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={(event) => {
                                    onOpenFilters?.();
                                    triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                }}
                                data-state={filterTriggerState}
                                className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                aria-label="Filter requests"
                                aria-haspopup="dialog"
                                aria-expanded={filterSheetOpen}
                            >
                                <Filter size={18} />
                            </motion.button>

                            {isAdmin && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.96 }}
                                    onClick={(event) => {
                                        onViewAnalytics?.();
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                    }}
                                    data-state={analyticsTriggerState}
                                    className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                    aria-label="Open request statistics"
                                    aria-haspopup="dialog"
                                    aria-expanded={analyticsOpen}
                                >
                                    <BarChart3 size={18} />
                                </motion.button>
                            )}
                        </div>

                        <div className="mt-4 flex items-center justify-end px-2">
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
                                    className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* iOS-Settings grouped list (canon): one frosted PANEL per recency
                            bucket over the atlas; rows are transparent, separated by a slate
                            hairline — separation is fill/frost, never a border. Grouping is
                            render-only; id-keyed state is unaffected.

                            Load model: the group-shaped skeleton holds the exact final
                            layout, then the real list REPLACES it in place — no entrance
                            motion at all. A fade here would run FROM BLANK on cached (bottom-
                            nav) mounts where the data is already present, which reads as a
                            top-to-bottom load; instant replace keeps reload and navigation
                            identical. Nothing moves; content is simply there once mounted. */}
                        {showSkeleton ? (
                            <MobileRequestsListSkeleton />
                        ) : (
                        <div className="space-y-[18px]">
                            {groupByRecency(
                                displayItems,
                                (request) => request.created_at,
                                (request) => canonicalizeEmergencyStatus(request.status, null),
                            ).map(({ key, label, items }) => (
                                <div key={key}>
                                    <div className="flex items-center justify-between px-1 pb-2.5">
                                        <span className="text-[13px] font-bold leading-[17px] text-muted-foreground">{label}</span>
                                        <span className="text-[13px] font-bold text-muted-foreground/60 tabular-nums">{items.length}</span>
                                    </div>
                                    <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
                                        {items.map((request, index) => {
                                            const projection = buildEmergencyRenderProjection(request);
                                            const vital = resolveVital('emergency', request.status);
                                            const pill = vital?.pill;
                                            const name = projection.patientDisplay.name;
                                            const avatarClass = getMobileRequestAvatarClass(request);
                                            const TypeIcon = getMobileRequestTypeIcon(request);
                                            return (
                                                <React.Fragment key={request.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveRequest(request)}
                                                        className="group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]"
                                                        data-mobile-request-row={request.id}
                                                        aria-haspopup="dialog"
                                                        aria-label={`Open ${name}`}
                                                    >
                                                        <span className={`h-10 w-10 shrink-0 rounded-pill flex items-center justify-center ${avatarClass}`}>
                                                            <TypeIcon size={20} />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[15px] leading-5 font-medium text-foreground truncate">{name}</p>
                                                            <p className="mt-0.5 text-xs leading-[17px] text-muted-foreground truncate">{serviceLabel(request)} · {createdDateLabel(request.created_at)}</p>
                                                        </div>
                                                        <span className="ml-2 shrink-0 flex flex-col items-end gap-2 min-w-[72px]">
                                                            <span className="text-xs leading-[15px] font-bold text-foreground tabular-nums">{formatRequestTime(request.created_at)}</span>
                                                            <span className="flex items-center gap-2">
                                                                <span className={`rounded-pill px-2.5 py-[5px] text-[11px] font-bold ${pill?.className || 'bg-muted/34 text-muted-foreground'}`}>{pill?.label || 'New'}</span>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                                                            </span>
                                                        </span>
                                                    </button>
                                                    {index < items.length - 1 && (
                                                        <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" aria-hidden="true" />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
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
                    const actionState = getEmergencyActionState(activeRequest);
                    // Dispatch is non-destructive and gated exactly like the desktop dispatch
                    // (canManage && actionState.canDispatch - here isAdmin already folds
                    // admin + org_admin). It reuses onDispatch -> handleDispatch, the same
                    // console_dispatch_emergency mutation path; no new mutation is introduced.
                    const canDispatch = isAdmin && actionState.canDispatch;
                    // For a request that needs attention, Review is the filled primary; Details
                    // is otherwise the single action. Both route to the existing onView receiver.
                    const canReview = isAdmin && canonicalizeEmergencyStatus(activeRequest.status, null) === 'pending_approval';
                    const detailsAction = { label: 'Details', icon: Eye, onClick: () => { setActiveRequest(null); onView?.(activeRequest); } };
                    let primaryAction = detailsAction;
                    let secondaryAction;
                    if (canDispatch) {
                        primaryAction = { label: 'Dispatch', icon: Send, tone: 'hsl(200 98% 39%)', onClick: () => { setActiveRequest(null); onDispatch?.(activeRequest); } };
                        secondaryAction = detailsAction;
                    } else if (canReview) {
                        primaryAction = { label: 'Review', icon: ClipboardCheck, tone: 'hsl(var(--destructive))', onClick: () => { setActiveRequest(null); onView?.(activeRequest); } };
                        secondaryAction = detailsAction;
                    }
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
                                { icon: Ambulance, label: 'Responder', value: responder },
                                { icon: MapPin, label: 'Location', value: location },
                                { icon: Calendar, label: 'Created', value: createdDateLabel(activeRequest.created_at) },
                            ]}
                            primary={primaryAction}
                            secondary={secondaryAction}
                        />
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
