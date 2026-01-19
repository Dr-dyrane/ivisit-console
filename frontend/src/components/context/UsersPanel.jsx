import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Users,
  Hospital
} from 'lucide-react';

export const UsersPanel = () => {
  const handleCreateUser = () => {
    // Trigger user modal
    const event = new CustomEvent('openUserModal');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Role Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Role Distribution</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="font-black tracking-tight">Admins</span>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">2</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <Hospital className="h-5 w-5 text-info" />
              </div>
              <span className="font-black tracking-tight">Providers</span>
            </div>
            <Badge className="bg-info/20 text-info border-0">8</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-muted/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="font-black tracking-tight">Viewers</span>
            </div>
            <Badge className="bg-muted/20 text-muted-foreground border-0">15</Badge>
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
          onClick={handleCreateUser}
          className="w-full p-4 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm"
        >
          <Users className="h-4 w-4 text-primary" />
          <span className="font-black tracking-tight text-primary">Add New User</span>
        </button>
      </motion.div>
    </div>
  );
};
