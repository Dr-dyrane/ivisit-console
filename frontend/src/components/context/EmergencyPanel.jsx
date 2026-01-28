import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Activity,
  Clock,
  Zap,
  Map,
  Filter,
  Radio,
  BarChart3
} from 'lucide-react';

export const EmergencyPanel = ({ emergencyData = [], emergencyStats, useMockData }) => {
  const handleCreateEmergency = () => {
    window.dispatchEvent(new CustomEvent('openEmergencyModal'));
  };

  return (
    <div className="space-y-4">
      {/* Data Source Indicator */}
      {useMockData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-2 geo-sharp bg-warning/10 border border-warning/20 rounded-lg"
        >
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-normal">Using Mock Data</span>
          </div>
        </motion.div>
      )}

      {/* Emergency Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Emergency Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <span className="font-bold tracking-tight">Critical</span>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical}</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-bold text-sm">{emergencyStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-bold text-sm">{emergencyStats.active || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
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
            onClick={handleCreateEmergency}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="New Emergency Request"
          >
            <Zap className="h-4 w-4" />
            <span className="font-normal text-xs">Request</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="View Live Map"
          >
            <Map className="h-4 w-4" />
            <span className="font-normal text-xs">Map</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="Filter Requests"
          >
            <Filter className="h-4 w-4" />
            <span className="font-normal text-xs">Filter</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.dispatchEvent(new CustomEvent('openReportsModal'))}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="View Analytics"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-normal text-xs">Analytics</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Emergencies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Requests</h3>

        <div className="space-y-2">
          {((emergencyData?.recent || (Array.isArray(emergencyData) ? emergencyData : []))).slice(0, 3).map((request) => (
            <Card key={request.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${
                    request.service_type === 'critical_care' ? 'bg-destructive' :
                    request.service_type === 'ambulance' ? 'bg-primary' :
                    request.service_type === 'bed' ? 'bg-warning' :
                    'bg-info'
                  }`} />
                  <div>
                    <p className="font-normal text-sm truncate max-w-[120px]">
                      {request.patient_snapshot?.fullName || request.patient_name || 'Unknown Patient'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {request.hospital_name || request.patient_location || 'Unknown location'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0.5 h-5">
                  {request.service_type?.replace('_', ' ') || 'unknown'}
                </Badge>
              </div>
            </Card>
          ))}
          {((emergencyData?.recent || (Array.isArray(emergencyData) ? emergencyData : []))).length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recent emergencies
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
