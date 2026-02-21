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
    Search,
    SlidersHorizontal,
    Loader2,
    BarChart3
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';

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

    useEffect(() => {
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    // User-friendly KPIs with clear labels
    const userKPIs = [
        {
            id: 'all',
            label: 'Total Users',
            value: statistics?.totalUsers || users.length,
            color: 'hsl(var(--primary))'
        },
        {
            id: 'verified',
            label: 'Verified',
            value: statistics?.bvnVerifiedUsers || users.filter(u => u.bvn_verified).length,
            color: 'hsl(var(--success))'
        },
        {
            id: 'staff',
            label: 'Staff Members',
            value: (statistics?.roleDistribution?.admin || 0) + (statistics?.roleDistribution?.provider || 0) + (statistics?.roleDistribution?.org_admin || 0),
            color: 'hsl(var(--warning))'
        }
    ];

    const growthData = useMemo(() => [
        { value: 30 }, { value: 45 }, { value: 60 }, { value: 55 }, { value: 75 }, { value: 85 }
    ], []);

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
            <div className="flex flex-col min-h-screen no-scrollbar">
                {/* A. USER KPI STRIP */}
                <MobileKPIStrip
                    kpis={userKPIs}
                    activeKpi={filters.kpiFilter || 'all'}
                    onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                />

                <div className="px-2 pt-6 text-foreground">
                    {/* B. ACTIVE USERS */}
                    <MobileFeaturedMetric
                        label="Active Users"
                        value={users.filter(u => u.is_active !== false).length}
                        trend="+12%"
                        icon={Activity}
                        color="hsl(var(--success))"
                        chartData={growthData}
                    />

                    {/* C. NEW SIGNUPS */}
                    <section className="mb-6">
                        <MobileSectionHeader
                            label="New Signups"
                            count={statistics?.recentSignups}
                            color="hsl(var(--info))"
                        />
                        <div className="p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-info/5 flex items-center justify-center">
                                    <Activity className="text-info w-5 h-5 opacity-70" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-medium tracking-tight">Recent Signups</span>
                                    <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Last 30 days</span>
                                </div>
                            </div>
                            <span className="text-xl font-normal tracking-tighter">{statistics?.recentSignups || 0}</span>
                        </div>
                    </section>

                    {/* D. SEARCH & FILTER */}
                    <div className="flex items-center gap-2 mb-4 px-1">
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
                            onClick={() => onOpenFilters?.()}
                            className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-primary transition-colors border-0"
                        >
                            <SlidersHorizontal size={18} />
                        </motion.button>

                        {(isAdmin || isOrgAdmin) && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onViewAnalytics?.()}
                                className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-primary/60 active:text-primary transition-colors border-0 shadow-sm"
                            >
                                <BarChart3 size={18} />
                            </motion.button>
                        )}
                    </div>

                    {/* E. USER DIRECTORY */}
                    <MobileSectionHeader
                        label="User Directory"
                        count={users.length}
                        color="hsl(var(--primary))"
                        onSelectAll={users.length > 0 ? () => onSelectAll?.(users) : null}
                        isAllSelected={users.length > 0 && selectedIds.length === users.length}
                    />

                    <div className="space-y-1">
                        <AnimatePresence mode="popLayout">
                            {users.map((user) => (
                                <MobileMetricRow
                                    key={user.id}
                                    color={getRoleColor(user.role)}
                                    // Use Avatar instead of Icon in the MetricRow context
                                    icon={() => (
                                        <Avatar className="w-9 h-9 rounded-[12px] border-0">
                                            <AvatarImage src={user.imageuri || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.profile_username}`} />
                                            <AvatarFallback className="bg-muted text-[10px] font-medium">
                                                {(user.username || user.profile_username)?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    label={user.role?.replace('_', ' ').toUpperCase() || 'PATIENT'}
                                    value={user.full_name || user.username || 'Unknown User'}
                                    trend={user.bvn_verified ? 'Verified' : 'Not Verified'}
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
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                                    onClick={() => onView(user)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                                    onClick={() => onEdit(user)}
                                                >
                                                    <Edit size={16} className="text-warning/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-transform"
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
                        <div ref={observerTarget} className="h-20 flex items-center justify-center">
                            {hasMore && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.3, 1, 0.3],
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    delay: i * 0.2,
                                                }}
                                                className="w-1.5 h-1.5 rounded-full bg-primary/40"
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">Loading more users</span>
                                </div>
                            )}
                            {!hasMore && users.length > 0 && (
                                <p className="text-[8px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-20 py-8">End of user list</p>
                            )}
                        </div>

                        {users.length === 0 && !loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 text-center"
                            >
                                <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/10" />
                                <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-30">No users found</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
};
