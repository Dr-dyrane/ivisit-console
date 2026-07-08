import React from 'react';
import { Button } from '../ui/button';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';

const rowGridClass = 'grid grid-cols-[100px_minmax(170px,1.15fr)_minmax(140px,1fr)_minmax(140px,1fr)_74px_100px_96px_116px] items-center gap-3';

const normalizeStatusLabel = (status) => String(status || 'available').replace(/_/g, ' ');

export const DoctorTableView = ({
  doctors,
  onView,
  onEdit,
  onFocus,
  getStatusBadge,
  sortConfig,
  onSort,
  isMobile = false,
  canManage = false,
}) => {
  const gridClass = rowGridClass;

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/35" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3 text-sky-300" />
      : <ChevronDown className="ml-2 h-3 w-3 text-sky-300" />;
  };

  const SortableHead = ({ label, columnKey, className = '' }) => (
    <button
      type="button"
      className={`flex items-center text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      {label}
      <SortIcon columnKey={columnKey} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-sheet bg-background/45 p-3 shadow-[0_24px_80px_rgb(0_0_0/0.16)] backdrop-blur-xl dark:bg-white/[0.035]"
    >
      <div className={`${gridClass} px-4 pb-3 pt-2`}>
        <SortableHead label="ID" columnKey="display_id" />
        <SortableHead label="Name" columnKey="name" />
        <SortableHead label="Specialty" columnKey="specialization" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Facility</span>
        <SortableHead label="Years" columnKey="experience" />
        <SortableHead label="Status" columnKey="status" />
        <SortableHead label="Joined" columnKey="created_at" />
        <span className="text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</span>
      </div>

      <div className="space-y-2">
        {doctors.map((doctor, index) => {
          const name = doctor.name || 'Unknown staff';

          return (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onFocus?.(doctor)}
              className={`${gridClass} cursor-pointer rounded-inner px-4 py-3 transition-colors hover:bg-muted/28`}
            >
              <span className="truncate font-mono text-[11px] font-semibold text-sky-300/80">
                {doctor.display_id || '-'}
              </span>
              <span className="truncate font-semibold text-foreground">{name}</span>
              <span className="truncate text-muted-foreground">{doctor.specialization || 'General'}</span>
              <span className="truncate text-muted-foreground">{doctor.hospitals?.name || '-'}</span>
              <span className="font-medium">{doctor.experience || '0'}y</span>
              <span className={`inline-flex w-fit items-center rounded-pill px-3 py-1 text-[11px] font-semibold capitalize ${getStatusBadge(doctor.status)}`}>
                {normalizeStatusLabel(doctor.status)}
              </span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : '-'}
              </span>
              <span
                className="flex justify-end gap-2 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(doctor)}
                  className="h-8 w-8 rounded-pill bg-muted/24 text-muted-foreground transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
                  aria-label={`View details for ${name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(doctor)}
                      className="h-8 w-8 rounded-pill bg-muted/24 text-muted-foreground transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
                      aria-label={`Edit ${name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </span>
            </motion.div>
          );
        })}

        {doctors.length === 0 && (
          <div className="flex h-28 items-center justify-center rounded-inner bg-muted/22 text-sm font-medium text-muted-foreground">
            No staff found.
          </div>
        )}
      </div>
    </motion.div>
  );
};
