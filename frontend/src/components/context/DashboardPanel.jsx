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
    // Generate and download system report
    const reportData = {
      timestamp: new Date().toISOString(),
      emergencyStats,
      analyticsData,
      doctorsData,
      verificationData,
      recentActivities
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="p-4 space-y-4 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
      {/* System Controls */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wider">System Controls</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Real-time Updates</span>
            <Switch
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-success" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={handleRefreshAll}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All Data
          </Button>
          <Button
            onClick={handleExportReport}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            onClick={handleSystemBackup}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Trigger Backup
          </Button>
        </div>
      </Card>

      {/* Activity Mini-feed */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-warning" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Recent Activity</h3>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, idx) => (
              <div key={activity.id || idx} className="p-2 border-b border-border/20 last:border-0">
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 squircle flex items-center justify-center ${activity.bg} flex-shrink-0`}>
                    <activity.icon className={`h-3 w-3 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal leading-snug truncate-2">{activity.msg}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No recent activity
            </div>
          )}
        </div>
      </Card>

      {/* Alert Configuration */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-destructive" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Alert Thresholds</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Critical Emergencies</label>
            <Input
              type="number"
              value={alertThresholds.criticalEmergencies}
              onChange={(e) => handleThresholdChange('criticalEmergencies', e.target.value)}
              placeholder="Alert when count exceeds"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Response Time (minutes)</label>
            <Input
              type="number"
              value={alertThresholds.responseTimeMinutes}
              onChange={(e) => handleThresholdChange('responseTimeMinutes', e.target.value)}
              placeholder="Alert when exceeds"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Low Ambulances</label>
            <Input
              type="number"
              value={alertThresholds.lowAmbulances}
              onChange={(e) => handleThresholdChange('lowAmbulances', e.target.value)}
              placeholder="Alert when below"
              className="h-8"
            />
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-info" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-lg font-bold tracking-tight">{formatTime(analyticsData?.avgResponseTime || 4.2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">System Uptime</p>
            <p className="text-lg font-bold tracking-tight">99.9%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Completion Rate</p>
            <p className="text-lg font-bold tracking-tight">{formatPercentage(analyticsData?.completionRate)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="text-lg font-bold tracking-tight">{doctorsData?.totalDoctors || 0}</p>
          </div>
        </div>
      </Card>

      {/* Legacy Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">App Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <span className="font-bold tracking-tight">Active Emergencies</span>
                <p className="text-xs text-muted-foreground">Critical & High</p>
              </div>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0">
              {(emergencyStats?.critical || 0) + (emergencyStats?.high || 0)}
            </Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-bold tracking-tight">Total Users</span>
                <p className="text-xs text-muted-foreground">All roles</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">
              {verificationData?.total || 0}
            </Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <span className="font-bold tracking-tight">Response Time</span>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </div>
            <Badge className="bg-success/20 text-success border-0">
              {formatTime(analyticsData?.avgResponseTime || 0)}
            </Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-info" />
              </div>
              <div>
                <span className="font-bold tracking-tight">Completion Rate</span>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
            <Badge className="bg-info/20 text-info border-0">
              {formatPercentage(analyticsData?.completionRate)}%
            </Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
