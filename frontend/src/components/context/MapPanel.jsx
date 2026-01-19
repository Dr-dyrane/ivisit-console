import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Ambulance,
  Map,
  Zap
} from 'lucide-react';

export const MapPanel = ({ emergencyStats }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Live Statistics (Mobile Parity) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Live Statistics</h3>

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
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <Ambulance className="h-5 w-5 text-success" />
              </div>
              <div>
                <span className="font-black tracking-tight">Available Units</span>
                <p className="text-xs text-muted-foreground">Ready for dispatch</p>
              </div>
            </div>
            <Badge className="bg-success/20 text-success border-0">
              {/* Fallback estimation since we don't have direct ambulance status in emergencyStats */}
              {Math.max(0, 12 - emergencyStats.inProgress)}
            </Badge>
          </div>
        </Card>
      </motion.div>

      {/* Map Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Map Controls</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <span className="font-black tracking-tight">Live View</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">Active</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <button className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-black tracking-tight text-primary">Center Map</span>
        </button>
      </motion.div>
    </div>
  );
};
