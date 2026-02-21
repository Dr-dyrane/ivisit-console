import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import {
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
  Settings,
  Download,
  RefreshCw,
  Shield,
  Clock,
  Zap,
  BarChart3,
  Bell,
  Hospital,
  Ambulance,
  Stethoscope
} from 'lucide-react';
import { usePageData } from '../../contexts/PageDataContext';
import { transformActivityData } from '../../utils/activityUtils';

export const DashboardPanel = ({ emergencyStats, analyticsData, doctorsData, verificationData, activityData, refreshAllData }) => {
  const navigate = useNavigate();

  // Command Center State
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    criticalEmergencies: 5,
    responseTimeMinutes: 10,
    lowAmbulances: 3
  });

  // Transform activity data for mini-feed
  const recentActivities = transformActivityData(activityData || []).slice(0, 5);

  // Helper to format time
  const formatTime = (minutes) => {
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds}s`;
    }
    return `${Math.round(minutes)}m`;
  };

  // Helper to format percentage
  const formatPercentage = (value) => {
    return Math.round(value || 0);
  };

  const handleEmergencyResponse = () => {
    // BentoHome special case: navigate to emergencies page then open modal
    navigate('/emergencies');
    // Small delay to ensure navigation completes before opening modal
    setTimeout(() => {
      const event = new CustomEvent('openEmergencyModal');
      window.dispatchEvent(event);
    }, 100);
  };

  const handleRefreshAll = () => {
    refreshAllData && refreshAllData();
  };

  const handleExportReport = () => {
    // Open the new unified reports modal
    const event = new CustomEvent('openAnalyticsModal', {
      detail: { type: 'performance' }
    });
    window.dispatchEvent(event);
  };

  const handleSystemBackup = async () => {
    try {
      // Trigger system backup via API
      const response = await fetch('/api/backup', { method: 'POST' });
      if (response.ok) {
        const event = new CustomEvent('systemBackupTriggered');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  const handleThresholdChange = (key, value) => {
    setAlertThresholds(prev => ({
      ...prev,
      [key]: parseInt(value) || 0
    }));
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics page
    navigate('/analytics');
  };

  return (
    <div className="space-y-3">
      {/* System Controls */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="bg-primary/5 dark:bg-primary/10 backdrop-blur-sm p-4 rounded-3xl relative overflow-hidden group border-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-primary">System</h3>
              <p className="text-[10px] text-muted-foreground">Real-time Command</p>
            </div>
          </div>
          <Switch
            checked={realTimeEnabled}
            onCheckedChange={setRealTimeEnabled}
            className="scale-90"
          />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleRefreshAll}
          className="h-auto py-3 px-4 rounded-3xl bg-secondary/30 dark:bg-white/5 border-0 hover:bg-secondary/40 flex flex-col items-center gap-2 group shadow-none"
          variant="outline"
        >
          <RefreshCw className="h-5 w-5 text-primary group-active:rotate-180 transition-transform duration-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Refresh</span>
        </Button>
        <Button
          onClick={handleExportReport}
          className="h-auto py-3 px-4 rounded-3xl bg-secondary/30 dark:bg-white/5 border-0 hover:bg-secondary/40 flex flex-col items-center gap-2 group shadow-none"
          variant="outline"
        >
          <Download className="h-5 w-5 text-success" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Export</span>
        </Button>
      </div>

      {/* Activity Mini-feed */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        className="bg-muted/10 dark:bg-white/5 backdrop-blur-sm p-4 rounded-3xl relative overflow-hidden group border-0"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-warning/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-warning">Feed</h3>
            <p className="text-[10px] text-muted-foreground">Recent events</p>
          </div>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, idx) => (
              <motion.div
                key={activity.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, ease: [0.4, 0, 0.2, 1] }}
                className="p-2 border-b border-white/5 last:border-0 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activity.bg} flex-shrink-0`}>
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal leading-tight text-foreground line-clamp-2">{activity.msg}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-xs">
              No recent activity
            </div>
          )}
        </div>
      </motion.div>

      {/* Alert Configuration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="bg-destructive/5 dark:bg-destructive/10 p-4 rounded-3xl border-0"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-destructive/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bell className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-destructive">Alerts</h3>
            <p className="text-[10px] text-muted-foreground">Threshold triggers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between gap-4 p-2 rounded-2xl bg-white/5 transition-all">
            <label className="text-xs text-muted-foreground font-normal">Emergencies</label>
            <Input
              type="number"
              value={alertThresholds.criticalEmergencies}
              onChange={(e) => handleThresholdChange('criticalEmergencies', e.target.value)}
              className="h-8 w-16 bg-transparent border-0 text-center font-bold text-sm focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center justify-between gap-4 p-2 rounded-2xl bg-white/5 transition-all">
            <label className="text-xs text-muted-foreground font-normal">Response (min)</label>
            <Input
              type="number"
              value={alertThresholds.responseTimeMinutes}
              onChange={(e) => handleThresholdChange('responseTimeMinutes', e.target.value)}
              className="h-8 w-16 bg-transparent border-0 text-center font-bold text-sm focus-visible:ring-0"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
