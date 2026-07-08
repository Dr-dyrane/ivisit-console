import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Users, Plus, BarChart3, Shield, UserCheck, Stethoscope } from 'lucide-react';
import { getProfiles } from '../../services/profilesService';

export const UsersPanel = ({
  users = [],
  statistics,
  filters,
  recentUsers: recentUsersProp = [],
  fetchRecentActivity = true,
  onViewUser,
  onCreateUser,
  onInviteUser,
  onViewAnalytics
}) => {
  const [recentUsers, setRecentUsers] = useState(recentUsersProp);

  useEffect(() => {
    setRecentUsers(recentUsersProp);
  }, [recentUsersProp]);

  useEffect(() => {
    if (!fetchRecentActivity) return undefined;

    // Fetch recent activity globally
    const fetchRecent = async () => {
      try {
        const data = await getProfiles({
          sortBy: 'last_sign_in_at',
          limit: 5,
          includeAuthData: true
        });
        setRecentUsers(data);
      } catch (error) {
        console.error("Failed to fetch recent activity", error);
      }
    };
    fetchRecent();
  }, [fetchRecentActivity]); // Run once on mount when this panel owns the read.

  const adminCount = users.filter(u => ['admin', 'org_admin'].includes(u.role)).length;
  const providerCount = users.filter(u => u.role === 'provider').length;
  const patientCount = users.filter(u => u.role === 'patient').length;
  const verifiedCount = users.filter(u => u.bvn_verified).length;

  // Safely access filters if available
  const currentFilters = filters || {};

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground ml-1">Live Statistics</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-4 bg-muted rounded-card flex flex-col gap-1 group">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-muted-foreground">Total</span>
            </div>
            <div className="text-xl font-bold">{statistics?.totalUsers || users.length}</div>
          </div>

          <div className="p-4 bg-emerald-500/10 rounded-card flex flex-col gap-1 group">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-200 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-emerald-700/70 dark:text-emerald-200/70">Verified</span>
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">
              {statistics?.bvnVerifiedUsers || verifiedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="space-y-1.5">
        <h3 className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground ml-1">Roles</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between p-3 rounded-inner bg-amber-500/10 transition-colors hover:bg-amber-500/15">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-700 dark:text-amber-200" />
              <span className="text-xs font-medium">Admins</span>
            </div>
            <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-200">
              {(statistics ? ((statistics.roleDistribution?.admin || 0) + (statistics.roleDistribution?.org_admin || 0)) : adminCount)}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-inner bg-emerald-500/10 transition-colors hover:bg-emerald-500/15">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
              <span className="text-xs font-medium">Providers</span>
            </div>
            <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
              {statistics?.roleDistribution?.provider || providerCount}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-inner bg-sky-500/10 transition-colors hover:bg-sky-500/15">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-600 dark:text-sky-200" />
              <span className="text-xs font-medium">Patients</span>
            </div>
            <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-200">
              {statistics?.roleDistribution?.patient || patientCount}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onInviteUser}
          className="h-12 rounded-button bg-muted dark:bg-white/5 hover:bg-muted/70 flex items-center justify-center gap-2 group shadow-none"
          variant="ghost"
        >
          <Plus className="h-4 w-4 text-foreground group-hover:rotate-90 transition-transform" />
          <span className="text-[10px] font-bold text-foreground">Invite</span>
        </Button>
        <Button
          onClick={onViewAnalytics}
          className="h-12 rounded-button bg-muted dark:bg-white/5 hover:bg-muted/70 flex items-center justify-center gap-2 group shadow-none"
          variant="ghost"
        >
          <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-200 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-200">Data</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground ml-1">Recent logins</h3>
        <div className="space-y-1">
          {recentUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-white/5 rounded-card">
              No recent activity
            </p>
          ) : (
            recentUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onViewUser(user)}
                className="flex items-center justify-between p-2 rounded-inner bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-icon bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {(user.username || user.profile_username || 'U')?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs font-bold truncate">{user.username || user.profile_username || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] font-bold text-muted-foreground">Sign In</p>
                  <p className="text-[10px] whitespace-nowrap">{new Date(user.last_sign_in_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verification Overview */}
      {statistics && (
        <div className="space-y-2">
          <h3 className="font-bold text-[10px] tracking-[0.2em] text-muted-foreground ml-1">Trust Score</h3>
          <div className="p-4 bg-emerald-500/10 rounded-card flex items-center justify-around">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-200">
                {Math.round((verifiedCount / users.length) * 100)}%
              </div>
              <p className="text-[8px] text-muted-foreground">Verified</p>
            </div>
            <div className="h-8 w-1 rounded-pill bg-foreground/10" />
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {users.length - verifiedCount}
              </div>
              <p className="text-[8px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
