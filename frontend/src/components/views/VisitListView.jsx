import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const VisitListView = ({ visits, onView, onEdit, onDelete, getStatusBadge, isMobile = false }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {visits.map((visit, index) => (
        <motion.div
          key={visit.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-black text-lg truncate group-hover:text-primary transition-colors">
                    Visit #{visit.id?.slice(-6) || 'N/A'}
                  </h3>
                  <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-black`}>
                    {visit.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(visit.scheduled_at || visit.created_at)}</span>
                </div>
              </div>

              <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(visit)}
                  className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(visit)}
                  className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(visit)}
                  className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
