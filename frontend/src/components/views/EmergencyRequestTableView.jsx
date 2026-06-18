import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye, Send, CheckCheck, ArrowUpDown, ChevronUp, ChevronDown, Stethoscope, Clock, RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { LocationCell } from '../ui/LocationCell';
import { getServiceTypeBadge, getServiceTypeDisplay, getStatusDisplay, getStatusBadge } from '../../constants/emergency';
import { getVisitByRequestId } from '../../services/visitsService';
import { toast } from 'sonner';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import { buildEmergencyRenderProjection, isCashPaymentMethod } from '../../utils/emergencyRequestMapper';

export const EmergencyRequestTableView = ({
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
  onSelectAll,
  sortConfig,
  onSort,
  currentUser
}) => {
  const navigate = useNavigate();
  const canManage = currentUser ? (currentUser.isAdmin() || currentUser.isOrgAdmin()) : false;
  const canDelete = currentUser ? (currentUser.isAdmin() || (typeof currentUser.isProvider === 'function' && currentUser.isProvider())) : false;

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3 text-primary" />
      : <ChevronDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <TableHead
      className={`font-bold uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={requests.length > 0 && selectedIds.length === requests.length}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <SortableHead label="Requester" columnKey="requester_name" />
              <SortableHead label="Service Type" columnKey="service_type" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="Contact" columnKey="requester_phone" />
              <SortableHead label="Location" columnKey="patient_location" />
              <SortableHead label="Hospital" columnKey="hospital_name" />
              <SortableHead label="Payment" columnKey="payment_status" />
              <SortableHead label="Time" columnKey="created_at" />
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req, index) => {
              const actionState = getEmergencyActionState(req);
              const renderProjection = buildEmergencyRenderProjection(req);
              return (
              <motion.tr
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`border-b border-white/10 hover:bg-white/5 transition-colors group ${selectedIds.includes(req.id) ? 'bg-primary/5' : ''}`}
                onClick={() => isMobile && onView(req)}
              >
                <TableCell className="w-[50px]">
                  <Checkbox
                    checked={selectedIds.includes(req.id)}
                    onCheckedChange={() => onSelect(req.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell className="font-bold">{renderProjection.patientDisplay.name}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getServiceTypeBadge(req.service_type)} border-0 font-bold`}>
                    {getServiceTypeDisplay(req.service_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={`squircle-sm border-0 font-bold ${getStatusBadge(req.status)}`}>
                      {getStatusDisplay(req.status)}
                    </Badge>
                    {req.ambulance_id && (
                      <Badge className="squircle-xs bg-blue-500/20 text-blue-500 border-0">
                        Auto
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{renderProjection.patientDisplay.phone}</TableCell>
                <TableCell className="text-sm">
                  <LocationCell
                    location={req.patient_location}
                    pickupLocation={req.pickup_location}
                    responderLocation={req.responder_location}
                  />
                </TableCell>
                <TableCell className="text-sm">{renderProjection.facilityDisplay.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Badge className={`squircle-xs border-0 font-bold ${isCashPaymentMethod(req.payment_method) ? 'bg-yellow-500/20 text-yellow-600' : 'bg-blue-500/20 text-blue-600'}`}>
                        {renderProjection.paymentDisplay.methodLabel}
                      </Badge>
                      {req.payment_status === 'completed' ? (
                        <CheckCheck className="h-3 w-3 text-success" />
                      ) : (
                        <Clock className="h-3 w-3 text-warning" />
                      )}
                    </div>
                    {req.total_cost && (
                      <span className="text-[10px] font-bold text-muted-foreground ml-1">
                        {renderProjection.paymentDisplay.amountLabel}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {req.created_at ? new Date(req.created_at).toLocaleString() : 'No time'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className={`flex justify-end pr-2 opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                        <DropdownMenuItem onClick={() => onView(req)} className="cursor-pointer font-medium text-xs py-2">
                          <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          View Details
                        </DropdownMenuItem>

                        {/* View Clinical Record Action */}
                        {actionState.showClinicalRecord && (
                          <DropdownMenuItem
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
                            className="cursor-pointer font-medium text-xs py-2 text-info focus:text-info focus:bg-info/10"
                          >
                            <Stethoscope className="mr-2 h-3.5 w-3.5" />
                            Clinical Record
                          </DropdownMenuItem>
                        )}

                        {/* Dispatch Action */}
                        {canManage && onDispatch && actionState.canDispatch && (
                          <DropdownMenuItem onClick={() => onDispatch(req)} className="cursor-pointer font-medium text-xs py-2 text-success focus:text-success focus:bg-success/10">
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Dispatch
                          </DropdownMenuItem>
                        )}

                        {/* Complete Action */}
                        {canManage && onComplete && actionState.canComplete && (
                          <DropdownMenuItem onClick={() => onComplete(req)} className="cursor-pointer font-medium text-xs py-2 text-info focus:text-info focus:bg-info/10">
                            <CheckCheck className="mr-2 h-3.5 w-3.5" />
                            Complete
                          </DropdownMenuItem>
                        )}

                        {/* Cash Payment Action */}
                        {canManage && actionState.canProcessCash && (
                          <DropdownMenuItem
                            onClick={() => {
                              if (window.confirm(`Process cash payment for this request? This will deduct the 2.5% platform fee from your organization's wallet.`)) {
                                onProcessCash?.(req);
                              }
                            }}
                            className="cursor-pointer font-medium text-xs py-2 text-yellow-500 focus:text-yellow-500 focus:bg-yellow-500/10"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <circle cx="8" cy="8" r="6" />
                              <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                              <path d="M7 6h1v4" />
                              <path d="m16.71 13.88.7.71-2.82 2.82" />
                            </svg>
                            Process Cash
                          </DropdownMenuItem>
                        )}

                        {canManage && actionState.canRetryPayment && (
                          <DropdownMenuItem
                            onClick={() => onRetryPayment?.(req)}
                            className="cursor-pointer font-medium text-xs py-2 text-warning focus:text-warning focus:bg-warning/10"
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Retry Payment
                          </DropdownMenuItem>
                        )}

                        {canDelete && (
                          <>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => onDelete(req)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};
