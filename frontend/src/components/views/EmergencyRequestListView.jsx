import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye, MapPin, Clock, CheckCircle, Zap, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { toast } from 'sonner';

export const EmergencyRequestListView = ({ requests, onView, onDelete, getPriorityBadge, isMobile = false }) => {
  
  const handleDispatch = async (emergency) => {
    try {
      const result = await dispatchEmergency(emergency.id, emergency);
      toast.success(`Emergency dispatched - ${result.assignments.ambulance?.type || 'Unit'} assigned`);
      if (onView) onView({ ...emergency, ...result.emergency });
    } catch (error) {
      toast.error('Failed to dispatch emergency');
      console.error(error);
    }
  };

  const handleComplete = async (emergency) => {
    if (!confirm('Mark this emergency as completed?')) return;
    
    try {
      await completeEmergency(emergency.id);
      toast.success('Emergency marked as completed');
      // Refresh would be handled by parent component's real-time subscription
    } catch (error) {
      toast.error('Failed to complete emergency');
      console.error(error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {requests.map((req, index) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {req.emergency_type || 'Unknown Emergency'}
                  </h3>
                  <Badge className={`squircle-sm ${getPriorityBadge(req.priority)} border-0 font-bold`}>
                    {req.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{req.location || 'Location shared'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}</span>
                  </div>
                </div>
              </div>

              <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                {/* Dispatch Action */}
                {req.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDispatch(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-success/10 hover:text-success"
                    title="Dispatch Emergency"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Complete Action */}
                {(req.status === 'accepted' || req.status === 'in_progress') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleComplete(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    title="Mark as Completed"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(req)}
                  className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(req)}
                  className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  title="Delete Request"
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
