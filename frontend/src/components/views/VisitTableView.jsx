import React from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Edit, Trash2, Eye, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown, User, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStandardizedPatient } from '../../utils/patientUtils';
import { getStandardizedHospital } from '../../utils/hospitalUtils';
import { visitRowProjection } from '../../utils/visitRowProjection';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(90px,0.7fr)_minmax(160px,1.4fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_minmax(90px,0.6fr)_minmax(80px,0.5fr)_minmax(150px,1.1fr)_minmax(110px,0.7fr)_64px]';
const GRID_TEMPLATE_NO_SELECT = 'grid-cols-[minmax(90px,0.7fr)_minmax(160px,1.4fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_minmax(90px,0.6fr)_minmax(80px,0.5fr)_minmax(150px,1.1fr)_minmax(110px,0.7fr)_64px]';

export const VisitTableView = ({
  visits,
  onView,
  onEdit,
  onDelete,
  onFocus,
  isMobile = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort,
  canEdit = false,
  canDelete = false,
  selectionEnabled = false
}) => {

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-500';
      case 'in_progress': return 'bg-orange-500/20 text-orange-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isAllSelected = selectionEnabled && visits.length > 0 && visits.every(v => selectedIds.includes(v.id));
  const isIndeterminate = selectionEnabled && visits.some(v => selectedIds.includes(v.id)) && !isAllSelected;

  const gridClass = selectionEnabled ? GRID_TEMPLATE : GRID_TEMPLATE_NO_SELECT;

  const SortableHead = ({ label, sortKey, className = "" }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = isSorted ? sortConfig.direction : null;

    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 font-semibold tracking-[0.14em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
        onClick={() => onSort && onSort(sortKey)}
      >
        {label}
        {isSorted ? (
          direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-card bg-background/30 overflow-hidden p-3">
        {/* Header row */}
        <div className={`grid ${gridClass} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
          {selectionEnabled && (
            <div className="flex items-center">
              <Checkbox
                checked={isAllSelected || (isIndeterminate ? "indeterminate" : false)}
                onCheckedChange={onSelectAll}
              />
            </div>
          )}
          <SortableHead label="Visit ID" sortKey="id" />
          <SortableHead label="Patient" sortKey="user_id" />
          <SortableHead label="Hospital" sortKey="hospital_id" />
          <SortableHead label="Status" sortKey="status" />
          <SortableHead label="Type" sortKey="visit_type" />
          <SortableHead label="Cost" sortKey="cost" />
          <SortableHead label="Location" sortKey="room_number" />
          <SortableHead label="Date" sortKey="date" />
          <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
        </div>

        {/* Data rows */}
        {visits.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No visits found.
          </div>
        ) : (
          visits.map((visit, index) => {
            const selected = selectionEnabled && selectedIds.includes(visit.id);
            const row = visitRowProjection(visit);
            return (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onFocus?.(visit)}
                className={`grid ${gridClass} items-center gap-2 rounded-inner px-3 py-3 cursor-pointer transition-colors ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
              >
                {selectionEnabled && (
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(visit.id)}
                      onCheckedChange={() => onSelect?.(visit.id)}
                    />
                  </div>
                )}
                {/* Visit ID */}
                <div className="font-mono text-xs font-bold text-muted-foreground truncate">
                  #{visit.id?.slice(0, 8)}
                </div>
                {/* Patient */}
                <div className="flex flex-col min-w-0">
                  {(() => {
                    const patient = getStandardizedPatient(visit);
                    return (
                      <>
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate">{row.patientName}</span>
                        </span>
                        {patient.email && patient.email !== 'No email' && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {patient.email}
                          </span>
                        )}
                        {(visit.doctor || visit.doctor_name) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Stethoscope className="w-3 h-3" />
                            <span className="truncate">{visit.doctor || visit.doctor_name || 'Unassigned'}</span>
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* Hospital (facility-first identity) */}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm truncate">{row.primary}</span>
                  {visit.room_number && (
                    <span className="text-xs text-muted-foreground">
                      Room {visit.room_number}
                    </span>
                  )}
                </div>
                {/* Status */}
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(row.statusKey)}`}>
                    {row.statusLabel}
                  </span>
                </div>
                {/* Type */}
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold bg-muted text-foreground/80">
                    {row.caption}
                  </span>
                </div>
                {/* Cost */}
                <div className="font-mono text-xs font-medium opacity-80">
                  {visit.cost || '-'}
                </div>
                {/* Location */}
                <div className="flex flex-col min-w-0">
                  {(() => {
                    const hospital = getStandardizedHospital(visit);
                    return (
                      <>
                        <span className="text-xs font-bold text-foreground/90 mb-0.5 truncate">{hospital.name}</span>
                        <div className="flex items-center gap-1.5">
                          {visit.room_number && (
                            <span className="inline-flex items-center rounded-pill bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                              {visit.room_number}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={hospital.address}>{hospital.address}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {/* Date */}
                <div className="text-sm truncate">
                  {formatDate(visit.date || visit.created_at)}
                </div>
                {/* Actions */}
                <div className="justify-self-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/80 shadow-sm">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onView(visit)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(visit)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Visit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuItem onClick={() => onDelete?.(visit)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
