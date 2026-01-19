import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Users,
  TrendingUp,
  Hospital,
  Ambulance,
  Stethoscope,
  Shield,
  BarChart3
} from 'lucide-react';

export const DashboardPanel = ({ emergencyStats, analyticsData, doctorsData, verificationData, useMockData }) => {
  const navigate = useNavigate();

  const handleEmergencyResponse = () => {
    // BentoHome special case: navigate to emergencies page then open modal
    navigate('/emergencies');
    // Small delay to ensure navigation completes before opening modal
    setTimeout(() => {
      const event = new CustomEvent('openEmergencyModal');
      window.dispatchEvent(event);
    }, 100);
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

      {/* App Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">App Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <span className="font-black tracking-tight">Active Emergencies</span>
                <p className="text-xs text-muted-foreground">Critical & High</p>
              </div>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical + emergencyStats.pending}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-black tracking-tight">Total Users</span>
                <p className="text-xs text-muted-foreground">All roles</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{doctorsData.totalDoctors + 25}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <span className="font-black tracking-tight">Response Time</span>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </div>
            <Badge className="bg-success/20 text-success border-0">{Math.round((analyticsData.avgResponseTime || 0) * 10) / 10}m</Badge>
          </div>
        </Card>
      </motion.div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">System Health</h3>

        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Hospital className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-black text-sm">{analyticsData.activeHospitals}</p>
                <p className="text-xs text-muted-foreground">Hospitals</p>
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
