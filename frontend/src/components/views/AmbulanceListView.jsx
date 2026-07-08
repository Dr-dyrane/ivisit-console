import React from 'react';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const AmbulanceListView = ({
  ambulances,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  onSchedule,
  isMobile = false,
  canDelete = false
}) => {
  const getStationLabel = (ambulance) => (
    ambulance.hospital
    || ambulance.hospital_name
    || ambulance.station_name
    || 'Station not assigned'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {ambulances.map((ambulance, index) => (
        <motion.div
          key={ambulance.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div className="rounded-card bg-background/30 p-4 transition-colors hover:bg-muted/30 group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate transition-colors">
                    {ambulance.call_sign || 'Unknown Unit'}
                  </h3>
                  <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(ambulance.status)}`}>
                    {ambulance.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {ambulance.type || 'Standard'} - {ambulance.vehicle_number || 'No Plate'} - Station: {getStationLabel(ambulance)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right rounded-button bg-muted/24 px-3 py-2">
                  <p className="text-xs text-muted-foreground font-medium">ETA</p>
                  <p className="font-bold text-lg">{ambulance.eta || 'N/A'}</p>
                </div>
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(ambulance)}
                    className="rounded-button h-8 w-8 p-0 hover:bg-muted/40"
                    aria-label={`View details for ${ambulance.call_sign}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(ambulance)}
                    className="rounded-button h-8 w-8 p-0 hover:bg-muted/40"
                    aria-label={`Edit ${ambulance.call_sign}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onSchedule && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSchedule(ambulance)}
                      className="rounded-button h-8 w-8 p-0 hover:bg-violet-500/10 hover:text-violet-500"
                      aria-label={`Schedule crew for ${ambulance.call_sign}`}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(ambulance)}
                      className="rounded-button h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${ambulance.call_sign}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
