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
  Ambulance,
  Stethoscope
} from 'lucide-react';
import { usePageData } from '../../contexts/PageDataContext';
import { transformActivityData } from '../../utils/activityUtils';

export const DashboardPanel = ({ emergencyStats, analyticsData, doctorsData, verificationData, useMockData, activityData, refreshAllData }) => {
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
    <div className="p-4 space-y-4">
      {/* Data Source Indicator */}
      {useMockData && (
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

      {/* System Controls */}
      <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-black text-sm uppercase tracking-wider">System Controls</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Real-time Updates</span>
            <Switch checked={realTimeEnabled} onCheckedChange={setRealTimeEnabled} />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleRefreshAll}>
              <RefreshCw className="h-3 w-3 mr-2" /> Refresh
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleExportReport}>
              <Download className="h-3 w-3 mr-2" /> Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 geo-round bg-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">{emergencyStats.pending + emergencyStats.inProgress}</p>
              <p className="text-xs text-muted-foreground">Active Cases</p>
            </div>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
              <Ambulance className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-black text-sm">{analyticsData.availableAmbulances}</p>
              <p className="text-xs text-muted-foreground">Ambulances</p>
            </div>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-black text-sm">{doctorsData.onCall}</p>
              <p className="text-xs text-muted-foreground">On Call</p>
            </div>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-black text-sm">{verificationData.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="space-y-2">
          <button
            onClick={handleEmergencyResponse}
            className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-destructive/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-black tracking-tight text-destructive">Emergency Response</span>
          </button>

          <button
            onClick={handleViewAnalytics}
            className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
          >
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-black tracking-tight text-primary">View Analytics</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
