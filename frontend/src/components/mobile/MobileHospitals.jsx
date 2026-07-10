import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    Hospital,
    Bed,
    Ambulance,
    MapPin,
    Star,
    Eye,
    Edit,
    Trash2,
    CalendarDays,
    Phone,
    Hash,
    Clock,
    History,
    Zap,
    BadgeCheck,
    BadgeX
} from 'lucide-react';
// Canon kit re-composition (2026-07-09, pre-rebuild changelog in
// docs/audit/FEATURE_PARITY_VS_MAIN.md): SearchRow bakes in the 300ms debounce this
// page lacked + clear-x + haptic triggers; useSkeletonWarmup covers cached bottom-nav
// mounts; UpdatingPillRow is the background-refetch signal. The dropdown-row
// pseudo-sheet became the canonical MobileDetailSheet (Doctors/Insurance grammar).
// Directory-grammar PILOT (user arbitration 2026-07-09, "Hospitals only, for now"):
// the list body composes the Requests/Visits kit — MobileHeading + one flat
// GroupPanel + hairline MobileListRow — instead of the legacy fat-card rows.
// Doctors/Users/Insurance/Subscriptions HOLD until the pilot look is approved.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader } from './MobileMetricList';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';

// Sentence-case a raw facility type token ('specialty_clinic' -> 'Specialty clinic').
const facilityTypeLabel = (hospital) => {
    const raw = hospital?.type || hospital?.provider_type;
    if (!raw) return 'Facility';
    const text = String(raw).replace(/[_-]+/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Facility';
};

// Native reads (read-the-data-we-have rule): coordinates win, address text is the
// fallback; either way the island deep-links into the user's maps app.
const mapsHref = (hospital) => {
    const lat = Number(hospital?.latitude);
    const lng = Number(hospital?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        return `https://maps.google.com/?q=${lat},${lng}`;
    }
    if (hospital?.address) {
        return `https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`;
    }
    return undefined;
};

export const MobileHospitals = ({
    hospitals,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onSchedule,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    errorMessage = null,
    onRetry,
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [activeHospital, setActiveHospital] = useState(null);
    // Selection props stay accepted as dormant inventory (selection is fail-closed
    // estate-wide); the kit MobileListRow carries no selection affordance until
    // receiver proof lands, so nothing renders from them.
    const sourceHospitals = useMemo(() => (Array.isArray(hospitals) ? hospitals : []), [hospitals]);

    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

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

    const getHospitalStatus = (hospital) => String(hospital?.status || hospital?.verification_status || 'available').toLowerCase();
    const metricValue = (value, fallback = 0) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : fallback;
    };

    const hospitalTotals = {
        total: metricValue(statistics?.total, sourceHospitals.length),
        available: metricValue(statistics?.available, sourceHospitals.filter(h => getHospitalStatus(h) === 'available').length),
        full: metricValue(statistics?.full, sourceHospitals.filter(h => getHospitalStatus(h) === 'full').length),
        busy: metricValue(statistics?.busy, sourceHospitals.filter(h => getHospitalStatus(h) === 'busy').length),
        verified: metricValue(statistics?.verified, sourceHospitals.filter(h => h.verified).length),
        beds: metricValue(statistics?.visibleBeds, sourceHospitals.reduce((sum, h) => sum + (Number(h.available_beds) || 0), 0)),
        fleet: metricValue(statistics?.visibleAmbulances, sourceHospitals.reduce((sum, h) => sum + (Number(h.ambulances_count) || 0), 0))
    };

    // Literal status hues (sky/emerald/amber) — the semantic tokens (--primary/--success/
    // --warning/--info) all resolve to brand red in this theme and are reserved for danger.
    const kpis = [
        {
            id: 'all',
            label: 'Hospitals',
            value: hospitalTotals.total,
            color: 'hsl(var(--muted-foreground))'
        },
        {
            id: 'available',
            label: 'Available',
            value: hospitalTotals.available,
            color: 'hsl(160 84% 39%)'
        },
        {
            id: 'busy',
            label: 'Busy',
            value: hospitalTotals.busy,
            color: 'hsl(38 92% 50%)'
        },
        {
            id: 'full',
            label: 'Full',
            value: hospitalTotals.full,
            color: 'hsl(var(--destructive))'
        }
    ];

    const { displayItems: displayHospitals, isBuffering } = useStableList(sourceHospitals, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayHospitals.length === 0);

    const canManage = isAdmin || isOrgAdmin;
    const activeStatusFilter = Array.isArray(filters?.status)
        ? (filters.status.length === 1 ? filters.status[0] : 'all')
        : (filters?.status || 'all');
    const handleStatusFilter = (id) => {
        setFilters(prev => {
            const nextFilters = { ...prev };
            if (id === 'all') {
                delete nextFilters.status;
            } else {
                nextFilters.status = id;
            }
            return nextFilters;
        });
    };

    const statusColorFor = (status) => (
        status === 'available' || status === 'verified'
            ? 'hsl(160 84% 39%)'
            : status === 'full' || status === 'pending'
                ? 'hsl(38 92% 50%)'
                : 'hsl(var(--muted-foreground))'
    );

    // Status-tinted row orb (kit MobileListRow anatomy; literal palette — the
    // theme's semantic tokens resolve to brand red and are reserved for danger).
    const orbClassFor = (status) => (
        status === 'available'
            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
            : status === 'busy'
                ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
                : status === 'full'
                    ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                    : 'bg-muted/40 text-muted-foreground'
    );

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="min-h-[calc(100dvh-3rem)] px-0 pb-32 pt-8 text-foreground"
            >
                <div className="space-y-3">
                {/* Chrome (title + summary) is always present — no entrance motion.
                    Only DATA regions load; they scaffold with skeletons and replace
                    in place (donor: MobileEmergency/MobileVisits heading order). */}
                <MobileHeading
                    title="Hospitals"
                    noun="hospital"
                    count={hospitalTotals.total}
                    showSkeleton={showTopSectionLoading}
                    failedEmpty={Boolean(errorMessage) && displayHospitals.length === 0}
                />

                <MobileKPIStrip
                    loading={showTopSectionLoading}
                    kpis={kpis}
                    activeKpi={activeStatusFilter}
                    onKpiClick={handleStatusFilter}
                />

                <section className="px-4">
                    <MobileSectionHeader
                        label="Facility Signals"
                        count={hospitalTotals.available}
                        color="hsl(160 84% 39%)"
                        labelTone="plain"
                    />
                    <MobileSecondaryMetricRail
                        loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Hospital,
                                title: 'Available Sites',
                                subtitle: 'Current status',
                                value: hospitalTotals.available,
                                color: 'hsl(160 84% 39%)',
                                iconColorClass: 'text-emerald-600 dark:text-emerald-300',
                                iconBgClass: 'bg-emerald-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeCheck,
                                title: 'Verified',
                                subtitle: 'Approved sites',
                                value: hospitalTotals.verified,
                                color: 'hsl(38 92% 50%)',
                                iconColorClass: 'text-amber-600 dark:text-amber-300',
                                iconBgClass: 'bg-amber-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Bed,
                                title: 'Visible Beds',
                                subtitle: 'This page',
                                value: hospitalTotals.beds,
                                color: 'hsl(189 94% 43%)',
                                iconColorClass: 'text-cyan-700 dark:text-cyan-300',
                                iconBgClass: 'bg-cyan-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Visible Fleet',
                                subtitle: 'This page',
                                value: hospitalTotals.fleet,
                                color: 'hsl(199 89% 48%)',
                                iconColorClass: 'text-sky-700 dark:text-sky-300',
                                iconBgClass: 'bg-sky-500/10',
                                onClick: onViewAnalytics
                            }
                        ]}
                    />
                </section>

                <section className="px-4">
                    {/* Flat search row (canon Apple search bar): input + filter + stats
                        controls sit directly on the page; the panel list follows below. */}
                    <SearchRow
                        placeholder="Search hospitals..."
                        search={filters?.search || ''}
                        onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        entityLabel="hospitals"
                        onOpenFilters={onOpenFilters}
                        onOpenStats={canManage ? onViewAnalytics : null}
                        statsLabel="Open analytics"
                    />

                    <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />

                    <div className="mt-3 space-y-2">
                        {errorMessage && displayHospitals.length > 0 && (
                            <div
                                className="rounded-card bg-destructive/10 p-4 text-destructive"
                                data-testid="mobile-hospitals-degraded-state"
                            >
                                <p className="text-sm font-semibold">Hospitals did not refresh</p>
                                <p className="mt-1 text-xs text-destructive/75">Showing the last loaded facility rows.</p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Directory pilot: ONE flat panel (a directory has no recency
                            buckets worth grouping), hairline-separated kit rows. Tap opens
                            the detail bottom sheet, never an inline dropdown. */}
                        {displayHospitals.length > 0 && (
                            <GroupPanel label="Facility directory" count={displayHospitals.length}>
                                {displayHospitals.map((hospital, index) => {
                                    const status = getHospitalStatus(hospital);
                                    const fleet = Number(hospital.ambulances_count) || 0;
                                    const beds = Number(hospital.available_beds) || 0;

                                    return (
                                        <React.Fragment key={hospital.id}>
                                            <MobileListRow
                                                item={hospital}
                                                dataAttr="data-mobile-hospital-row"
                                                onOpen={setActiveHospital}
                                                ariaLabel={`${hospital.name || 'Unnamed Hospital'}, ${status}`}
                                                orbClass={orbClassFor(status)}
                                                icon={Hospital}
                                                title={hospital.name || 'Unnamed Hospital'}
                                                meta={`${facilityTypeLabel(hospital)} · ${fleet} unit${fleet === 1 ? '' : 's'}`}
                                                time={`${beds} beds`}
                                                markerChip={hospital.verified ? 'Verified' : null}
                                                pill={statusPill(status)}
                                            />
                                            {index < displayHospitals.length - 1 && <Hairline />}
                                        </React.Fragment>
                                    );
                                })}
                            </GroupPanel>
                        )}

                        <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                            {showTopSectionLoading && <MobileListSkeletonRows />}
                            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayHospitals.length > 0 && <MobileListEnd label="End of hospital list" />}
                        </div>

                        {displayHospitals.length === 0 && !loading && !showTopSectionLoading && (
                            <MobileListEmpty
                                icon={Hospital}
                                label={errorMessage ? 'Hospitals did not load' : 'No hospitals found'}
                                hint={errorMessage ? 'Try again before treating the network as empty.' : undefined}
                                labelTone="plain"
                            />
                        )}
                    </div>
                </section>
                </div>

                {activeHospital && (() => {
                    const status = getHospitalStatus(activeHospital);
                    const statusColor = statusColorFor(status);
                    const fleet = Number(activeHospital.ambulances_count) || 0;
                    const beds = Number(activeHospital.available_beds) || 0;
                    const totalBeds = Number(activeHospital.total_beds) || 0;
                    const rating = Number(activeHospital.rating) || 0;
                    const phone = activeHospital.phone;
                    // Display IDs are labels: prefer the ORG-XXXXXX display_id the service
                    // projects; the truncated UUID is only a fallback, never mutation identity.
                    const facilityId = activeHospital.display_id || `#${String(activeHospital.id || '').slice(0, 12).toUpperCase()}`;
                    // Operational reads the schema already carries (data-sync pass 2026-07-09):
                    // wait time, ICU beds, app-eligibility flags, availability freshness.
                    // Null stays hidden (Number(null) coerces to a lying 0); a 0-minute wait
                    // also reads as default-unset, so only a positive wait is claimed.
                    const icuBeds = activeHospital.icu_beds_available != null
                        ? Number(activeHospital.icu_beds_available)
                        : null;
                    const waitMinutes = Number(activeHospital.emergency_wait_time_minutes);
                    const waitValue = Number.isFinite(waitMinutes) && waitMinutes > 0
                        ? `≈ ${waitMinutes} min`
                        : (activeHospital.wait_time || null);
                    const eligibility = [
                        activeHospital.emergency_eligible && 'Emergency',
                        activeHospital.dispatch_eligible && 'Dispatch',
                        activeHospital.booking_eligible && 'Booking'
                    ].filter(Boolean).join(' · ');
                    const availabilityUpdated = activeHospital.last_availability_update
                        ? formatRelativeTime(activeHospital.last_availability_update)
                        : null;
                    const specialties = Array.isArray(activeHospital.specialties)
                        ? activeHospital.specialties.filter(Boolean)
                        : [];

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeHospital}
                            onClose={() => setActiveHospital(null)}
                            icon={Hospital}
                            iconTone={statusColor}
                            eyebrow={facilityTypeLabel(activeHospital)}
                            title={activeHospital.name || 'Unnamed Hospital'}
                            statusPill={statusPill(status)}
                            islands={[
                                {
                                    icon: MapPin,
                                    label: 'Address',
                                    value: activeHospital.address || 'No address provided',
                                    href: mapsHref(activeHospital)
                                },
                                phone && {
                                    icon: Phone,
                                    label: 'Phone',
                                    value: phone,
                                    href: `tel:${String(phone).replace(/[\s-]/g, '')}`
                                },
                                {
                                    icon: Bed,
                                    label: 'Beds',
                                    value: totalBeds > 0 ? `${beds} of ${totalBeds} available` : `${beds} available`
                                },
                                icuBeds != null && Number.isFinite(icuBeds) && {
                                    icon: Bed,
                                    label: 'ICU beds',
                                    value: `${icuBeds}`
                                },
                                {
                                    icon: Ambulance,
                                    label: 'Fleet',
                                    value: `${fleet} ambulance${fleet === 1 ? '' : 's'}`
                                },
                                waitValue && {
                                    icon: Clock,
                                    label: 'Wait time',
                                    value: waitValue
                                },
                                eligibility && {
                                    icon: Zap,
                                    label: 'Eligibility',
                                    value: eligibility
                                },
                                availabilityUpdated && {
                                    icon: History,
                                    label: 'Availability updated',
                                    value: availabilityUpdated
                                },
                                {
                                    icon: Star,
                                    label: 'Rating',
                                    value: rating > 0 ? rating.toFixed(1) : 'Not rated'
                                },
                                {
                                    icon: activeHospital.verified ? BadgeCheck : BadgeX,
                                    label: 'Verification',
                                    value: activeHospital.verified ? 'Verified' : 'Not verified'
                                },
                                {
                                    icon: Hash,
                                    label: 'Facility ID',
                                    value: facilityId
                                }
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveHospital(null); onView(activeHospital); } }}
                            secondary={canManage ? { icon: Edit, onClick: () => { setActiveHospital(null); onEdit(activeHospital); }, 'aria-label': `Edit ${activeHospital.name || 'facility'}` } : undefined}
                        >
                            {specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {specialties.slice(0, 4).map((specialty) => (
                                        <span
                                            key={specialty}
                                            className="inline-flex items-center rounded-pill bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.08]"
                                        >
                                            {specialty}
                                        </span>
                                    ))}
                                    {specialties.length > 4 && (
                                        <span className="inline-flex items-center rounded-pill px-2 py-1 text-[11px] font-semibold text-muted-foreground/60">
                                            +{specialties.length - 4} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Gated command inventory (gate ledger: scheduling + destructive
                                delete stay unavailable until receiver proof; the page passes
                                canDelete={false} and no onSchedule today). */}
                            {canManage && (onSchedule || (canDelete && onDelete)) && (
                                <div className="flex gap-2 pt-1">
                                    {onSchedule && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveHospital(null); onSchedule(activeHospital); }}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-foreground/[0.06] text-sm font-semibold text-foreground transition-all active:scale-[0.96] hover:bg-foreground/10 dark:bg-white/[0.08]"
                                        >
                                            <CalendarDays className="h-4 w-4" />
                                            Schedule
                                        </button>
                                    )}
                                    {canDelete && onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveHospital(null); onDelete(activeHospital); }}
                                            aria-label={`Delete ${activeHospital.name || 'facility'}`}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform active:scale-[0.96] hover:bg-destructive/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
