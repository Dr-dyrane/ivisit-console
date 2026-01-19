import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react';

export const EmergencyPanel = ({ emergencyData, emergencyStats, useMockData }) => {
  const handleCreateEmergency = () => {
    // Trigger emergency modal
    const event = new CustomEvent('openEmergencyModal');
    window.dispatchEvent(event);
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

      {/* Live Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Emergency Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <span className="font-black tracking-tight">Critical</span>
                <p className="text-xs text-muted-foreground">Immediate attention</p>
              </div>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0">{emergencyStats.critical}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <span className="font-black tracking-tight">Pending</span>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </div>
            </div>
            <Badge className="bg-warning/20 text-warning border-0">{emergencyStats.pending}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-info" />
              </div>
              <div>
                <span className="font-black tracking-tight">In Progress</span>
                <p className="text-xs text-muted-foreground">Being handled</p>
              </div>
            </div>
            <Badge className="bg-info/20 text-info border-0">{emergencyStats.inProgress}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-black tracking-tight">Total Requests</span>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{emergencyStats.total}</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Recent Activity</h3>

        <div className="space-y-2">
          {emergencyData.slice(0, 3).map((request) => (
            <Card key={request.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${request.priority === 'critical' ? 'bg-destructive' :
                    request.priority === 'high' ? 'bg-warning' :
                      request.priority === 'medium' ? 'bg-info' : 'bg-success'
                    }`} />
                  <div>
                    <p className="font-medium text-sm">{request.patient_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {request.location || 'Unknown location'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {request.priority}
                </Badge>
              </div>
            </Card>
          ))}
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

        <button 
          onClick={handleCreateEmergency}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-destructive/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Zap className="h-4 w-4 text-destructive" />
          <span className="font-black tracking-tight text-destructive">New Emergency Request</span>
        </button>
      </motion.div>
    </div>
  );
};
