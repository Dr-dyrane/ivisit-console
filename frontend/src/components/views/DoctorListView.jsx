import React from 'react';
import { Button } from '../ui/button';
import { Edit, Eye, Hospital, Phone, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

const normalizeStatusLabel = (status) => String(status || 'available').replace(/_/g, ' ');

export const DoctorListView = ({
  doctors,
  onView,
  onEdit,
  getStatusBadge,
  isMobile = false,
  canManage = false,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-2"
  >
    {doctors.map((doctor, index) => {
      const name = doctor.name || 'Unknown staff';
      const statusClass = getStatusBadge(doctor.status);

      return (
        <motion.article
          key={doctor.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
          className="group rounded-[28px] bg-background/45 p-4 shadow-sm backdrop-blur-xl transition-all hover:bg-background/62 hover:shadow-[0_18px_56px_rgba(0,0,0,0.12)] dark:bg-white/[0.035]"
        >
          <div className="flex items-center gap-4 justify-between">
            <button
              type="button"
              onClick={() => onView(doctor)}
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
              aria-label={`View details for ${name}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-400/12 text-sky-300">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-lg font-semibold text-foreground transition-colors group-hover:text-sky-300">
                    {name}
                  </span>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusClass}`}>
                    {normalizeStatusLabel(doctor.status)}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {doctor.specialization || 'General'} | {doctor.hospitals?.name || 'No facility'} | {doctor.experience || '0'} years
                </span>
              </span>
            </button>

            <div className={`flex shrink-0 gap-2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} transition-opacity`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(doctor)}
                className="h-9 w-9 rounded-full bg-muted/24 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
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
                    className="h-9 w-9 rounded-full bg-muted/24 text-muted-foreground shadow-sm transition-all hover:bg-sky-400/10 hover:text-sky-300 active:scale-95"
                    aria-label={`Edit ${name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ListDetail icon={Hospital} label="Facility" value={doctor.hospitals?.name || 'No facility'} />
            <ListDetail icon={Phone} label="Contact" value={doctor.phone || 'No phone'} />
          </div>
        </motion.article>
      );
    })}
  </motion.div>
);

const ListDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[20px] bg-muted/22 p-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-background/42 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value}</span>
    </span>
  </div>
);
