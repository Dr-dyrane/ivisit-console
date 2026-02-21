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
    const event = new CustomEvent('openAnalyticsModal');
    window.dispatchEvent(event);
  };

  const handleExportData = () => {
    // Trigger export on analytics page
    const event = new CustomEvent('exportAnalytics');
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-4">
      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Overview</h3>

        <div className="bg-primary/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight">Total Requests</span>
          </div>
          <Badge className="bg-primary/20 text-primary border-0 rounded-full">{analyticsData.totalRequests}</Badge>
        </div>

        <div className="bg-success/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm font-bold tracking-tight">Completion Rate</span>
          </div>
          <Badge className="bg-success/20 text-success border-0 rounded-full">{analyticsData.completionRate}%</Badge>
        </div>

        <div className="bg-info/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <span className="text-sm font-bold tracking-tight">Avg Response</span>
          </div>
          <Badge className="bg-info/20 text-info border-0 rounded-full">{Math.round((analyticsData.avgResponseTime || 0) * 10) / 10}m</Badge>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Reporting</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenReports}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
          >
            <FileText className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Reports</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-success/10 hover:bg-success/20 transition-all border-0 group"
          >
            <TrendingUp className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-success">Export</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
