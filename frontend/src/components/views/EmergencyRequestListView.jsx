import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye, MapPin, Clock, CheckCheck, Send, Navigation, User, Hospital, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import { validateDataSchema } from '../../utils/schemaValidator';
import { LocationCell } from '../ui/LocationCell';
import { getServiceTypeBadge, getServiceTypeDisplay, getStatusDisplay, getStatusBadge } from '../../constants/emergency';
import { getVisit } from '../../services/visitsService';
import { toast } from 'sonner';

export const EmergencyRequestListView = ({
  requests,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  isMobile = false,
  selectedIds = [],
  onSelect,
  currentUser
}) => {
  const navigate = useNavigate();
  // Development schema validation
  if (process.env.NODE_ENV === 'development' && requests.length > 0) {
    validateDataSchema('emergency_requests', requests[0], 'EmergencyRequestListView');
  }
  const canManage = currentUser ? (currentUser.isAdmin() || currentUser.isOrgAdmin()) : false;
  const canDelete = currentUser ? (currentUser.isAdmin() || (typeof currentUser.isProvider === 'function' && currentUser.isProvider())) : false;

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
          <Card className={`squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-0 hover:shadow-md transition-shadow group flex items-center gap-4 ${selectedIds.includes(req.id) ? 'bg-primary/5 border-primary/20' : ''}`}>
            {/* Selection Checkbox */}
            {onSelect && (
              <Checkbox
                checked={selectedIds.includes(req.id)}
                onCheckedChange={() => onSelect(req.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            )}

            <div className="flex items-center gap-4 justify-between flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {req.patient_snapshot?.fullName || req.requester_name || req.patient_name || 'Unknown Requester'}
                  </h3>
                  <Badge className={`squircle-sm ${getServiceTypeBadge(req.service_type)} border-0 font-bold`}>
                    {getServiceTypeDisplay(req.service_type)}
                  </Badge>
                  <Badge className={`geo-sharp border-0 px-2.5 py-1 ${getStatusBadge(req.status)}`}>
                    {getStatusDisplay(req.status)}
                  </Badge>
                  {req.ambulance_id && (
                    <Badge className="geo-sharp-xs bg-blue-500/20 text-blue-500 border-0">
                      Auto
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="truncate">
                      {req.patient_snapshot?.phone || req.requester_phone || req.patient_phone || 'No contact info'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">
                      <LocationCell 
                        location={req.patient_location} 
                        pickupLocation={req.pickup_location}
                        responderLocation={req.responder_location}
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}</span>
                  </div>
                  {req.hospital_name && (
                    <div className="flex items-center gap-1">
                      <Hospital className="h-4 w-4" />
                      <span className="truncate">{req.hospital_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                {/* View Details */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(req)}
                  className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {/* View Clinical Record Action */}
                {(req.status === 'completed' || req.status === 'cancelled') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Fetch the actual visit data using the shared ID
                        const visitData = await getVisit(req.id);
                        if (visitData) {
                          // Navigate to Visits page with visit ID as parameter
                          navigate(`/visits?view=${visitData.id}`);
                        } else {
                          console.warn('No visit data found for emergency:', req.id);
                          // Show notification that no visit record exists
                          toast.warning('No clinical record found for this emergency request');
                        }
                      } catch (error) {
                        console.error('Error fetching visit data:', error);
                        toast.error('Failed to load clinical record');
                      }
                    }}
                    className="squircle h-8 w-8 p-0 hover:bg-info/10 hover:text-info"
                    title="View Clinical Record"
                  >
                    <Stethoscope className="h-4 w-4" />
                  </Button>
                )}

                {/* Dispatch Action */}
                {canManage && onDispatch && (req.status === 'pending' || (req.status === 'in_progress' && !req.ambulance_id)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDispatch(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-success/10 hover:text-success"
                    title="Dispatch Emergency"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}

                {/* Complete Action */}
                {canManage && onComplete && (req.status === 'accepted' || req.ambulance_id) && req.status !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onComplete(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-info/10 hover:text-info"
                    title="Mark as Completed"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Delete Request"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
