import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Clock,
  Shield,
  Users
} from 'lucide-react';

export const VerificationPanel = ({ verificationData }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Verification Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Verification Queue</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <span className="font-black tracking-tight">Pending</span>
            </div>
            <Badge className="bg-warning/20 text-warning border-0">{verificationData.pending}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <span className="font-black tracking-tight">Verified</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">{verificationData.verified}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="font-black tracking-tight">Total Users</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{verificationData.total}</Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
