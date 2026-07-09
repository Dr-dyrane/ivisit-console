import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BadgeCheck,
    CheckCircle2,
    Circle,
    Clock,
    Edit,
    Eye,
    Filter,
    Hospital,
    Mail,
    Phone,
    Search,
    Stethoscope,
    Trash2,
    Users
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileMetricRow } from './MobileMetricList';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';

const mobileStaffFilters = [
    {
        id: 'all',
        label: 'Staff',
        icon: Users,
        activeClass: 'bg-sky-400/12 text-sky-700 dark:text-sky-300',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'available',
        label: 'Available',
        icon: CheckCircle2,
        activeClass: 'bg-emerald-400/12 text-emerald-700 dark:text-emerald-300',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'on_call',
        label: 'On call',
        icon: Phone,
        activeClass: 'bg-sky-400/12 text-sky-700 dark:text-sky-300',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'busy',
        label: 'Busy',
        icon: Clock,
        activeClass: 'bg-amber-400/12 text-amber-700 dark:text-amber-300',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
];

const getStatus = (doctor) => String(doctor?.status || 'available').toLowerCase();

const getFilterValue = ({ id, statistics, doctors }) => {
    if (id === 'all') return Number(statistics?.total) || doctors.length;
    if (id === 'on_call') return Number(statistics?.onCall) || doctors.filter(d => getStatus(d) === 'on_call').length;
    return Number(statistics?.[id]) || doctors.filter(d => getStatus(d) === id).length;
};

export const MobileDoctors = ({
    doctors,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    isAdmin,
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    canManage: canManageOverride,
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [activeDoctor, setActiveDoctor] = useState(null);
    const canManage = Boolean(canManageOverride ?? (isAdmin || isOrgAdmin));
    const canSelect = selectionEnabled && canManage && Boolean(onSelect);
    const selectionMode = canSelect && selectedIds.length > 0;
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
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, triggerLoad]);

    const sourceDoctors = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);
    const { displayItems: displayDoctors, isBuffering } = useStableList(sourceDoctors, loading);
    const showSkeleton = loading && displayDoctors.length === 0;

    const filterItems = useMemo(() => mobileStaffFilters.map((item) => ({
        ...item,
        value: getFilterValue({ id: item.id, statistics, doctors }),
    })), [statistics, doctors]);

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="pt-4 pb-32 text-foreground"
            >
                <div className="space-y-4">
                    <div className="overflow-x-auto pb-1" aria-label="Staff status filters">
                        <div className="flex min-w-max gap-2">
                            {filterItems.map((item) => {
                                const Icon = item.icon;
                                const active = (filters?.kpiFilter || 'all') === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        type="button"
                                        whileTap={{ scale: 0.96 }}
                                        onClick={(event) => {
                                            setFilters?.(prev => ({ ...prev, kpiFilter: item.id }));
                                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'rgb(125 211 252)', haptic: true, sound: true });
                                        }}
                                        className={`flex h-16 min-w-[142px] items-center gap-3 rounded-inner px-4 text-left transition-all ${active ? item.activeClass : item.restClass}`}
                                        aria-pressed={active}
                                    >
                                        <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-background/40">
                                            <Icon size={18} />
                                        </span>
                                        <span>
                                            <span className="block text-xs font-semibold">{item.label}</span>
                                            <span className="block text-2xl font-semibold tracking-normal text-foreground">{item.value}</span>
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                            <input
                                type="search"
                                placeholder="Search staff..."
                                value={filters?.search || ''}
                                onChange={(event) => setFilters?.(prev => ({ ...prev, search: event.target.value }))}
                                className="h-11 w-full rounded-inner bg-muted/28 pl-10 pr-4 text-[13px] font-medium text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_rgba(14,165,233,0.22)]"
                            />
                        </div>
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={(event) => {
                                onOpenFilters?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'rgb(125 211 252)', haptic: true, sound: true });
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-button bg-muted/28 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground"
                            aria-label="Filter staff"
                        >
                            <Filter size={18} />
                        </motion.button>
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-lg font-semibold tracking-normal">Staff</h2>
                        <div className="flex items-center gap-2">
                            {isBuffering && (
                                <span className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                                    Updating
                                </span>
                            )}
                            {canSelect && displayDoctors.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onSelectAll?.(!(selectedIds.length === displayDoctors.length), displayDoctors)}
                                    className="flex h-8 w-8 items-center justify-center rounded-button bg-muted/40 text-foreground/60 transition-all hover:text-foreground active:scale-[0.96]"
                                    aria-label={selectedIds.length === displayDoctors.length ? 'Deselect all staff' : 'Select all staff'}
                                >
                                    {selectedIds.length === displayDoctors.length
                                        ? <CheckCircle2 size={16} className="text-foreground" />
                                        : <Circle size={16} className="text-foreground/30" />}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        {displayDoctors.map((doctor) => {
                            const name = doctor.name || 'Unknown staff';
                            const specialty = doctor.specialization || 'General';
                            const facility = doctor.hospitals?.name || 'No facility';

                            return (
                                <MobileMetricRow
                                    key={doctor.id}
                                    icon={Stethoscope}
                                    color="hsl(199 89% 48%)"
                                    label="Staff member"
                                    value={name}
                                    secondary={`${specialty} · ${facility}`}
                                    statusPill={statusPill(getStatus(doctor))}
                                    onClick={() => setActiveDoctor(doctor)}
                                    itemId={doctor.id}
                                    isSelected={canSelect && selectedIds.includes(doctor.id)}
                                    onSelect={canSelect ? onSelect : undefined}
                                    selectionMode={selectionMode}
                                />
                            );
                        })}

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                            {showSkeleton && <MobileListSkeletonRows />}
                            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayDoctors.length > 0 && <MobileListEnd label="End of staff list" />}
                        </div>

                        {displayDoctors.length === 0 && !loading && (
                            <MobileListEmpty icon={Stethoscope} label="No staff found" labelTone="plain" />
                        )}
                    </div>
                </div>

                {activeDoctor && (() => {
                    const name = activeDoctor.name || 'Unknown staff';
                    const specialty = activeDoctor.specialization || 'General';
                    const facility = activeDoctor.hospitals?.name || 'No facility';
                    const phone = activeDoctor.phone || 'No phone';

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeDoctor}
                            onClose={() => setActiveDoctor(null)}
                            icon={Stethoscope}
                            iconTone="hsl(199 89% 48%)"
                            eyebrow="Staff member"
                            title={name}
                            statusPill={statusPill(getStatus(activeDoctor))}
                            islands={[
                                { icon: Stethoscope, label: 'Specialty', value: specialty },
                                { icon: Hospital, label: 'Facility', value: facility },
                                { icon: Phone, label: 'Contact', value: phone },
                                activeDoctor.email && { icon: Mail, label: 'Email', value: activeDoctor.email },
                                activeDoctor.license_number && { icon: BadgeCheck, label: 'License', value: activeDoctor.license_number },
                                { icon: Clock, label: 'Experience', value: activeDoctor.experience != null ? `${activeDoctor.experience} years` : 'Not set' },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveDoctor(null); onView?.(activeDoctor); } }}
                            secondary={canManage ? { icon: Edit, onClick: () => { setActiveDoctor(null); onEdit?.(activeDoctor); }, 'aria-label': `Edit ${name}` } : undefined}
                        >
                            {canManage && canDelete && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveDoctor(null); onDelete(activeDoctor); }}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform hover:bg-destructive/15 active:scale-[0.96]"
                                    aria-label={`Delete ${name}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete staff member
                                </button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
