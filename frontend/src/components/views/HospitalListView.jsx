import React from 'react';
import { Button } from '../ui/button';
import { Edit, Eye, Star, Hospital, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const HospitalListView = ({
  hospitals,
  onView,
  onEdit,
  onFocus,
  canDelete = false,
  onDelete,
  onSchedule,
  isMobile = false
}) => {
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'bg-green-500/18 text-green-600 dark:text-green-300';
      case 'unverified':
        return 'bg-yellow-500/18 text-yellow-700 dark:text-yellow-300';
      case 'pending':
        return 'bg-blue-500/18 text-blue-600 dark:text-blue-300';
      case 'closed':
      case 'inactive':
        return 'bg-red-500/18 text-red-600 dark:text-red-300';
      default:
        return 'bg-muted/45 text-muted-foreground';
    }
  };

  const formatWaitTime = (minutes) => {
    if (minutes === null || minutes === undefined || minutes === '') {
      return 'Unknown';
    }

    const numericMinutes = Number(minutes);
    return Number.isFinite(numericMinutes) ? `${numericMinutes}m` : 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {hospitals.map((hospital, index) => (
        <motion.div
          key={hospital.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div
            className="group cursor-pointer rounded-card bg-background/35 p-4 shadow-sm backdrop-blur-xs transition-[background,box-shadow,transform] duration-200 hover:bg-background/55 hover:shadow-md"
            onClick={() => onFocus?.(hospital)}
          >
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-shrink-0">
                {hospital.image ? (
                  <div className="relative h-16 w-16 rounded-icon overflow-hidden bg-black/20">
                    <img
                      src={hospital.image}
                      alt={hospital.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 hidden">
                      <Hospital className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-icon bg-muted/20 flex items-center justify-center">
                    <Hospital className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {hospital.name || 'Unknown Hospital'}
                  </h3>
                  <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-bold ${getStatusBadge(hospital.status)}`}>
                    {hospital.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {hospital.address || 'No address'} / Beds: {hospital.available_beds || 0}/{hospital.total_beds || 0} / ICU: {hospital.icu_beds_available || 0} / Fleet: {hospital.ambulances_count || 0}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  ER wait: {formatWaitTime(hospital.emergency_wait_time_minutes)} / Updated: {hospital.last_availability_update ? new Date(hospital.last_availability_update).toLocaleString() : 'Unknown'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="rounded-inner bg-muted/24 px-3 py-2 text-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <p className="font-bold text-lg">{hospital.rating || 'N/A'}</p>
                  </div>
                </div>
                <div
                  className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(hospital)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`View details for ${hospital.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(hospital)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${hospital.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onSchedule && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSchedule(hospital)}
                      className="squircle h-8 w-8 p-0 hover:bg-purple-500/10 hover:text-purple-500"
                      aria-label={`Manage schedule for ${hospital.name}`}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(hospital)}
                      className="squircle h-8 px-3 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${hospital.name}`}
                    >
                      Delete
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
