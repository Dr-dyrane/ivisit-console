import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { LocationCell } from '../ui/LocationCell';
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

  const handleAnalytics = () => {
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
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

      <div className="space-y-3">
        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-2"
        >
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Live Status</h3>

          <div className="bg-destructive/5 p-4 rounded-3xl flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-sm font-bold tracking-tight">Critical</span>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0 rounded-full">{emergencyStats.critical}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-warning/5 p-3 rounded-3xl flex items-center gap-2 group">
              <div className="w-8 h-8 bg-warning/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-bold text-xs">{emergencyStats.pending}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Pending</p>
              </div>
            </div>

            <div className="bg-info/5 p-3 rounded-3xl flex items-center gap-2 group">
              <div className="w-8 h-8 bg-info/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-bold text-xs">{emergencyStats.active || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleCreateEmergency}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-destructive/10 hover:bg-destructive/20 transition-all border-0"
            >
              <Zap className="h-4 w-4 text-destructive" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Req</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-info/10 hover:bg-info/20 transition-all border-0"
            >
              <Map className="h-4 w-4 text-info" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Map</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-muted/10 hover:bg-muted/20 transition-all border-0"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Filter</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openAnalyticsModal'))}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0"
            >
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Data</span>
            </button>
          </div>
        </motion.div>

        {/* Recent Emergencies */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Recent</h3>

          <div className="space-y-1">
            {((emergencyData?.recent || (Array.isArray(emergencyData) ? emergencyData : []))).slice(0, 3).map((request, idx) => (
              <div key={request.id || idx} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border-0 transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${request.service_type === 'critical_care' ? 'bg-destructive/20' :
                    request.service_type === 'ambulance' ? 'bg-primary/20' :
                      'bg-info/20'
                    }`}>
                    <Radio className={`h-4 w-4 ${request.service_type === 'critical_care' ? 'text-destructive' :
                      request.service_type === 'ambulance' ? 'text-primary' :
                        'text-info'
                      } animate-pulse`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate max-w-[120px]">
                      {request.patient_snapshot?.fullName || request.patient_name || 'Patient'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {request.id?.slice(0, 8)} • <LocationCell location={request.patient_location} pickupLocation={request.pickup_location} />
                    </p>
                  </div>
                </div>
                <Badge variant="ghost" className="text-[8px] font-bold uppercase tracking-widest p-0 h-auto opacity-60">
                  {request.status}
                </Badge>
              </div>
            ))}
            {((emergencyData?.recent || (Array.isArray(emergencyData) ? emergencyData : []))).length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Clear runway
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
