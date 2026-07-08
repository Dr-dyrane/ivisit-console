import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserCheck,
    Shield,
    ShieldCheck,
    Phone,
    Mail,
    Building,
    User,
    Eye,
    Edit,
    Trash2,
    Activity,
    Search,
    SlidersHorizontal,
    Loader2,
    BarChart3,
    BadgeCheck
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { MobileDetailIslands } from './MobileDetailIslands';
import { MobileSheetActions } from './MobileSheetActions';
import { statusPill } from '../../constants/vitalTracks';
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

// Users is a directory (no modelled lifecycle): role is a categorical facet, so it
// rides the row secondary line rather than a status axis.
const roleLabel = (role) => {
    const text = String(role || 'patient').replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
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
                        {displayUsers.map((user) => {
                            const isActive = user.is_active !== false;
                            const isVerified = Boolean(user.bvn_verified);
                            return (
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
                                label="User"
                                value={user.full_name || user.username || 'Unknown User'}
                                // S2: role rides the secondary identity line (directory, not a lifecycle).
                                secondary={user.organization_name ? `${roleLabel(user.role)} · ${user.organization_name}` : roleLabel(user.role)}
                                // S3: the primary axis is the active/inactive state pill (Users has no
                                // modelled lifecycle, so this uses the generic keyword statusPill).
                                statusPill={statusPill(isActive ? 'active' : 'inactive')}
                                // KYC is a secondary axis, surfaced as a small verified marker only
                                // (never the main pill). Unverified shows nothing on the row.
                                statusIndicators={isVerified ? [{ icon: ShieldCheck, color: 'hsl(160 84% 39%)', label: 'KYC verified' }] : []}
                                isExpanded={expandedUserId === user.id}
                                onExpand={(id) => setExpandedUserId(prev => prev === id ? null : id)}
                                itemId={user.id}
                                isSelected={selectedIds.includes(user.id)}
                                onSelect={onSelect}
                                selectionMode={selectionMode}
                                expandedContent={
                                    <div className="space-y-3 py-3">
                                        {/* S6: identity-island detail (email, phone, org, role, KYC). */}
                                        <MobileDetailIslands
                                            items={[
                                                { icon: Mail, label: 'Email', value: user.email || 'No email' },
                                                { icon: Phone, label: 'Phone', value: user.phone || 'No phone' },
                                                { icon: Building, label: 'Organization', value: user.organization_name || 'No organization' },
                                                { icon: Shield, label: 'Role', value: roleLabel(user.role) },
                                                { icon: isVerified ? ShieldCheck : Shield, label: 'KYC', value: isVerified ? 'Verified' : 'Pending' },
                                            ]}
                                        />

                                        {/* S7: one primary state-CTA (Details, filled) + gated ghost Edit. */}
                                        <MobileSheetActions
                                            primary={{ label: 'Details', icon: Eye, onClick: () => onView(user) }}
                                            secondary={(isAdmin || isOrgAdmin) ? { icon: Edit, onClick: () => onEdit(user), 'aria-label': `Edit ${user.full_name || user.username || 'user'}` } : undefined}
                                        />

                                        {/* Delete is a demoted destructive control BELOW the CTA group. */}
                                        {canDelete && isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(user)}
                                                className="flex w-full items-center justify-center gap-2 rounded-button py-2.5 text-xs font-semibold text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete user
                                            </button>
                                        )}
                                    </div>
                                }
                            />
                            );
                        })}
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
