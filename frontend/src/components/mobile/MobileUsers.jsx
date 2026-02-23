import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserCheck,
    Shield,
    Phone,
    Mail,
    Building,
    User,
    Eye,
    Edit,
    Trash2,
    Activity,
    Zap,
    ZapOff,
    Search,
    SlidersHorizontal,
    Loader2,
    BarChart3,
    BadgeCheck,
    BadgeX
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

/**
 * MobileUsers
 * User Management interface with clean, accessible design
 * Features: Infinite scroll, user-friendly terminology, Apple-level UI
 */
export const MobileUsers = ({
    users,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    // 1. Infinite scroll setup with Intersection Observer
    const observerTarget = useRef(null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const selectionMode = selectedIds.length > 0;
    const { triggerFromEvent } = useFeedback();

    const formatSignedPercent = (value) => {
        if (!Number.isFinite(value)) return null;
        const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
        return `${value > 0 ? '+' : ''}${rounded}%`;
    };

    const calcDeltaPercent = (current, previous) => {
        const c = Number(current);
        const p = Number(previous);
        if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
        return ((c - p) / Math.abs(p)) * 100;
    };

    const toDeltaBadge = (value) => ({
        delta: formatSignedPercent(value) || 'LIVE',
        direction: Number.isFinite(value) ? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat') : 'flat'
    });

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

    const totalUsers = Number(statistics?.totalUsers) || users.length;
    const verifiedUsersCount = Number(statistics?.bvnVerifiedUsers) || users.filter(u => u.bvn_verified).length;
    const staffMembers = (statistics?.roleDistribution?.admin || 0) + (statistics?.roleDistribution?.provider || 0) + (statistics?.roleDistribution?.org_admin || 0);
    const activeUsers = users.filter(u => u.is_active !== false).length;

    const totalTrend = toDeltaBadge(calcDeltaPercent(totalUsers, statistics?.previous?.totalUsers ?? statistics?.previousTotalUsers));
    const verifiedTrend = toDeltaBadge(calcDeltaPercent(verifiedUsersCount, statistics?.previous?.bvnVerifiedUsers ?? statistics?.previousBvnVerifiedUsers));
    const staffTrend = toDeltaBadge(calcDeltaPercent(staffMembers, statistics?.previous?.staffMembers ?? statistics?.previousStaffMembers));
    const activeTrend = toDeltaBadge(calcDeltaPercent(activeUsers, statistics?.previous?.activeUsers ?? statistics?.previousActiveUsers));

    // User-friendly KPIs with clear labels and tiny live deltas
    const userKPIs = [
        {
            id: 'all',
            label: 'Total Users',
            value: totalUsers,
            color: 'hsl(var(--primary))',
            delta: totalTrend.delta,
            direction: totalTrend.direction
        },
        {
            id: 'verified',
            label: 'Verified',
            value: verifiedUsersCount,
            color: 'hsl(var(--success))',
            delta: verifiedTrend.delta,
            direction: verifiedTrend.direction
        },
        {
            id: 'staff',
            label: 'Staff',
            value: staffMembers,
            color: 'hsl(var(--warning))',
            delta: staffTrend.delta,
            direction: staffTrend.direction
        },
        ...((isAdmin || isOrgAdmin) ? [{
            id: 'active',
            label: 'Active',
            value: activeUsers,
            color: 'hsl(var(--spark))',
            delta: activeTrend.delta,
            direction: activeTrend.direction
        }] : [])
    ];

    const growthData = useMemo(() => [
        { value: 30 }, { value: 45 }, { value: 60 }, { value: 55 }, { value: 75 }, { value: 85 }
    ], []);

    const verifiedUsers = users.filter(u => u.bvn_verified).length;
    const verificationRate = users.length ? (verifiedUsers / users.length) * 100 : 0;
    const { displayItems: displayUsers, isBuffering } = useStableList(users, loading);

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'hsl(var(--warning))';
            case 'org_admin': return 'hsl(var(--warning))';
            case 'provider': return 'hsl(var(--info))';
            default: return 'hsl(var(--primary))';
        }
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
                        kpis={userKPIs}
                        activeKpi={filters.kpiFilter || 'all'}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                {/* B. ACTIVE USERS */}
                <MobileFeaturedMetric
                    items={[
                        {
                            label: 'Active Users',
                            value: activeUsers,
                            trend: formatSignedPercent(verificationRate - 50) || 'LIVE',
                            icon: Activity,
                            color: 'hsl(var(--success))',
                            chartData: growthData
                        },
                        {
                            label: 'Total Users',
                            value: totalUsers,
                            trend: totalTrend.delta,
                            icon: Users,
                            color: 'hsl(var(--primary))',
                            chartData: growthData
                        },
                        {
                            label: 'Verified',
                            value: verifiedUsersCount,
                            trend: verifiedTrend.delta,
                            icon: BadgeCheck,
                            color: 'hsl(var(--info))',
                            chartData: growthData
                        },
                        {
                            label: 'Staff',
                            value: staffMembers,
                            trend: staffTrend.delta,
                            icon: Shield,
                            color: 'hsl(var(--warning))',
                            chartData: growthData
                        }
                    ]}
                />

                {/* C. USER VELOCITY */}
                <section className="mb-3">
                    <MobileSectionHeader
                        label="User Velocity"
                        count={statistics?.recentSignups}
                        color="hsl(var(--info))"
                    />
                    <MobileSecondaryMetricRail
                        variant="icon"
                        items={[
                            {
                                icon: Activity,
                                title: 'Recent Signups',
                                subtitle: 'Last 30 days',
                                value: statistics?.recentSignups || 0,
                                color: 'hsl(var(--info))',
                                iconColorClass: 'text-info',
                                iconBgClass: 'bg-info/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeCheck,
                                title: 'Verification',
                                subtitle: 'Current ratio',
                                value: `${Math.round(verificationRate)}%`,
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Users,
                                title: 'Total Users',
                                subtitle: 'Registered',
                                value: totalUsers,
                                color: 'hsl(var(--primary))',
                                iconColorClass: 'text-primary',
                                iconBgClass: 'bg-primary/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Shield,
                                title: 'Staff',
                                subtitle: 'Admins/providers',
                                value: staffMembers,
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5',
                                onClick: onViewAnalytics
                            }
                        ]}
                    />
                </section>

                {/* D. SEARCH & FILTER */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex-1 relative group">
                        <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={filters.search || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] font-normal placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(event) => {
                            onOpenFilters?.();
                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                        }}
                        className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0"
                    >
                        <SlidersHorizontal size={18} />
                    </motion.button>

                    {(isAdmin || isOrgAdmin) && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(event) => {
                                onViewAnalytics?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
                            }}
                            className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0 shadow-sm"
                        >
                            <BarChart3 size={18} />
                        </motion.button>
                    )}
                </div>

                {/* E. USER DIRECTORY */}
                <MobileSectionHeader
                    label="User Directory"
                    count={displayUsers.length}
                    color="hsl(var(--primary))"
                    selectionMode={selectionMode}
                    selectedCount={selectedIds.length}
                    onSelectAll={displayUsers.length > 0 ? () => onSelectAll?.(displayUsers) : null}
                    isAllSelected={displayUsers.length > 0 && selectedIds.length === displayUsers.length}
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {displayUsers.map((user) => (
                            <MobileMetricRow
                                key={user.id}
                                color={getRoleColor(user.role)}
                                // Use Avatar instead of Icon in the MetricRow context
                                icon={() => (
                                    <Avatar className="w-9 h-9 rounded-[12px] border-0">
                                        <AvatarImage
                                            src={getAvatarUrl(user)}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-muted text-[10px] font-medium">
                                            {getAvatarFallback(user)}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                label={user.role?.replace('_', ' ').toUpperCase() || 'PATIENT'}
                                value={user.full_name || user.username || 'Unknown User'}
                                rightBlade={{
                                    badge: user.bvn_verified ? 'KYC' : 'PENDING',
                                    direction: user.bvn_verified ? 'up' : 'down',
                                    label: user.is_active !== false ? 'Active' : 'Inactive',
                                    value: (user.role || 'user').replace('_', ' ').toUpperCase(),
                                    color: user.bvn_verified ? 'hsl(var(--success))' : 'hsl(var(--warning))'
                                }}
                                statusIndicators={[
                                    {
                                        icon: user.bvn_verified ? BadgeCheck : BadgeX,
                                        color: user.bvn_verified ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.4)',
                                        label: user.bvn_verified ? 'Verified' : 'Unverified'
                                    },
                                    {
                                        icon: user.is_active !== false ? Zap : ZapOff,
                                        color: user.is_active !== false ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.4)',
                                        label: user.is_active !== false ? 'Active' : 'Inactive'
                                    }
                                ]}
                                isExpanded={expandedUserId === user.id}
                                onExpand={(id) => setExpandedUserId(prev => prev === id ? null : id)}
                                itemId={user.id}
                                isSelected={selectedIds.includes(user.id)}
                                onSelect={onSelect}
                                selectionMode={selectionMode}
                                expandedContent={
                                    <div className="space-y-4 py-3">
                                        {/* Contact Info */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                <Mail size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal truncate opacity-80">{user.email || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                <Phone size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal opacity-80">{user.phone || 'No phone'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                <Building size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal truncate opacity-80">{user.organization_name || 'No organization'}</span>
                                            </div>
                                        </div>

                                        {/* Status Indicators */}
                                        <div className="flex gap-2">
                                            <Badge className={`squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 ${user.bvn_verified ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'
                                                }`}>
                                                {user.bvn_verified ? 'VERIFIED' : 'NOT VERIFIED'}
                                            </Badge>
                                            {user.is_active !== false && (
                                                <Badge className="squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 bg-info/20 text-info">
                                                    ACTIVE
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                onClick={() => onView(user)}
                                            >
                                                <Eye size={16} className="text-primary/60" />
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                onClick={() => onEdit(user)}
                                            >
                                                <Edit size={16} className="text-warning/60" />
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                    onClick={() => onDelete(user)}
                                                >
                                                    <Trash2 size={16} className="text-destructive/60" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </AnimatePresence>

                    {/* Infinite Scroll Sentinel */}
                    <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
                        {loading && <MobileListSkeletonRows />}
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
                        {!loading && !hasMore && displayUsers.length > 0 && (
                            <MobileListEnd label="End of user list" />
                        )}
                    </div>

                    {displayUsers.length === 0 && !loading && (
                        <MobileListEmpty icon={Users} label="No users found" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};


