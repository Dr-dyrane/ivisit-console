import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const VisitsPanel = ({ visitsData }) => {
  const stats = visitsData?.stats || { today: 0, pending: 0, completed: 0, upcoming: 0 };
  const recent = visitsData?.recent || [];

  const handleCreateVisit = () => {
    window.dispatchEvent(new CustomEvent('openVisitModal'));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Visit Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Today's Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight">Today</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{stats.today}</Badge>
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
                <p className="font-bold text-sm">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateVisit}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="Schedule New Visit"
          >
            <Plus className="h-4 w-4" />
            <span className="font-normal text-xs">Schedule</span>
          </motion.button>

          <motion.button
            onClick={() => window.dispatchEvent(new CustomEvent('openVisitAnalytics'))}
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
            title="Filter Visits"
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

      {/* Recent Visits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Visits</h3>

        <div className="space-y-2">
          {recent.map((visit) => (
            <Card key={visit.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${visit.status === 'completed' ? 'bg-success' :
                    visit.status === 'cancelled' ? 'bg-destructive' :
                      visit.status === 'in_progress' ? 'bg-warning' : 'bg-info'
                    }`} />
                  <div>
                    <p className="font-normal text-sm truncate max-w-[120px]">
                      {visit.patient_name || 'Visit #' + visit.id.substring(0, 6)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{visit.scheduled_at ? formatDate(visit.scheduled_at) : 'Not scheduled'}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0.5 h-5">
                  {visit.status}
                </Badge>
              </div>
            </Card>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recent visits found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
