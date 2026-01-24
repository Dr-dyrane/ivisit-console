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
    const event = new CustomEvent('openReportsModal', {
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
    <div className="space-y-4">
      {/* System Controls - Apple-Wordy Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card p-4 hover-lift relative overflow-hidden group"
      >
        {/* Shared RGB Hive Effect */}
        <div className="hover-glow hover-glow-primary" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">System Controls</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">Real-time Updates</span>
            <Switch
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
          </div>
        </div>
      </motion.div>

      {/* Quick Actions - Apple-Wordy Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card p-4 hover-lift relative overflow-hidden group"
      >
        {/* Shared RGB Hive Effect */}
        <div className="hover-glow hover-glow-success" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center border border-success/30 group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5 text-success" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={handleRefreshAll}
            className="w-full justify-start glass-card hover-lift"
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All Data
          </Button>
          <Button
            onClick={handleExportReport}
            className="w-full justify-start glass-card hover-lift"
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            onClick={handleSystemBackup}
            className="w-full justify-start glass-card hover-lift"
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Trigger Backup
          </Button>
        </div>
      </motion.div>

      {/* Activity Mini-feed - Apple-Wordy Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card p-4 hover-lift relative overflow-hidden group"
      >
        {/* Shared RGB Hive Effect */}
        <div className="hover-glow hover-glow-warning" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-warning/20 rounded-2xl flex items-center justify-center border border-warning/30 group-hover:scale-110 transition-transform">
            <Activity className="h-5 w-5 text-warning" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, idx) => (
              <motion.div
                key={activity.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, ease: [0.4, 0, 0.2, 1] }}
                className="p-2 border-b border-border/20 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${activity.bg} flex-shrink-0`}>
                    <activity.icon className={`h-3 w-3 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal leading-snug truncate-2 text-foreground">{activity.msg}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No recent activity
            </div>
          )}
        </div>
      </motion.div>

      {/* Alert Configuration - Apple-Wordy Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card p-4 hover-lift relative overflow-hidden group"
      >
        {/* Shared RGB Hive Effect */}
        <div className="hover-glow hover-glow-destructive" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-destructive/20 rounded-2xl flex items-center justify-center border border-destructive/30 group-hover:scale-110 transition-transform">
            <Bell className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Alert Thresholds</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Critical Emergencies</label>
            <Input
              type="number"
              value={alertThresholds.criticalEmergencies}
              onChange={(e) => handleThresholdChange('criticalEmergencies', e.target.value)}
              placeholder="Alert when count exceeds"
              className="h-8 glass-card"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Response Time (minutes)</label>
            <Input
              type="number"
              value={alertThresholds.responseTimeMinutes}
              onChange={(e) => handleThresholdChange('responseTimeMinutes', e.target.value)}
              placeholder="Alert when exceeds"
              className="h-8 glass-card"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Low Ambulances</label>
            <Input
              type="number"
              value={alertThresholds.lowAmbulances}
              onChange={(e) => handleThresholdChange('lowAmbulances', e.target.value)}
              placeholder="Alert when below"
              className="h-8 glass-card"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
