import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const DoctorListView = ({ doctors, onView, onEdit, onDelete, getStatusBadge, onSchedule, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {doctors.map((doctor, index) => (
        <motion.div
          key={doctor.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {doctor.name || 'Unknown Doctor'}
                  </h3>
                  <Badge className={`squircle-sm ${getStatusBadge(doctor.status)} border-0 font-bold`}>
                    {doctor.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {doctor.specialization || 'General Practitioner'} • {doctor.hospitals?.name || 'No Hospital'} • {doctor.experience || '0'}y exp
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right pr-4 border-r border-white/10">
                  <p className="text-xs text-muted-foreground font-medium">RATING</p>
                  <p className="font-bold text-lg">{doctor.rating || 'N/A'}</p>
                </div>
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(doctor)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`View details for ${doctor.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(doctor)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${doctor.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSchedule && onSchedule(doctor)}
                    className="squircle h-8 w-8 p-0 hover:bg-purple-500/10 hover:text-purple-500"
                    aria-label={`Schedule ${doctor.name}`}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(doctor)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${doctor.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
