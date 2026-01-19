import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  FileText
} from 'lucide-react';

export const AnalyticsPanel = ({ analyticsData }) => {
  const handleOpenReports = () => {
    // Trigger reports modal on analytics page
    const event = new CustomEvent('openReportsModal');
    window.dispatchEvent(event);
  };

  const handleExportData = () => {
    // Trigger export on analytics page
    const event = new CustomEvent('exportAnalytics');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Analytics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Analytics Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="font-black tracking-tight">Total Requests</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{analyticsData.totalRequests}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <span className="font-black tracking-tight">Completion Rate</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">{analyticsData.completionRate}%</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <span className="font-black tracking-tight">Avg Response</span>
            </div>
            <Badge className="bg-info/20 text-info border-0">{Math.round((analyticsData.avgResponseTime || 0) * 10) / 10}m</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Performance Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Performance Insights</h3>
        
        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-warning" />
              </div>
              <div>
                <span className="font-black tracking-tight">System Health</span>
                <p className="text-xs text-muted-foreground">Overall status</p>
              </div>
            </div>
            <Badge className="bg-success/20 text-success border-0">Optimal</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="space-y-2">
          <button 
            onClick={handleOpenReports}
            className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-black tracking-tight text-primary">Generate Reports</span>
          </button>

          <button 
            onClick={handleExportData}
            className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-success/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
          >
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="font-black tracking-tight text-success">Export Data</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
