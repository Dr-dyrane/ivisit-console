import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Edit,
    Eye,
    Filter,
    Hospital,
    Phone,
    Search,
    Stethoscope,
    UserRound,
    Users
} from 'lucide-react';
import { Button } from '../ui/button';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

const mobileStaffFilters = [
    {
        id: 'all',
        label: 'Staff',
        icon: Users,
        activeClass: 'bg-sky-400/12 text-sky-300 shadow-[0_18px_54px_rgba(14,165,233,0.16)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'available',
        label: 'Available',
        icon: CheckCircle2,
        activeClass: 'bg-emerald-400/12 text-emerald-300 shadow-[0_18px_54px_rgba(16,185,129,0.14)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'on_call',
        label: 'On call',
        icon: Phone,
        activeClass: 'bg-sky-400/12 text-sky-300 shadow-[0_18px_54px_rgba(14,165,233,0.14)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
    {
        id: 'busy',
        label: 'Busy',
        icon: Clock,
        activeClass: 'bg-amber-400/12 text-amber-300 shadow-[0_18px_54px_rgba(245,158,11,0.14)]',
        restClass: 'bg-muted/28 text-muted-foreground',
    },
];

const statusMeta = {
    available: {
        label: 'Available',
        className: 'bg-emerald-400/12 text-emerald-300',
        icon: CheckCircle2,
    },
    on_call: {
        label: 'On call',
        className: 'bg-sky-400/12 text-sky-300',
        icon: Phone,
    },
    busy: {
        label: 'Busy',
        className: 'bg-amber-400/12 text-amber-300',
        icon: Clock,
    },
    off_duty: {
        label: 'Away',
        className: 'bg-muted/34 text-muted-foreground',
        icon: UserRound,
    },
};

const getStatus = (doctor) => String(doctor?.status || 'available').toLowerCase();

const getStatusMeta = (doctor) => statusMeta[getStatus(doctor)] || statusMeta.available;

const getInitials = (name = 'Staff') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || 'S'}${parts[1]?.[0] || ''}`.toUpperCase();
};

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
    onRefresh,
    isAdmin,
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    canManage: canManageOverride
}) => {
    const observerTarget = useRef(null);
    const [expandedDoctorId, setExpandedDoctorId] = useState(null);
    const canManage = Boolean(canManageOverride ?? (isAdmin || isOrgAdmin));
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
                            whileTap={{ scale: 0.95 }}
                            onClick={(event) => {
                                onOpenFilters?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'rgb(125 211 252)', haptic: true, sound: true });
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-button bg-muted/28 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300"
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
                        </div>
                    </div>

                    <div className="space-y-2">
                        {displayDoctors.map((doctor) => (
                            <MobileStaffRow
                                key={doctor.id}
                                doctor={doctor}
                                expanded={expandedDoctorId === doctor.id}
                                setExpandedDoctorId={setExpandedDoctorId}
                                onView={onView}
                                onEdit={onEdit}
                                canManage={canManage}
                            />
                        ))}

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                            {showSkeleton && <MobileListSkeletonRows />}
                            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
                            {!loading && !hasMore && displayDoctors.length > 0 && <MobileListEnd label="End of staff list" />}
                        </div>

                        {displayDoctors.length === 0 && !loading && (
                            <MobileListEmpty icon={Stethoscope} label="No staff found" />
                        )}
                    </div>
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};

const MobileStaffRow = ({
    doctor,
    expanded,
    setExpandedDoctorId,
    onView,
    onEdit,
    canManage,
}) => {
    const status = getStatusMeta(doctor);
    const StatusIcon = status.icon;
    const name = doctor.name || 'Unknown staff';
    const facility = doctor.hospitals?.name || 'No facility';
    const phone = doctor.phone || 'No phone';

    return (
        <motion.div
            layout
            className={`overflow-hidden rounded-card bg-muted/22 shadow-sm transition-all ${expanded ? 'bg-muted/34 shadow-[0_20px_60px_rgba(0,0,0,0.18)]' : ''}`}
        >
            <button
                type="button"
                onClick={() => setExpandedDoctorId(expanded ? null : doctor.id)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="flex w-full items-start gap-3 p-4 text-left transition-transform duration-100 active:scale-[0.98]"
                aria-label={`${expanded ? 'Close' : 'Open'} ${name}`}
                aria-expanded={expanded}
            >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-sky-400/12 text-sm font-semibold text-sky-300">
                    {getInitials(name)}
                </span>
                {/* Readable identity: name is the primary line (2-line clamp, never a stub). See canon §2.1. */}
                <span className="min-w-0 flex-1">
                    <span className="text-[15px] font-semibold leading-tight text-foreground line-clamp-2 break-words">{name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{doctor.specialization || 'General'}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2 pl-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-semibold ${status.className}`}>
                        <StatusIcon size={12} />
                        {status.label}
                    </span>
                    {expanded ? (
                        <ChevronDown size={18} className="text-muted-foreground" />
                    ) : (
                        <ChevronRight size={18} className="text-muted-foreground" />
                    )}
                </span>
            </button>

            {expanded && (
                <div className="space-y-3 px-4 pb-4">
                    <MobileStaffDetail icon={Hospital} label="Facility" value={facility} />
                    <MobileStaffDetail icon={Phone} label="Contact" value={phone} />
                    <MobileStaffDetail icon={Clock} label="Experience" value={doctor.experience != null ? `${doctor.experience} years` : 'Not set'} />

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                            variant="ghost"
                            className="h-12 rounded-button bg-background/36 font-semibold transition-all hover:bg-foreground hover:text-background active:scale-95"
                            onClick={() => onView(doctor)}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                        </Button>
                        {canManage ? (
                            <Button
                                variant="ghost"
                                className="h-12 rounded-button bg-sky-400/12 font-semibold text-sky-300 transition-all hover:bg-sky-400/18 active:scale-95"
                                onClick={() => onEdit(doctor)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                className="h-12 rounded-button bg-muted/28 font-semibold text-muted-foreground transition-all hover:bg-muted/38 active:scale-95"
                                onClick={() => onView(doctor)}
                            >
                                <UserRound className="mr-2 h-4 w-4" />
                                Profile
                            </Button>
                        )}
                    </div>

                </div>
            )}
        </motion.div>
    );
};

const MobileStaffDetail = ({ icon: Icon, label, value }) => (
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
