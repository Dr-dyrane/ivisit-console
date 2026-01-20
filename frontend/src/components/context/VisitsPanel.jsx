import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';

export const VisitsPanel = ({ visitsData }) => {
  const handleCreateVisit = () => {
    // Trigger visit modal
    const event = new CustomEvent('openVisitModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Visit Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Visit Statistics</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight">Today</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{visitsData.today}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <span className="font-bold tracking-tight">Pending</span>
            </div>
            <Badge className="bg-warning/20 text-warning border-0">{visitsData.pending}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <span className="font-bold tracking-tight">Completed</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">{visitsData.completed}</Badge>
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
          onClick={handleCreateVisit}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-bold tracking-tight text-primary">Schedule New Visit</span>
        </button>
      </motion.div>
    </div>
  );
};
