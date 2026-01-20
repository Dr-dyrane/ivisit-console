import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Shield,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Plus
} from 'lucide-react';

export const InsurancePanel = ({ loading, getInsuranceStats }) => {
  const stats = getInsuranceStats ? getInsuranceStats() : { total: 0, active: 0, expired: 0, pending: 0, verified: 0, verificationRate: 0 };

  return (
    <div className="p-4 space-y-4">
      {/* Loading State */}
      {loading.insurance && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading.insurance && (
        <>
          {/* Policy Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Policy Overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Total Policies</span>
                    <p className="text-xs text-muted-foreground">All insurance records</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">{stats.total}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </Card>

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
            </div>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Verification Rate</span>
                    <p className="text-xs text-muted-foreground">Verified policies</p>
                  </div>
                </div>
                <Badge className="bg-info/20 text-info border-0">{stats.verificationRate}%</Badge>
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

            <div className="space-y-2">
              <button
                onClick={() => {
                  const event = new CustomEvent('openInsuranceModal');
                  window.dispatchEvent(event);
                }}
                className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm text-left"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span className="font-bold tracking-tight text-primary">Add New Policy</span>
              </button>

              <button
                onClick={() => {
                  const event = new CustomEvent('openInsuranceAnalyticsModal', {
                    detail: { button: document.querySelector('[data-analytics-button="true"]') }
                  });
                  window.dispatchEvent(event);
                }}
                data-analytics-button="true"
                className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-info/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm text-left"
              >
                <BarChart3 className="h-4 w-4 text-info" />
                <span className="font-bold tracking-tight text-info">View Analytics</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
