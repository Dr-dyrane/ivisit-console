import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import {
  Settings,
  Shield
} from 'lucide-react';

export const SettingsPanel = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Settings Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Settings</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-muted/20 flex items-center justify-center">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="font-bold tracking-tight">General</span>
            </div>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight">Security</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
