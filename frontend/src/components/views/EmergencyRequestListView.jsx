import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye, MapPin, Clock, CheckCheck, Send, Navigation, User, Hospital, Stethoscope, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import { validateDataSchema } from '../../utils/schemaValidator';
import { LocationCell } from '../ui/LocationCell';
import { getServiceTypeBadge, getServiceTypeDisplay, getStatusDisplay, getStatusBadge } from '../../constants/emergency';
import { getVisitByRequestId } from '../../services/visitsService';
import { toast } from 'sonner';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';

export const EmergencyRequestListView = ({
  requests,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  onProcessCash,
  onRetryPayment,
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
      {requests.map((req, index) => {
        const actionState = getEmergencyActionState(req);
        const renderProjection = buildEmergencyRenderProjection(req);
        return (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className={`rounded-card bg-background/35 shadow-sm p-4 hover:shadow-md transition-shadow group flex items-center gap-4 ${selectedIds.includes(req.id) ? 'bg-primary/5' : ''}`}>
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
                    {renderProjection.patientDisplay.name}
                  </h3>
                  <Badge className={`rounded-inner ${getServiceTypeBadge(req.service_type)} font-bold`}>
                    {getServiceTypeDisplay(req.service_type)}
                  </Badge>
                  <Badge className={`rounded-inner px-2.5 py-1 ${getStatusBadge(req.status)}`}>
                    {getStatusDisplay(req.status)}
                  </Badge>
                  {req.ambulance_id && (
                    <Badge className="rounded-inner bg-blue-500/20 text-blue-500">
                      Auto
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="truncate">
                      {renderProjection.patientDisplay.phone}
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
                      <span className="truncate">{renderProjection.facilityDisplay.name}</span>
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
                {actionState.showClinicalRecord && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const visitData = await getVisitByRequestId(req.id);
                        if (visitData) {
                          // Navigate to Visits page with visit ID as parameter
                          navigate(`/visits?view=${visitData.id}`);
                        } else {
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
                {canManage && onDispatch && actionState.canDispatch && (
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
                {canManage && onComplete && actionState.canComplete && (
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

                {/* Cash Payment Action */}
                {canManage && actionState.canProcessCash && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onProcessCash?.(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-yellow-500/10 hover:text-yellow-500"
                    title="Cash settlement is not ready here yet"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <circle cx="8" cy="8" r="6" />
                      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                      <path d="M7 6h1v4" />
                      <path d="m16.71 13.88.7.71-2.82 2.82" />
                    </svg>
                  </Button>
                )}

                {canManage && actionState.canRetryPayment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetryPayment?.(req)}
                    className="squircle h-8 w-8 p-0 hover:bg-warning/10 hover:text-warning"
                    title="Retry Payment"
                  >
                    <RefreshCw className="h-4 w-4" />
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
        );
      })}
    </motion.div>
  );
};
