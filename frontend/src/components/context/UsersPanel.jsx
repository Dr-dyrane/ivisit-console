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
    <div className="space-y-6 p-6">
      {/* Quick Stats */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Quick Stats
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-normal">Total</span>
            </div>
            <div className="text-2xl font-semibold">{statistics?.totalUsers || users.length}</div>
          </Card>

          <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-success" />
              <span className="text-sm font-normal">Verified</span>
            </div>
            <div className="text-2xl font-semibold text-success">
              {statistics?.bvnVerifiedUsers || verifiedCount}
            </div>
          </Card>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Role Distribution
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning" />
              <span className="text-sm font-normal">Admins</span>
            </div>
            <Badge className="bg-warning/20 text-warning border-0 text-sm font-semibold">
              {(statistics ? ((statistics.roleDistribution?.admin || 0) + (statistics.roleDistribution?.org_admin || 0)) : adminCount)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-success" />
              <span className="text-sm font-normal">Providers</span>
            </div>
            <Badge className="bg-success/20 text-success border-0 text-sm font-semibold">
              {statistics?.roleDistribution?.provider || providerCount}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-info" />
              <span className="text-sm font-normal">Patients</span>
            </div>
            <Badge className="bg-info/20 text-info border-0 text-sm font-semibold">
              {statistics?.roleDistribution?.patient || patientCount}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Quick Actions
        </h3>

        <div className="space-y-2">
          {(isAdmin() || isOrgAdmin()) && (
            <Button
              onClick={onInviteUser}
              className="w-full justify-start h-10 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-bold tracking-widest uppercase text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              INVITE USER
            </Button>
          )}

          <Button
            onClick={onViewAnalytics}
            className="w-full justify-start h-10 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] font-bold tracking-widest uppercase text-primary"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            VIEW ANALYTICS
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-info" />
          Recent Activity
        </h3>

        <div className="space-y-3">
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            recentUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onViewUser(user)}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center p-3 rounded-lg
             bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                {/* LEFT: Avatar + Name + Email */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-border/20
                    flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(user.username || user.profile_username || 'U')?.[0]?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-normal truncate">
                      {user.username || user.profile_username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* RIGHT: Last login (fixed, never pushed) */}
                <div className="flex flex-col items-end text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Last login</p>
                  <p className="text-xs font-normal whitespace-nowrap">
                    {new Date(user.last_sign_in_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verification Rate */}
      {statistics && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-success" />
            Verification Overview
          </h3>

          <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-success mb-1">
                  {Math.round((verifiedCount / users.length) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Verification Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-primary mb-1">
                  {users.length - verifiedCount}
                </div>
                <p className="text-xs text-muted-foreground">Pending Verification</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
