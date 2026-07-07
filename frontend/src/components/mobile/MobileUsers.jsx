import React, { useEffect, useRef, useState } from 'react';
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
import { calcDeltaPercent, formatSignedPercent } from '../../utils/metricsUtils';

const toFiniteNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const toOptionalDeltaBadge = (value) => {
    const delta = formatSignedPercent(value);
    return {
        delta,
        direction: Number.isFinite(value)
            ? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat')
            : 'flat',
    };
};

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
    onSelectAll,
    canDelete = false
}) => {
    // 1. Infinite scroll setup with Intersection Observer
    const observerTarget = useRef(null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const selectionMode = selectedIds.length > 0;
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

    const roleDistribution = statistics?.roleDistribution || {};
    const visibleUsersCount = users.length;
    const visibleVerifiedUsersCount = users.filter(u => u.bvn_verified).length;
    const visibleStaffMembers = users.filter(u => ['admin', 'org_admin', 'provider'].includes(u.role)).length;
    const visibleActiveUsersCount = users.filter(u => u.is_active !== false).length;
    const measuredTotalUsers = toFiniteNumber(statistics?.totalUsers);
    const measuredVerifiedUsers = toFiniteNumber(statistics?.bvnVerifiedUsers);
    const measuredActiveUsers = toFiniteNumber(statistics?.activeUsers ?? statistics?.activeUsersCount);
    const hasMeasuredRoleDistribution = Object.keys(roleDistribution).length > 0;
    const hasMeasuredStatistics = Boolean(statistics && (
        measuredTotalUsers !== null ||
        measuredVerifiedUsers !== null ||
        measuredActiveUsers !== null ||
        hasMeasuredRoleDistribution ||
        toFiniteNumber(statistics?.recentSignups) !== null
    ));

    const totalUsers = measuredTotalUsers ?? visibleUsersCount;
    const verifiedUsersCount = measuredVerifiedUsers ?? visibleVerifiedUsersCount;
    const staffMembers = hasMeasuredRoleDistribution
        ? (toFiniteNumber(roleDistribution.admin) || 0) + (toFiniteNumber(roleDistribution.provider) || 0) + (toFiniteNumber(roleDistribution.org_admin) || 0)
        : visibleStaffMembers;
    const activeUsers = measuredActiveUsers ?? visibleActiveUsersCount;
    const recentSignups = toFiniteNumber(statistics?.recentSignups);
    const scopeLabel = hasMeasuredStatistics ? 'Measured source' : 'Loaded rows';

    const totalTrend = toOptionalDeltaBadge(calcDeltaPercent(measuredTotalUsers, statistics?.previous?.totalUsers ?? statistics?.previousTotalUsers));
    const verifiedTrend = toOptionalDeltaBadge(calcDeltaPercent(measuredVerifiedUsers, statistics?.previous?.bvnVerifiedUsers ?? statistics?.previousBvnVerifiedUsers));
    const staffTrend = toOptionalDeltaBadge(calcDeltaPercent(hasMeasuredRoleDistribution ? staffMembers : null, statistics?.previous?.staffMembers ?? statistics?.previousStaffMembers));
    const activeTrend = toOptionalDeltaBadge(calcDeltaPercent(measuredActiveUsers, statistics?.previous?.activeUsers ?? statistics?.previousActiveUsers));

    // User-friendly KPIs with clear labels and tiny live deltas
    const userKPIs = [
        {
            id: 'all',
            label: hasMeasuredStatistics ? 'Total Users' : 'Visible Users',
            value: totalUsers,
            color: 'hsl(var(--foreground))',
            delta: totalTrend.delta,
            direction: totalTrend.direction
        },
        {
            id: 'verified',
            label: 'Verified',
            value: verifiedUsersCount,
            color: 'hsl(160 84% 39%)',
            delta: verifiedTrend.delta,
            direction: verifiedTrend.direction
        },
        {
            id: 'staff',
            label: 'Staff',
            value: staffMembers,
            color: 'hsl(38 92% 50%)',
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

    const verificationRate = totalUsers ? (verifiedUsersCount / totalUsers) * 100 : 0;
    const { displayItems: displayUsers, isBuffering } = useStableList(users, loading);
    const showInitialScaffoldLoading = loading && displayUsers.length === 0;

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'hsl(38 92% 50%)';
            case 'org_admin': return 'hsl(38 92% 50%)';
            case 'provider': return 'hsl(199 89% 48%)';
            default: return 'hsl(var(--foreground))';
        }
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <div>
                        <MobileKPIStrip
                            loading={showInitialScaffoldLoading}
                            kpis={userKPIs}
                            activeKpi={filters.kpiFilter || 'all'}
                            onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                        />
                    </div>
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                {/* B. ACTIVE USERS */}
                <div>
                    <MobileFeaturedMetric
                        loading={showInitialScaffoldLoading}
                        items={[
                            {
                                label: hasMeasuredStatistics ? 'Active Users' : 'Visible Active',
                                value: activeUsers,
                                trend: activeTrend.delta,
                                icon: Activity,
                                color: 'hsl(160 84% 39%)'
                            },
                            {
                                label: hasMeasuredStatistics ? 'Total Users' : 'Visible Users',
                                value: totalUsers,
                                trend: totalTrend.delta,
                                icon: Users,
                                color: 'hsl(var(--foreground))'
                            },
                            {
                                label: 'Verified',
                                value: verifiedUsersCount,
                                trend: verifiedTrend.delta,
                                icon: BadgeCheck,
                                color: 'hsl(199 89% 48%)'
                            },
                            {
                                label: 'Staff',
                                value: staffMembers,
                                trend: staffTrend.delta,
                                icon: Shield,
                                color: 'hsl(38 92% 50%)'
                            }
                        ]}
                    />
                </div>

                {/* C. USER VELOCITY */}
                <section className="mb-3">
                    {!showInitialScaffoldLoading && (
                        <MobileSectionHeader
                            label="User Summary"
                            count={recentSignups}
                            color="hsl(199 89% 48%)"
                        />
                    )}
                    <MobileSecondaryMetricRail
                        loading={showInitialScaffoldLoading}
                        loadingCount={2}
                        variant="icon"
                        items={[
                            {
                                icon: Activity,
                                title: 'Recent Signups',
                                subtitle: hasMeasuredStatistics ? 'Last 30 days' : 'Source pending',
                                value: recentSignups ?? 'Pending',
                                color: 'hsl(199 89% 48%)',
                                iconColorClass: 'text-sky-600 dark:text-sky-200',
                                iconBgClass: 'bg-sky-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeCheck,
                                title: hasMeasuredStatistics ? 'Verification' : 'Visible Verification',
                                subtitle: scopeLabel,
                                value: `${Math.round(verificationRate)}%`,
                                color: 'hsl(160 84% 39%)',
                                iconColorClass: 'text-emerald-700 dark:text-emerald-200',
                                iconBgClass: 'bg-emerald-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Users,
                                title: hasMeasuredStatistics ? 'Total Users' : 'Visible Users',
                                subtitle: scopeLabel,
                                value: totalUsers,
                                color: 'hsl(var(--foreground))',
                                iconColorClass: 'text-muted-foreground',
                                iconBgClass: 'bg-muted',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Shield,
                                title: 'Staff',
                                subtitle: scopeLabel,
                                value: staffMembers,
                                color: 'hsl(38 92% 50%)',
                                iconColorClass: 'text-amber-700 dark:text-amber-200',
                                iconBgClass: 'bg-amber-500/10',
                                onClick: onViewAnalytics
                            }
                        ]}
                    />
                </section>

                {/* D. SEARCH & FILTER */}
                <div className="mb-3">
                    {showInitialScaffoldLoading ? (
                        <div className="flex items-center gap-2 px-1">
                            <div className="h-11 flex-1 rounded-button bg-muted/20" />
                            <div className="w-11 h-11 rounded-button bg-muted/20 shrink-0" />
                            {(isAdmin || isOrgAdmin) && <div className="w-11 h-11 rounded-button bg-muted/20 shrink-0" />}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 relative group">
                            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full h-11 pl-10 pr-4 rounded-button apple-glass-heavy text-[12px] font-normal placeholder:text-muted-foreground/30 focus-visible:shadow-[0_0_0_3px_hsl(var(--foreground)/0.16)] transition-all"
                            />
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(event) => {
                                onOpenFilters?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                            }}
                            className="w-11 h-11 rounded-button apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-out"
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
                                className="w-11 h-11 rounded-button apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-out shadow-sm"
                            >
                                <BarChart3 size={18} />
                            </motion.button>
                        )}
                        </div>
                    )}
                </div>

                {/* E. USER DIRECTORY */}
                <MobileSectionHeader
                    label="User Directory"
                    count={displayUsers.length}
                    color="hsl(var(--foreground))"
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
                                    <Avatar className="w-9 h-9 rounded-icon">
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
                                    color: user.bvn_verified ? 'hsl(160 84% 39%)' : 'hsl(38 92% 50%)'
                                }}
                                statusIndicators={[
                                    {
                                        icon: user.bvn_verified ? BadgeCheck : BadgeX,
                                        color: user.bvn_verified ? 'hsl(160 84% 39%)' : 'hsl(var(--muted-foreground)/0.4)',
                                        label: user.bvn_verified ? 'Verified' : 'Unverified'
                                    },
                                    {
                                        icon: user.is_active !== false ? Zap : ZapOff,
                                        color: user.is_active !== false ? 'hsl(160 84% 39%)' : 'hsl(var(--muted-foreground)/0.4)',
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
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                                                <Mail size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal truncate opacity-80">{user.email || 'No email'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                                                <Phone size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal opacity-80">{user.phone || 'No phone'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                                                <Building size={14} className="text-muted-foreground/40" />
                                                <span className="text-xs font-normal truncate opacity-80">{user.organization_name || 'No organization'}</span>
                                            </div>
                                        </div>

                                        {/* Status Indicators */}
                                        <div className="flex gap-2">
                                            <Badge className={`rounded-pill font-semibold tracking-tight text-[9px] py-1 px-3 ${user.bvn_verified ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'bg-muted/20 text-muted-foreground'
                                                }`}>
                                                {user.bvn_verified ? 'VERIFIED' : 'NOT VERIFIED'}
                                            </Badge>
                                            {user.is_active !== false && (
                                                <Badge className="rounded-pill font-semibold tracking-tight text-[9px] py-1 px-3 bg-sky-500/15 text-sky-700 dark:text-sky-200">
                                                    ACTIVE
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-button apple-glass flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                onClick={() => onView(user)}
                                            >
                                                <Eye size={16} className="text-muted-foreground" />
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-button apple-glass flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                onClick={() => onEdit(user)}
                                            >
                                                <Edit size={16} className="text-amber-700 dark:text-amber-200" />
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                            </Button>
                                            {canDelete && isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    className="w-12 h-12 rounded-button apple-glass flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-out hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
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
