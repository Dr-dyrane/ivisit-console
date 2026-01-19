import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Headphones,
  Clock,
  Activity,
  CheckCircle,
  TrendingUp,
  Plus
} from 'lucide-react';

export const SupportTicketsPanel = ({ supportTicketsData, loading, useMockData }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Loading State */}
      {loading.supportTickets && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Data Source Indicator */}
      {!loading.supportTickets && useMockData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-2 geo-sharp bg-warning/10 border border-warning/20 rounded-lg"
        >
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Using Mock Data</span>
          </div>
        </motion.div>
      )}

      {/* Support Tickets Statistics */}
      {!loading.supportTickets && (
        <>
          {/* Empty State */}
          {supportTicketsData.total === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-3 bg-background/50 border-border/30 text-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Support Queue</span>
                  <Headphones className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">0</div>
                <div className="text-xs text-muted-foreground">No active tickets</div>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Total Tickets */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Tickets</span>
                    <Headphones className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-black text-foreground">{supportTicketsData.total}</div>
                  <div className="text-xs text-muted-foreground">All time</div>
                </Card>
              </motion.div>

              {/* Status Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-2"
              >
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <Clock className="h-3 w-3 text-warning" />
                    <span className="text-xs text-warning font-medium">Open</span>
                  </div>
                  <div className="text-lg font-bold">{supportTicketsData.open}</div>
                </Card>
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <Activity className="h-3 w-3 text-info" />
                    <span className="text-xs text-info font-medium">In Progress</span>
                  </div>
                  <div className="text-lg font-bold">{supportTicketsData.inProgress}</div>
                </Card>
              </motion.div>

              {/* Resolved and This Week */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-2"
              >
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <CheckCircle className="h-3 w-3 text-success" />
                    <span className="text-xs text-success font-medium">Resolved</span>
                  </div>
                  <div className="text-lg font-bold">{supportTicketsData.resolved}</div>
                </Card>
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">This Week</span>
                  </div>
                  <div className="text-lg font-bold">{supportTicketsData.thisWeek}</div>
                </Card>
              </motion.div>

              {/* Average Resolution Time */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="p-3 bg-background/50 border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Avg Resolution</span>
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-xl font-bold text-foreground">{supportTicketsData.averageResolutionTime}h</div>
                  <div className="text-xs text-muted-foreground">Response time</div>
                </Card>
              </motion.div>
            </>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">Quick Actions</div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    const event = new CustomEvent('openSupportTicketModal');
                    window.dispatchEvent(event);
                  }}
                  className="w-full p-2 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all duration-300 flex items-center gap-2 cursor-pointer text-left"
                >
                  <Plus className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">New Ticket</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
