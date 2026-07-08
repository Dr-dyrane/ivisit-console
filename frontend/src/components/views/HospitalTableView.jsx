import React from 'react';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Star, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown, Hospital, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const GRID_TEMPLATE = 'grid-cols-[40px_60px_minmax(90px,0.7fr)_minmax(150px,1.3fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_minmax(80px,0.5fr)_minmax(64px,0.4fr)_minmax(70px,0.5fr)_minmax(90px,0.6fr)_minmax(80px,0.5fr)_56px]';
const GRID_TEMPLATE_NO_SELECT = 'grid-cols-[60px_minmax(90px,0.7fr)_minmax(150px,1.3fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_minmax(80px,0.5fr)_minmax(64px,0.4fr)_minmax(70px,0.5fr)_minmax(90px,0.6fr)_minmax(80px,0.5fr)_56px]';

export const HospitalTableView = ({
  hospitals,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  canDelete = false,
  selectionEnabled = false,
  isMobile = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort
}) => {
  const { isAdmin, isOrgAdmin, isProvider } = useAuth();
  const canManage = isAdmin() || isOrgAdmin() || isProvider();
  const canSelect = selectionEnabled && canManage && Boolean(onSelect);
  const canDeleteRow = canDelete && canManage && Boolean(onDelete);

  const gridClass = canSelect ? GRID_TEMPLATE : GRID_TEMPLATE_NO_SELECT;

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'bg-green-500/18 text-green-600 dark:text-green-300';
      case 'rejected':
        return 'bg-rose-500/18 text-rose-600 dark:text-rose-300';
      case 'pending':
        return 'bg-blue-500/18 text-blue-600 dark:text-blue-300';
      case 'closed':
      case 'inactive':
        return 'bg-muted/45 text-muted-foreground';
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

  const SortableHead = ({ label, columnKey, className = "" }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : null;

    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
        onClick={() => onSort && onSort(columnKey)}
      >
        {label}
        {isSorted ? (
          direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="rounded-card bg-background/35 p-3 backdrop-blur-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Header row */}
            <div className={`grid ${gridClass} items-center gap-2 px-3 pb-3 pt-2`}>
              {canSelect && (
                <div className="flex items-center">
                  <Checkbox
                    checked={hospitals.length > 0 && selectedIds.length === hospitals.length}
                    onCheckedChange={onSelectAll}
                  />
                </div>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Image</span>
              <SortableHead label="ID" columnKey="display_id" />
              <SortableHead label="Name" columnKey="name" />
              <SortableHead label="Address" columnKey="address" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="Beds" columnKey="available_beds" />
              <SortableHead label="ICU" columnKey="icu_beds_available" />
              <SortableHead label="Fleet" columnKey="ambulances_count" />
              <SortableHead label="ER Wait" columnKey="emergency_wait_time_minutes" />
              <SortableHead label="Rating" columnKey="rating" />
              <span className="justify-self-end text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</span>
            </div>

            {/* Data rows */}
            {hospitals.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                No hospitals found.
              </div>
            ) : (
              hospitals.map((hospital, index) => {
                const selected = canSelect && selectedIds.includes(hospital.id);

                return (
                  <motion.div
                    key={hospital.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`group grid ${gridClass} items-center gap-2 rounded-inner px-3 py-3 transition-[background,transform] ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    onClick={() => isMobile && onView(hospital)}
                  >
                    {canSelect && (
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(hospital.id)}
                          onCheckedChange={() => onSelect(hospital.id)}
                        />
                      </div>
                    )}
                    {/* Image */}
                    <div className="flex items-center">
                      {hospital.image ? (
                        <div className="relative h-10 w-10 rounded-icon overflow-hidden bg-black/20">
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
                            <Hospital className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-icon bg-muted/20 flex items-center justify-center">
                          <Hospital className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    {/* ID */}
                    <div className="font-mono text-[10px] font-bold text-foreground/70 truncate">
                      {hospital.display_id || 'ORG-PENDING'}
                    </div>
                    {/* Name */}
                    <div className="font-bold text-sm truncate">{hospital.name || 'Unknown'}</div>
                    {/* Address */}
                    <div className="text-sm text-muted-foreground truncate">{hospital.address || '-'}</div>
                    {/* Status */}
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(hospital.verification_status || hospital.status)}`}>
                        {(hospital.verification_status || hospital.status)?.toUpperCase()}
                      </span>
                    </div>
                    {/* Beds */}
                    <div className="text-sm font-medium truncate">{`${hospital.available_beds || 0}/${hospital.total_beds || 0}`}</div>
                    {/* ICU */}
                    <div className="text-sm font-medium">{hospital.icu_beds_available || 0}</div>
                    {/* Fleet */}
                    <div className="text-sm font-medium">{hospital.ambulances_count || '0'}</div>
                    {/* ER Wait */}
                    <div className="text-sm font-medium truncate">{formatWaitTime(hospital.emergency_wait_time_minutes)}</div>
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold">{hospital.rating || 'N/A'}</span>
                    </div>
                    {/* Actions */}
                    <div className="justify-self-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-white/10 dark:hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70 backdrop-blur-xl shadow-sm">
                          <DropdownMenuItem onClick={() => onView(hospital)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(hospital)} className="cursor-pointer font-medium text-xs py-2">
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit Hospital
                              </DropdownMenuItem>
                              {onSchedule && (
                                <DropdownMenuItem onClick={() => onSchedule(hospital)} className="cursor-pointer font-medium text-xs py-2">
                                  <CalendarDays className="mr-2 h-3.5 w-3.5 text-violet-500" />
                                  Manage Schedule
                                </DropdownMenuItem>
                              )}
                              {canDeleteRow && (
                                <>
                                  <div className="my-1 h-1 rounded-pill bg-muted/20" aria-hidden="true" />
                                  <DropdownMenuItem onClick={() => onDelete(hospital)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
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
        </div>
      </div>
    </motion.div>
  );
};
