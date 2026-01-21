import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const HospitalListView = ({ hospitals, onView, onEdit, onDelete, getStatusBadge, isMobile = false }) => {
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
          <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {hospital.name || 'Unknown Hospital'}
                  </h3>
                  <Badge className={`squircle-sm ${getStatusBadge(hospital.status)} border-0 font-bold`}>
                    {hospital.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {hospital.address || 'No address'} • {hospital.available_beds || 0} beds • Fleet: {hospital.ambulances_count || 0}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right pr-4 border-r border-white/10">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <p className="font-bold text-lg">{hospital.rating || 'N/A'}</p>
                  </div>
                </div>
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(hospital)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${hospital.name}`}
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
