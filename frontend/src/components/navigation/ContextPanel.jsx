import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, 
  Activity, 
  Users, 
  Hospital, 
  Ambulance,
  MapPin,
  Clock,
  TrendingUp,
  Filter,
  Zap
} from 'lucide-react';

export const ContextPanel = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const renderEmergencyPanel = () => (
    <div className="p-4 space-y-4">
      {/* Live Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Live Stats</h3>
        
        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <span className="font-medium">Critical</span>
            </div>
            <Badge className="bg-destructive/20 text-destructive">3</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <span className="font-medium">Pending</span>
            </div>
            <Badge className="bg-warning/20 text-warning">7</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-success" />
              </div>
              <span className="font-medium">Active</span>
            </div>
            <Badge className="bg-success/20 text-success">12</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Quick Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Filters</h3>
        
        <div className="space-y-2">
          {['Critical Only', 'Last 24 Hours', 'My Location'].map((filter, index) => (
            <button
              key={filter}
              className="w-full text-left p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{filter}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderUsersPanel = () => (
    <div className="p-4 space-y-4">
      {/* Role Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Role Distribution</h3>
        
        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-primary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Admins</span>
            </div>
            <Badge className="bg-primary/20 text-primary">2</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Hospital className="h-4 w-4 text-info" />
              </div>
              <span className="font-medium">Providers</span>
            </div>
            <Badge className="bg-info/20 text-info">8</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-muted/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium">Viewers</span>
            </div>
            <Badge className="bg-muted/20 text-muted-foreground">15</Badge>
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
        
        <button className="w-full p-3 geo-sharp bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">Add New User</span>
        </button>
      </motion.div>
    </div>
  );

  const renderHospitalsPanel = () => (
    <div className="p-4 space-y-4">
      {/* Capacity Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Capacity Status</h3>
        
        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                <Hospital className="h-4 w-4 text-success" />
              </div>
              <span className="font-medium">Available</span>
            </div>
            <Badge className="bg-success/20 text-success">5</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Ambulance className="h-4 w-4 text-warning" />
              </div>
              <span className="font-medium">Busy</span>
            </div>
            <Badge className="bg-warning/20 text-warning">3</Badge>
          </div>
        </Card>

        <Card className="glass squircle-lg p-4 border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <span className="font-medium">Full</span>
            </div>
            <Badge className="bg-destructive/20 text-destructive">1</Badge>
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
        
        <button className="w-full p-3 geo-sharp bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Near Me</span>
        </button>
      </motion.div>
    </div>
  );

  const renderAmbulancesPanel = () => (
    <div className="p-4 space-y-4">
      {/* Fleet Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Fleet Status</h3>
        
        <Card className="glass squircle-lg p-4 border-0">
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

        <Card className="glass squircle-lg p-4 border-0">
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

        <Card className="glass squircle-lg p-4 border-0">
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
        
        <Card className="glass squircle-lg p-4 border-0">
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
    </div>
  );

  // Render based on current path
  if (currentPath.includes('/emergency')) {
    return renderEmergencyPanel();
  } else if (currentPath.includes('/users')) {
    return renderUsersPanel();
  } else if (currentPath.includes('/hospitals')) {
    return renderHospitalsPanel();
  } else if (currentPath.includes('/ambulances')) {
    return renderAmbulancesPanel();
  }

  // Default panel
  return (
    <div className="p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 geo-round bg-muted/20 flex items-center justify-center mx-auto mb-4">
          <Activity className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-black text-lg mb-2">Context Panel</h3>
        <p className="text-muted-foreground text-sm">Navigate to a page to see relevant information</p>
      </motion.div>
    </div>
  );
};
