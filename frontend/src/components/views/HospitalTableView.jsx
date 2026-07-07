import React from 'react';
import { Badge } from '../ui/badge';
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

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'bg-green-500/18 text-green-600 dark:text-green-300';
      case 'rejected':
        return 'bg-red-500/18 text-red-600 dark:text-red-300';
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

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3 text-primary" />
      : <ChevronDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <th
      className={`h-10 px-2 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="overflow-hidden rounded-card bg-background/35 shadow-premium backdrop-blur-xs">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="bg-muted/18">
              <tr className="shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.05)]">
                {canSelect && (
                  <th className="h-10 w-[50px] px-2 text-left align-middle font-normal text-muted-foreground">
                    <Checkbox
                      checked={hospitals.length > 0 && selectedIds.length === hospitals.length}
                      onCheckedChange={onSelectAll}
                    />
                  </th>
                )}
                <th className="h-10 w-[60px] px-2 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Image</th>
                <SortableHead label="ID" columnKey="display_id" />
                <SortableHead label="Name" columnKey="name" />
                <SortableHead label="Address" columnKey="address" />
                <SortableHead label="Status" columnKey="status" />
                <SortableHead label="Beds" columnKey="available_beds" />
                <SortableHead label="ICU" columnKey="icu_beds_available" />
                <SortableHead label="Fleet" columnKey="ambulances_count" />
                <SortableHead label="ER Wait" columnKey="emergency_wait_time_minutes" />
                <SortableHead label="Rating" columnKey="rating" />
                <th className="h-10 px-2 pr-6 text-right align-middle text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((hospital, index) => (
                <motion.tr
                  key={hospital.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.045)] transition-[background,box-shadow] hover:bg-white/5 ${canSelect && selectedIds.includes(hospital.id) ? 'bg-primary/5' : ''}`}
                  onClick={() => isMobile && onView(hospital)}
                >
                  {canSelect && (
                    <td className="w-[50px] p-2 align-middle">
                      <Checkbox
                        checked={selectedIds.includes(hospital.id)}
                        onCheckedChange={() => onSelect(hospital.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td className="w-[60px] p-2 align-middle">
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
                  </td>
                  <td className="p-2 align-middle font-mono text-[10px] font-bold text-primary/80">
                    {hospital.display_id || 'ORG-PENDING'}
                  </td>
                  <td className="p-2 align-middle font-bold">{hospital.name || 'Unknown'}</td>
                  <td className="max-w-[200px] truncate p-2 align-middle text-muted-foreground">{hospital.address || '-'}</td>
                  <td className="p-2 align-middle">
                    <Badge className={`squircle-sm ${getStatusBadge(hospital.verification_status || hospital.status)} font-bold`}>
                      {(hospital.verification_status || hospital.status)?.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-2 align-middle font-medium">{`${hospital.available_beds || 0}/${hospital.total_beds || 0}`}</td>
                  <td className="p-2 align-middle font-medium">{hospital.icu_beds_available || 0}</td>
                  <td className="p-2 align-middle font-medium">{hospital.ambulances_count || '0'}</td>
                  <td className="p-2 align-middle font-medium">{formatWaitTime(hospital.emergency_wait_time_minutes)}</td>
                  <td className="p-2 align-middle">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="font-bold">{hospital.rating || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end pr-2 opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-white/10 dark:hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70 backdrop-blur-xl shadow-premium">
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
                                  <CalendarDays className="mr-2 h-3.5 w-3.5 text-purple-500" />
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
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
