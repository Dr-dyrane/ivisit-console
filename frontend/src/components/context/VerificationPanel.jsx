import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Shield,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  Eye,
  Filter,
  BarChart3,
  Download
} from 'lucide-react';

export const VerificationPanel = ({ verificationData, loading }) => {
  const navigate = useNavigate();
  const stats = verificationData || { pending: 0, approved: 0, rejected: 0, total: 0 };
  const verificationRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const handleCreate = () => {
    // Navigate to users panel logic or specific action
    navigate('/users?role=provider');
  };

  const handleAnalytics = () => {
    const event = new CustomEvent('openAnalyticsModal', {
      detail: { type: 'user' }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {loading?.verification && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading?.verification && (
        <>
          {/* Verification Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Verification Overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Total Applications</span>
                    <p className="text-xs text-muted-foreground">All verification requests</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">{stats.total}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.approved}</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Success Rate</span>
                    <p className="text-xs text-muted-foreground">Approval percentage</p>
                  </div>
                </div>
                <Badge className="bg-info/20 text-info border-0">{verificationRate}%</Badge>
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Manage Providers"
              >
                <Users className="h-4 w-4" />
                <span className="font-normal text-xs">Manage</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalytics}
                className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="View Analytics"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="font-normal text-xs">Analytics</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Filter Queue"
              >
                <Filter className="h-4 w-4" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                disabled
                title="Export (Coming Soon)"
              >
                <Download className="h-4 w-4" />
                <span className="font-normal text-xs">Export</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Recent Applications Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm text-center py-6">
              <p className="text-xs text-muted-foreground">Real-time feed coming soon</p>
            </Card>
          </motion.div>

          {/* Critical Alerts */}
          {stats.pending > 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Critical Alerts</h3>
              <Card className="bg-destructive/10 border-destructive/20 squircle-lg p-4 border">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-destructive uppercase tracking-tight">High Backlog</p>
                    <p className="text-xs text-destructive/80 font-normal leading-relaxed">
                      {stats.pending} applications pending review.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
