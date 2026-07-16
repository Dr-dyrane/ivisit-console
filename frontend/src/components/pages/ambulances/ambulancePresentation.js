import {
  Activity,
  AlertCircle,
  Ambulance,
  Clock,
  MapPin,
  PowerOff,
  Route,
  Undo2,
  Wrench,
} from 'lucide-react';

export const ambulanceToneClass = {
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  active: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  attention: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  muted: 'bg-muted/40 text-muted-foreground',
  danger: 'bg-destructive/12 text-destructive',
};

export const ambulanceStateOptions = [
  {
    id: 'all',
    label: 'Fleet',
    icon: Ambulance,
    colorClass: 'text-sky-600 dark:text-sky-200',
    activeClass: 'bg-sky-500/10 text-sky-800 shadow-e2 dark:text-sky-100',
  },
  {
    id: 'available',
    label: 'Ready',
    icon: MapPin,
    colorClass: 'text-emerald-600 dark:text-emerald-200',
    activeClass: 'bg-emerald-500/10 text-emerald-800 shadow-e2 dark:text-emerald-100',
  },
  {
    id: 'on_route',
    label: 'En route',
    icon: Route,
    colorClass: 'text-amber-600 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100',
  },
  {
    id: 'busy',
    label: 'Active',
    icon: Activity,
    colorClass: 'text-cyan-600 dark:text-cyan-200',
    activeClass: 'bg-cyan-500/10 text-cyan-800 shadow-e2 dark:text-cyan-100',
  },
  {
    id: 'maintenance',
    label: 'Service',
    icon: Wrench,
    colorClass: 'text-amber-600 dark:text-amber-200',
    activeClass: 'bg-amber-500/10 text-amber-800 shadow-e2 dark:text-amber-100',
  },
  // ADOPT-38: the dormant DB-domain states join the same selectPrimaryKpis
  // selection (no new pins; they surface data-driven or while active). Tones
  // mirror the shared status-pill vocabulary, which renders these muted.
  {
    id: 'returning',
    label: 'Returning',
    icon: Undo2,
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/40 text-foreground shadow-e2',
  },
  {
    id: 'offline',
    label: 'Offline',
    icon: PowerOff,
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/40 text-foreground shadow-e2',
  },
  {
    id: 'pending_approval',
    label: 'Pending',
    icon: Clock,
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/40 text-foreground shadow-e2',
  },
];

export const AMBULANCE_KPI_IMPORTANCE = {
  all: 0,
  available: 1,
  on_route: 2,
  busy: 3,
  maintenance: 4,
  pending_approval: 5,
  returning: 6,
  offline: 7,
};

export const PINNED_AMBULANCE_STATE_IDS = ['available', 'on_route'];

export const AMBULANCE_GRID_COLS = 'grid-cols-[minmax(160px,1.4fr)_minmax(96px,auto)_minmax(120px,1fr)_minmax(110px,auto)_minmax(96px,auto)_72px]';
export const AMBULANCE_GRID_COLS_SELECT = 'grid-cols-[28px_minmax(160px,1.4fr)_minmax(96px,auto)_minmax(120px,1fr)_minmax(110px,auto)_minmax(96px,auto)_72px]';

export const AMBULANCE_EMPTY_HEADINGS = {
  available: 'No ready units',
  on_route: 'No en-route units',
  busy: 'No active units',
  maintenance: 'No units in service review',
  returning: 'No returning units',
  offline: 'No offline units',
  pending_approval: 'No units pending approval',
};

const signalIcons = {
  error: AlertCircle,
  service: Wrench,
  active: Activity,
  ready: MapPin,
  fleet: Ambulance,
  pending: Clock,
  returning: Undo2,
  offline: PowerOff,
};

export const resolveAmbulanceSignal = (signal) => ({
  ...signal,
  icon: signalIcons[signal.iconKey] || Ambulance,
});
