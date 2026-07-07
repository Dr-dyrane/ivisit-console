import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Ambulance,
    BedDouble,
    CheckCheck,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Filter,
    Hospital,
    Info,
    MapPin,
    Search,
} from 'lucide-react';
import { Button } from '../ui/button';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';

const mobileKpis = [
    {
        id: 'pending',
        label: 'Needs attention',
        icon: AlertCircle,
        activeClass: 'bg-destructive/16 text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.18)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'active',
        label: 'Active',
        icon: Clock,
        activeClass: 'bg-amber-500/10 text-amber-700 shadow-[0_18px_54px_rgba(245,158,11,0.16)] dark:text-amber-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'bed',
        label: 'Beds',
        icon: BedDouble,
        activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-[0_18px_54px_rgba(6,182,212,0.14)] dark:text-cyan-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'ambulance',
        label: 'Ambulance',
        icon: Ambulance,
        activeClass: 'bg-sky-500/10 text-sky-700 shadow-[0_18px_54px_rgba(14,165,233,0.14)] dark:text-sky-200',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
];

const statusMeta = {
    pending_approval: {
        label: 'Needs attention',
        className: 'bg-destructive/14 text-destructive',
    },
    in_progress: {
        label: 'Active',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    },
    accepted: {
        label: 'Accepted',
        className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    },
    arrived: {
        label: 'Arrived',
        className: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-muted/34 text-muted-foreground',
    },
    payment_declined: {
        label: 'Payment issue',
        className: 'bg-destructive/14 text-destructive',
    },
};

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

const getStatusMeta = (request) => {
    const key = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
    return statusMeta[key] || { label: 'New', className: 'bg-muted/34 text-muted-foreground' };
};

const getMobileRequestAvatarClass = (request) => {
    const key = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
    if (key === 'pending_approval' || key === 'payment_declined') {
        return 'bg-destructive/14 text-destructive';
    }
    if (key === 'completed') {
        return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
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
    const [expandedRequestId, setExpandedRequestId] = useState(null);
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
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 px-5"
                    >
                        <div className={`inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${mobileSignalTone[signal.id] || mobileSignalTone.pending}`}>
                            <SignalIcon size={15} />
                            {signal.label}
                        </div>
                        <div>
                            <h1 className="text-[34px] font-semibold leading-[1.03] tracking-normal text-foreground">
                                {signal.headline}
                            </h1>
                            <p className="mt-3 max-w-[22rem] text-[15px] leading-6 text-muted-foreground">
                                {signal.subhead}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {kpis.map((item) => {
                                const Icon = item.icon;
                                const active = (kpiFilter || 'pending') === item.id;
                                const clearPending = item.id === 'pending' && countNumber(item.value, 0) === 0;
                                const activeClass = clearPending
                                    ? 'bg-emerald-500/10 text-emerald-700 shadow-[0_18px_54px_rgba(16,185,129,0.16)] dark:text-emerald-200'
                                    : item.activeClass;
                                return (
                                    <motion.button
                                        key={item.id}
                                        type="button"
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setKpiFilter?.(item.id)}
                                        data-request-kpi={item.id}
                                        data-state={active ? 'selected' : 'idle'}
                                        className={`min-h-[86px] rounded-card px-4 py-3 text-left transition-all ${active ? activeClass : item.restClass}`}
                                        aria-pressed={active}
                                        aria-label={`${item.label}: ${item.value}`}
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

                        {displayItems.map((request) => (
                            <MobileRequestRow
                                key={request.id}
                                request={request}
                                expanded={expandedRequestId === request.id}
                                setExpandedRequestId={setExpandedRequestId}
                                onView={onView}
                                isAdmin={isAdmin}
                            />
                        ))}

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
            </MobilePageShell>
        </PullToRefresh>
    );
};

const MobileRequestRow = ({
    request,
    expanded,
    setExpandedRequestId,
    onView,
    isAdmin,
}) => {
    const projection = buildEmergencyRenderProjection(request);
    const status = getStatusMeta(request);
    const avatarClass = getMobileRequestAvatarClass(request);
    const name = projection.patientDisplay.name;
    const facility = projection.facilityDisplay.name;
    const location = projection.locationDisplay.label;
    const canAct = isAdmin && canonicalizeEmergencyStatus(request.status, null) === 'pending_approval';

    return (
        <motion.div
            layout
            data-mobile-request-row={request.id}
            data-state={expanded ? 'expanded' : 'idle'}
            className={`overflow-hidden rounded-card bg-muted/22 shadow-sm transition-all ${expanded ? 'bg-muted/34 shadow-[0_20px_60px_rgba(0,0,0,0.18)]' : ''}`}
        >
            <button
                type="button"
                onClick={() => setExpandedRequestId(expanded ? null : request.id)}
                data-state={expanded ? 'expanded' : 'idle'}
                className="flex w-full items-center gap-3 p-4 text-left"
                aria-label={`${expanded ? 'Close' : 'Open'} ${name}`}
                aria-expanded={expanded}
            >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-icon text-sm font-semibold ${avatarClass}`}>
                    {getInitials(name)}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{serviceLabel(request)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                    <span className="text-xs font-medium text-muted-foreground">{formatRequestTime(request.created_at)}</span>
                </span>
                {expanded ? (
                    <ChevronDown size={18} className="text-muted-foreground" />
                ) : (
                    <ChevronRight size={18} className="text-muted-foreground" />
                )}
            </button>

            {expanded && (
                <div className="space-y-3 px-4 pb-4">
                    <MobileDetailLine icon={Hospital} label="Facility" value={facility} />
                    <MobileDetailLine icon={MapPin} label="Location" value={location} />
                    <MobileDetailLine icon={ClipboardCheck} label="Service" value={serviceLabel(request)} />

                    <div className={`grid gap-2 pt-1 ${canAct ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <Button
                            variant="ghost"
                            className="h-12 rounded-button bg-background/36 font-semibold transition-all hover:bg-foreground hover:text-background active:scale-95"
                            onClick={() => onView(request)}
                        >
                            <Info className="mr-2 h-4 w-4" />
                            Details
                        </Button>
                        {canAct ? (
                            <Button
                                variant="ghost"
                                className="h-12 rounded-button bg-destructive text-white shadow-[0_16px_46px_rgba(239,68,68,0.25)] transition-all hover:bg-destructive/90 active:scale-95"
                                onClick={() => onView(request)}
                            >
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                Review
                            </Button>
                        ) : null}
                    </div>

                </div>
            )}
        </motion.div>
    );
};

const MobileDetailLine = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 rounded-inner bg-background/30 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground">
            <Icon size={15} />
        </span>
        <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value || 'Not set'}</span>
        </span>
    </div>
);
