import React from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Edit, Trash2, Eye, ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(120px,1fr)_minmax(96px,0.7fr)_minmax(110px,0.8fr)_minmax(96px,0.7fr)_minmax(72px,0.5fr)_minmax(150px,1.2fr)_64px]';
const GRID_TEMPLATE_NO_SELECT = 'grid-cols-[minmax(120px,1fr)_minmax(96px,0.7fr)_minmax(110px,0.8fr)_minmax(96px,0.7fr)_minmax(72px,0.5fr)_minmax(150px,1.2fr)_64px]';

export const AmbulanceTableView = ({
  ambulances,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  onSchedule,
  canDelete = false,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort,
  isMobile = false
}) => {

  const handleSelectAll = (checked) => {
    if (onSelectAll) onSelectAll(checked);
  };

  const handleSelectOne = (id, checked) => {
    if (onSelect) onSelect(id, checked);
  };

  const selectedCountOnPage = ambulances.filter(a => selectedIds.includes(a.id)).length;
  const isAllSelected = ambulances.length > 0 && selectedCountOnPage === ambulances.length;
  const isIndeterminate = selectedCountOnPage > 0 && selectedCountOnPage < ambulances.length;
  const getStationLabel = (ambulance) => (
    ambulance.hospital
    || ambulance.hospital_name
    || ambulance.station_name
    || 'Station not assigned'
  );

  const gridClass = selectionEnabled ? GRID_TEMPLATE : GRID_TEMPLATE_NO_SELECT;

  const SortableHead = ({ label, columnKey, className = "" }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : null;

    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
        onClick={() => onSort && onSort(columnKey)}
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="rounded-card bg-background/30 overflow-hidden p-3">
        {/* Header row */}
        <div className={`grid ${gridClass} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
          {selectionEnabled && (
            <div className="flex items-center">
              <Checkbox
                checked={isAllSelected || (isIndeterminate ? "indeterminate" : false)}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </div>
          )}
          <SortableHead label="Unit" columnKey="call_sign" />
          <SortableHead label="Type" columnKey="type" />
          <SortableHead label="Vehicle" columnKey="vehicle_number" />
          <SortableHead label="Status" columnKey="status" />
          <SortableHead label="ETA" columnKey="eta" />
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Station</span>
          <span className="justify-self-end font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</span>
        </div>

        {/* Data rows */}
        {ambulances.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No ambulances found.
          </div>
        ) : (
          ambulances.map((ambulance, index) => {
            const isSelected = selectionEnabled && selectedIds.includes(ambulance.id);
            return (
              <motion.div
                key={ambulance.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`group grid ${gridClass} items-center gap-2 rounded-inner px-3 py-3 transition-colors ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
              >
                {selectionEnabled && (
                  <div className="flex items-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(ambulance.id, checked)}
                      aria-label={`Select ${ambulance.call_sign}`}
                    />
                  </div>
                )}
                {/* Unit */}
                <div className="font-bold truncate">{ambulance.call_sign || 'Unknown'}</div>
                {/* Type */}
                <div className="truncate">{ambulance.type || 'Standard'}</div>
                {/* Vehicle */}
                <div className="text-muted-foreground truncate">{ambulance.vehicle_number || '-'}</div>
                {/* Status */}
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(ambulance.status)}`}>
                    {ambulance.status}
                  </span>
                </div>
                {/* ETA */}
                <div className="font-medium truncate">{ambulance.eta || 'N/A'}</div>
                {/* Station */}
                <div className="text-muted-foreground truncate">{getStationLabel(ambulance)}</div>
                {/* Actions */}
                <div className="justify-self-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-muted/40 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/80 shadow-sm">
                      <DropdownMenuItem onClick={() => onView(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                        <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        Edit Unit
                      </DropdownMenuItem>
                      {onSchedule && (
                        <DropdownMenuItem onClick={() => onSchedule(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                          <CalendarDays className="mr-2 h-3.5 w-3.5 text-violet-500" />
                          Schedule Crew
                        </DropdownMenuItem>
                      )}
                      {canDelete && onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(ambulance)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
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
