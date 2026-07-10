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
    BadgeCheck,
    BadgeX
} from 'lucide-react';
// Canon kit re-composition (2026-07-09, pre-rebuild changelog in
// docs/audit/FEATURE_PARITY_VS_MAIN.md): SearchRow bakes in the 300ms debounce this
// page lacked + clear-x + haptic triggers; useSkeletonWarmup covers cached bottom-nav
// mounts; UpdatingPillRow is the background-refetch signal. The dropdown-row
// pseudo-sheet became the canonical MobileDetailSheet (Doctors/Insurance grammar).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';

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
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [activeHospital, setActiveHospital] = useState(null);
    const selectionMode = selectionEnabled && selectedIds.length > 0;
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

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={kpis}
                        activeKpi={activeStatusFilter}
                        onKpiClick={handleStatusFilter}
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <section className="mb-3">
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

                <div className="mb-3 px-1">
                    <SearchRow
                        placeholder="Search hospitals..."
                        search={filters?.search || ''}
                        onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        entityLabel="hospitals"
                        onOpenFilters={onOpenFilters}
                        onOpenStats={canManage ? onViewAnalytics : null}
                        statsLabel="Open analytics"
                    />
                </div>

                <MobileSectionHeader
                    label="Facility Directory"
                    count={displayHospitals.length}
                    color="hsl(var(--muted-foreground))"
                    labelTone="plain"
                    onSelectAll={selectionEnabled && displayHospitals.length > 0 ? () => onSelectAll?.(displayHospitals) : null}
                    isAllSelected={selectionEnabled && displayHospitals.length > 0 && selectedIds.length === displayHospitals.length}
                />

                <div className="space-y-1">
                    {displayHospitals.map((hospital) => {
                        const status = getHospitalStatus(hospital);
                        const statusColor = statusColorFor(status);
                        const fleet = Number(hospital.ambulances_count) || 0;
                        const beds = Number(hospital.available_beds) || 0;
                        const totalBeds = Number(hospital.total_beds) || 0;
                        // The defining numbers ride the readable secondary line, not a
                        // decorative blade (Pricing precedent).
                        const bedsText = totalBeds > 0 ? `${beds} of ${totalBeds} beds` : `${beds} beds`;

                        return (
                            <MobileMetricRow
                                key={hospital.id}
                                icon={Hospital}
                                color={statusColor}
                                label="Facility"
                                value={hospital.name || 'Unnamed Hospital'}
                                secondary={`${bedsText} · ${fleet} units`}
                                statusPill={statusPill(status)}
                                statusIndicators={hospital.verified ? [{
                                    icon: BadgeCheck,
                                    color: 'hsl(160 84% 39%)',
                                    label: 'Verified'
                                }] : []}
                                // Tap opens the canonical detail bottom sheet (MobileDetailSheet),
                                // not an inline dropdown — the approved mobile design + the
                                // desktop detail-rail behaviour.
                                onClick={() => setActiveHospital(hospital)}
                                itemId={hospital.id}
                                isSelected={selectionEnabled && selectedIds.includes(hospital.id)}
                                onSelect={selectionEnabled ? onSelect : undefined}
                                selectionMode={selectionMode}
                            />
                        );
                    })}

                    <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                        {showTopSectionLoading && <MobileListSkeletonRows />}
                        <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                        {!loading && !hasMore && displayHospitals.length > 0 && <MobileListEnd label="End of hospital list" />}
                    </div>

                    {displayHospitals.length === 0 && !loading && !showTopSectionLoading && (
                        <MobileListEmpty icon={Hospital} label="No hospitals found" labelTone="plain" />
                    )}
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

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeHospital}
                            onClose={() => setActiveHospital(null)}
                            icon={Hospital}
                            iconTone={statusColor}
                            eyebrow="Facility"
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
                                {
                                    icon: Ambulance,
                                    label: 'Fleet',
                                    value: `${fleet} ambulance${fleet === 1 ? '' : 's'}`
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
