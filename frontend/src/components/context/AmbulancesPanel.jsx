import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Ambulance,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react';

export const AmbulancesPanel = () => {
  const handleCreateAmbulance = () => {
    // Trigger ambulance modal
    const event = new CustomEvent('openAmbulanceModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Fleet Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Fleet Status</h3>

        <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                <Ambulance className="h-4 w-4 text-success" />
              </div>
              <span className="font-medium">Available</span>
            </div>
            <Badge className="bg-success/20 text-success">8</Badge>
          </div>
        </Card>

        <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-info" />
              </div>
              <span className="font-medium">On Route</span>
            </div>
            <Badge className="bg-info/20 text-info">4</Badge>
          </div>
        </Card>

        <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <span className="font-medium">Busy</span>
            </div>
            <Badge className="bg-warning/20 text-warning">3</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Performance</h3>

        <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Avg Response</span>
            </div>
            <Badge className="bg-primary/20 text-primary">4.2 min</Badge>
          </div>
        </Card>
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
          onClick={handleCreateAmbulance}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-warning/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Ambulance className="h-4 w-4 text-warning" />
          <span className="font-black tracking-tight text-warning">Add New Ambulance</span>
        </button>
      </motion.div>
    </div>
  );
};
