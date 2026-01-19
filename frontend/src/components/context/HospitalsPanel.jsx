import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Hospital,
  Ambulance,
  AlertTriangle,
  MapPin
} from 'lucide-react';

export const HospitalsPanel = () => {
  const handleCreateHospital = () => {
    // Trigger hospital modal
    const event = new CustomEvent('openHospitalModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Capacity Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Capacity Status</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <Hospital className="h-5 w-5 text-success" />
              </div>
              <span className="font-black tracking-tight">Available</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">5</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Ambulance className="h-5 w-5 text-warning" />
              </div>
              <span className="font-medium">Busy</span>
            </div>
            <Badge className="bg-warning/20 text-warning border-0">3</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <span className="font-medium">Full</span>
            </div>
            <Badge className="bg-destructive/20 text-destructive border-0">1</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Location Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Location Filter</h3>

        <button className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-muted/50 transition-colors flex items-center gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Near Me</span>
        </button>
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
          onClick={handleCreateHospital}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-info/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Hospital className="h-4 w-4 text-info" />
          <span className="font-black tracking-tight text-info">Add New Hospital</span>
        </button>
      </motion.div>
    </div>
  );
};
