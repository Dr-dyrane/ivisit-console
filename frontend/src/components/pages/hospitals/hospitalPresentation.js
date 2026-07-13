import { AlertCircle, Ambulance, Bed, Hospital, MapPin } from 'lucide-react';

export const hospitalStateOptions = [
  {
    id: 'all',
    label: 'All',
    icon: Hospital,
    countKey: 'total',
    tone: 'primary',
    colorClass: 'text-sky-600 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-e2 dark:text-sky-100',
  },
  {
    id: 'available',
    label: 'Available',
    icon: MapPin,
    countKey: 'available',
    tone: 'clear',
    colorClass: 'text-emerald-600 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-e2 dark:text-emerald-100',
  },
  {
    id: 'full',
    label: 'Full',
    icon: Bed,
    countKey: 'full',
    tone: 'warning',
    colorClass: 'text-amber-600 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100',
  },
  {
    id: 'busy',
    label: 'Busy',
    icon: Ambulance,
    countKey: 'busy',
    tone: 'info',
    colorClass: 'text-cyan-600 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-e2 dark:text-cyan-100',
  },
];

export const hospitalToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  info: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  muted: 'bg-muted/30 text-muted-foreground shadow-e2',
  danger: 'bg-destructive/14 text-destructive shadow-e2',
};

export const hospitalStatusPillClass = {
  available: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  full: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200',
  busy: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
};

export const hospitalStatusLabel = {
  available: 'Available',
  full: 'Full',
  busy: 'Busy',
};

export const hospitalStatusIcon = {
  available: MapPin,
  full: Bed,
  busy: Ambulance,
};

export const hospitalSignalIcon = {
  error: AlertCircle,
  all: Hospital,
  available: MapPin,
  full: Bed,
  busy: Ambulance,
};

export const HOSPITAL_VERIFICATION_ORDER = ['pending', 'verified'];

export const HOSPITAL_VERIFICATION_FILL = {
  pending: 'bg-amber-500',
  verified: 'bg-emerald-500',
};

export const HOSPITAL_GRID_COLS = 'grid-cols-[minmax(160px,1.4fr)_minmax(96px,auto)_minmax(56px,auto)_minmax(72px,auto)_minmax(96px,auto)_72px]';
export const HOSPITAL_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(160px,1.4fr)_minmax(96px,auto)_minmax(56px,auto)_minmax(72px,auto)_minmax(96px,auto)_72px]';
