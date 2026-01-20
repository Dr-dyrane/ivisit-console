import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Ambulance,
  Activity,
  Clock,
  Plus,
  MapPin,
  List,
  Filter
} from 'lucide-react';

export const AmbulancesPanel = ({ ambulancesData }) => {
  const stats = ambulancesData?.stats || { total: 0, available: 0, onRoute: 0, busy: 0, maintenance: 0 };
  const recent = ambulancesData?.recent || [];

  const handleCreateAmbulance = () => {
    window.dispatchEvent(new CustomEvent('openAmbulanceModal'));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Fleet Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Fleet Status</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <Ambulance className="h-5 w-5 text-success" />
              </div>
              <span className="font-bold tracking-tight">Available</span>
            </div>
            <Badge className="bg-success/20 text-success border-0">{stats.available}</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                <Activity className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.onRoute}</p>
                <p className="text-xs text-muted-foreground">On Route</p>
              </div>
            </div>
          </Card>

          <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.busy}</p>
                <p className="text-xs text-muted-foreground">Busy</p>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateAmbulance}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="Add New Ambulance"
          >
            <Plus className="h-4 w-4" />
            <span className="font-normal text-xs">Add</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            title="View Fleet Map"
          >
            <MapPin className="h-4 w-4" />
            <span className="font-normal text-xs">Map</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
            title="Filter Fleet"
          >
            <Filter className="h-4 w-4" />
            <span className="font-normal text-xs">Filter</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
            disabled
            title="Maintenance Log (Coming Soon)"
          >
            <List className="h-4 w-4" />
            <span className="font-normal text-xs">Log</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Ambulances */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Fleet</h3>

        <div className="space-y-2">
          {recent.map((ambulance) => (
            <Card key={ambulance.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${ambulance.status === 'available' ? 'bg-success' :
                      ambulance.status === 'on_route' ? 'bg-info' :
                        ambulance.status === 'busy' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                  <div>
                    <p className="font-normal text-sm truncate max-w-[120px]">
                      {ambulance.call_sign || 'Unit #' + ambulance.id.substring(0, 4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ambulance.plate_number || 'No Plate'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0.5 h-5">
                  {ambulance.status}
                </Badge>
              </div>
            </Card>
          ))}
          {recent.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No fleet data found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
