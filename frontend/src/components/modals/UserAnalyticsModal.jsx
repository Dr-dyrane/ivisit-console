import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Users, UserCheck, Shield, AlertTriangle, Mail, Phone, Calendar, Activity } from 'lucide-react';

export const UserAnalyticsModal = ({ open, onClose, analytics, users }) => {
  if (!analytics) return null;

  const getPercentage = (value, total) => (total > 0 ? ((value / total) * 100).toFixed(0) : 0);

  const recentActivity = users
    .filter(user => user.last_sign_in_at)
    .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
    .slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - Apple uses a high-blur dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground/90">User Analytics</h2>
                  <p className="text-sm text-muted-foreground">User base overview and engagement metrics</p>
                </div>
                <div className="sm:hidden">
                  <h2 className="text-xl font-bold tracking-tight text-foreground/90">Analytics</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* KPI Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-primary" />
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <h3 className="text-3xl font-bold">{analytics.totalUsers}</h3>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <div className="mt-2">
                    <Badge className="bg-primary/10 text-primary border-0">
                      +{analytics.recentSignups} this month
                    </Badge>
                  </div>
                </Card>

                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <div className="flex items-center justify-between mb-4">
                    <UserCheck className="h-8 w-8 text-success" />
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Verification Rate</p>
                      <p className="text-lg font-bold text-success">
                        {getPercentage(analytics.emailVerifiedUsers, analytics.totalUsers)}%
                      </p>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold">{analytics.emailVerifiedUsers}</h3>
                  <p className="text-sm text-muted-foreground">Verified Users</p>
                </Card>

                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="h-8 w-8 text-info" />
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <h3 className="text-3xl font-bold">{analytics.recentSignups}</h3>
                  <p className="text-sm text-muted-foreground">Recent Signups</p>
                  <div className="mt-2">
                    <Badge className="bg-info/10 text-info border-0">
                      Last 30 days
                    </Badge>
                  </div>
                </Card>

                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="h-8 w-8 text-warning" />
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <h3 className="text-3xl font-bold">{analytics.totalProfiles}</h3>
                  <p className="text-sm text-muted-foreground">Total Profiles</p>
                  <div className="mt-2">
                    <Badge className="bg-warning/10 text-warning border-0">
                      {getPercentage(analytics.totalProfiles, analytics.totalUsers)}% completion
                    </Badge>
                  </div>
                </Card>
              </div>

              {/* Role Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Role Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.roleDistribution).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            role === 'admin' ? 'bg-primary' :
                            role === 'provider' ? 'bg-success' : 'bg-info'
                          }`} />
                          <span className="font-medium capitalize">{role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{count}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getPercentage(count, analytics.totalUsers)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-info" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {recentActivity.map((user, index) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {(user.username || user.profile_username || 'U')?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {user.username || user.profile_username || 'Unknown User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Last login</p>
                          <p className="text-xs font-medium">
                            {new Date(user.last_sign_in_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent activity
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Engagement Metrics */}
              <Card className="p-6 bg-background/50 backdrop-blur-sm border-0">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Engagement Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {getPercentage(analytics.emailVerifiedUsers, analytics.totalUsers)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Email Verification Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success mb-1">
                      {getPercentage(analytics.recentSignups, analytics.totalUsers)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Monthly Growth Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-info mb-1">
                      {getPercentage(analytics.totalProfiles, analytics.totalUsers)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Profile Completion Rate</p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
