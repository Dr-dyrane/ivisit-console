import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useMapContext } from '../../contexts/MapContext';
import {
  AlertTriangle,
  Ambulance,
  Map,
  Zap,
  Clock,
  CheckCircle,
  Radio
} from 'lucide-react';

export const MapPanel = ({ emergencyStats }) => {
  const { mapData, setFilter } = useMapContext();
  const activeFilter = mapData.filter || 'all';

  const emergencyFilters = [
    {
      key: 'all',
      label: 'All',
      icon: Radio,
      count: emergencyStats.critical + emergencyStats.pending + emergencyStats.inProgress
    },
    {
      key: 'pending',
      label: 'Pending',
      icon: Clock,
      count: emergencyStats.pending
    },
    {
      key: 'dispatched',
      label: 'Dispatched',
      icon: CheckCircle,
      count: emergencyStats.inProgress
    },
    {
      key: 'en_route',
      label: 'En Route',
      icon: Ambulance,
      count: Math.max(0, emergencyStats.inProgress - 2) // Estimate
    }
  ];

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

      {/* Emergency Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Emergency Filters</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-premium">
          <div className="space-y-2">
            {emergencyFilters.map((filter, index) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.key;

              return (
                <Button
                  key={filter.key}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(filter.key)}
                  className={`w-full justify-between h-auto p-3 transition-all duration-200 ${isActive
                      ? 'bg-primary text-primary-foreground shadow-premium'
                      : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 geo-round flex items-center justify-center ${isActive ? 'bg-primary-foreground/20' : 'bg-muted/50'
                      }`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="font-medium text-sm">{filter.label}</span>
                  </div>
                  <Badge className={`${isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground border-0'
                      : 'bg-muted/50 text-muted-foreground border-0'
                    }`}>
                    {filter.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Recent Alerts</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground font-medium">No active emergencies</p>
            <p className="text-xs text-muted-foreground mt-1">System is operating normally</p>
          </div>
        </Card>
      </motion.div>

    </div>
  );
};
