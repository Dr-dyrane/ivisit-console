import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Stethoscope,
  UserCheck,
  CheckCircle
} from 'lucide-react';

export const DoctorsPanel = ({ doctorsData }) => {
  const handleCreateDoctor = () => {
    // Trigger doctor modal
    const event = new CustomEvent('openDoctorModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Doctor Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Doctor Statistics</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight">Active Doctors</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{doctorsData.totalDoctors}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-info" />
              </div>
              <span className="font-bold tracking-tight">On Call</span>
            </div>
            <Badge className="bg-info/20 text-info border-0">{doctorsData.onCall}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <span className="font-bold tracking-tight">Available</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">{doctorsData.available}</Badge>
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
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <button
          onClick={handleCreateDoctor}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-info/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Stethoscope className="h-4 w-4 text-info" />
          <span className="font-bold tracking-tight text-info">Add New Doctor</span>
        </button>
      </motion.div>
    </div>
  );
};
