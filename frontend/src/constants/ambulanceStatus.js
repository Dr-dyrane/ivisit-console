// Single source of truth for the ambulance/fleet status vocabulary -- COLOR,
// LABEL, ICON, and the active-run set. The page (rows, rail, KPI), the context
// panel, and mobile all consume this so the fleet color coding CANNOT drift
// across surfaces. It drifted before this existed: the page and mobile colored
// `en_route` amber while the context panel colored it cyan -- the same unit read
// two different colors depending on where you looked (user: "color coding ...
// something we didn't get to harden"). Literal palette only -- the theme's
// --primary/--success/--warning/--info all resolve to RED.
import { Activity, Ambulance, MapPin, Wrench } from 'lucide-react';

// Statuses that mean "on an active run" (dispatch-owned). `en_route`/`on_route`
// are handled BEFORE this set in the tone/label lookups so they read as their
// own "En route" state, not the generic "Active".
export const ACTIVE_FLEET_STATUSES = new Set(['dispatched', 'on_trip', 'en_route', 'on_scene']);

export const getFleetStatus = (ambulance) => String(ambulance?.status || 'available').toLowerCase();

export const getAmbulanceStatusLabel = (status) => {
  if (status === 'available') return 'Ready';
  if (status === 'en_route' || status === 'on_route') return 'En route';
  if (status === 'dispatched') return 'Dispatched';
  if (status === 'on_trip') return 'On trip';
  if (status === 'on_scene') return 'On scene';
  if (status === 'returning') return 'Returning';
  if (status === 'maintenance') return 'Maintenance';
  if (status === 'offline') return 'Offline';
  if (status === 'pending_approval') return 'Pending';
  return status ? status.replace(/_/g, ' ') : 'Unknown';
};

// The canonical tone class (order matters -- `en_route` is amber even though it
// is also in ACTIVE_FLEET_STATUSES, because it is checked first).
export const getAmbulanceStatusToneClass = (status) => {
  if (status === 'available') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  if (status === 'en_route' || status === 'on_route') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (ACTIVE_FLEET_STATUSES.has(status) || status === 'busy') return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  if (status === 'maintenance') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'bg-muted/40 text-muted-foreground';
};

export const getAmbulanceStatusIcon = (status) => {
  if (status === 'available') return MapPin;
  if (status === 'maintenance' || status === 'offline') return Wrench;
  if (ACTIVE_FLEET_STATUSES.has(status)) return Activity;
  return Ambulance;
};
