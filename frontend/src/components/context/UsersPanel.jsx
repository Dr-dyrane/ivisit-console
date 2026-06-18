import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, Plus, BarChart3, Shield, UserCheck, Activity, TrendingUp, Eye, Stethoscope } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfiles } from '../../services/profilesService';

export const UsersPanel = ({ users, statistics, filters, onViewUser, onCreateUser, onInviteUser, onViewAnalytics }) => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
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
  }, []); // Run once on mount

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
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Live Statistics</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-4 bg-primary/5 rounded-3xl flex flex-col gap-1 group">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total</span>
            </div>
            <div className="text-xl font-bold tracking-tighter">{statistics?.totalUsers || users.length}</div>
          </div>

          <div className="p-4 bg-success/5 rounded-3xl flex flex-col gap-1 group">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-success group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-success/60">Verified</span>
            </div>
            <div className="text-xl font-bold tracking-tighter text-success">
              {statistics?.bvnVerifiedUsers || verifiedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="space-y-1.5">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Roles</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-warning/5 transition-colors hover:bg-warning/10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium">Admins</span>
            </div>
            <Badge className="bg-warning/20 text-warning border-0 rounded-full text-[10px] font-bold">
              {(statistics ? ((statistics.roleDistribution?.admin || 0) + (statistics.roleDistribution?.org_admin || 0)) : adminCount)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-success/5 transition-colors hover:bg-success/10">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-success" />
              <span className="text-xs font-medium">Providers</span>
            </div>
            <Badge className="bg-success/20 text-success border-0 rounded-full text-[10px] font-bold">
              {statistics?.roleDistribution?.provider || providerCount}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-info/5 transition-colors hover:bg-info/10">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-info" />
              <span className="text-xs font-medium">Patients</span>
            </div>
            <Badge className="bg-info/20 text-info border-0 rounded-full text-[10px] font-bold">
              {statistics?.roleDistribution?.patient || patientCount}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onInviteUser}
          className="h-12 rounded-3xl bg-secondary/30 dark:bg-white/5 border-0 hover:bg-secondary/40 flex items-center justify-center gap-2 group shadow-none"
          variant="outline"
        >
          <Plus className="h-4 w-4 text-primary group-hover:rotate-90 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Invite</span>
        </Button>
        <Button
          onClick={onViewAnalytics}
          className="h-12 rounded-3xl bg-secondary/30 dark:bg-white/5 border-0 hover:bg-secondary/40 flex items-center justify-center gap-2 group shadow-none"
          variant="outline"
        >
          <BarChart3 className="h-4 w-4 text-info group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-info">Data</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2">
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Recent logins</h3>
        <div className="space-y-1">
          {recentUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-white/5 rounded-3xl">
              No recent activity
            </p>
          ) : (
            recentUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onViewUser(user)}
                className="flex items-center justify-between p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-bold text-primary">
                      {(user.username || user.profile_username || 'U')?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs font-bold truncate">{user.username || user.profile_username || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Sign In</p>
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
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Trust Score</h3>
          <div className="p-4 bg-success/5 rounded-3xl flex items-center justify-around">
            <div className="text-center">
              <div className="text-xl font-bold text-success">
                {Math.round((verifiedCount / users.length) * 100)}%
              </div>
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Verified</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {users.length - verifiedCount}
              </div>
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
