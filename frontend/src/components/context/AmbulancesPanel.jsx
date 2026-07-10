import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Ambulance,
  Activity,
  BarChart3,
  Filter,
  Plus,
  RefreshCw,
  Wrench,
} from 'lucide-react';
// Consume the shared fleet status vocabulary instead of a local tone map -- the
// panel used to color en_route CYAN while the page/mobile use AMBER, so the same
// unit read two colors. Sourcing from one place makes that drift impossible.
import { getAmbulanceStatusToneClass, getAmbulanceStatusLabel } from '../../constants/ambulanceStatus';

const emptyContext = {
  status: 'loading',
  loading: true,
  error: null,
  stats: {
    total: 0,
    available: 0,
    onRoute: 0,
    active: 0,
    maintenance: 0,
    visible: 0,
    totalCount: 0,
  },
  recent: [],
};

const contextStatusCopy = {
  loading: {
    title: 'Loading fleet',
    body: 'One moment while this page shares its fleet details.',
    icon: RefreshCw,
  },
  failed: {
    title: 'Details not ready',
    body: 'The fleet list needs to load before this panel can show details.',
    icon: AlertCircle,
  },
  empty: {
    title: 'No units found',
    body: 'Clear filters or add a unit when the fleet action is allowed.',
    icon: Ambulance,
  },
};

const readNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const dispatchPanelEvent = (eventName) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

const FleetMetric = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-inner p-3 ${tone}`}>
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-button bg-background/45">
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
  </div>
);

const PanelAction = ({ icon: Icon, label, onClick, tone = 'bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 dark:text-sky-200' }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-inner px-3 py-3 text-xs font-semibold transition-all ${tone}`}
  >
    <Icon className="h-5 w-5 transition-transform group-hover:scale-105" />
    <span>{label}</span>
  </motion.button>
);

export const AmbulancesPanel = ({ ambulanceContext }) => {
  const context = ambulanceContext || emptyContext;
  const stats = context.stats || emptyContext.stats;
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const contextState = context.status || (context.loading ? 'loading' : 'ready');
  const stateCopy = contextStatusCopy[contextState];

  const total = readNumber(stats.total || stats.totalCount);
  const ready = readNumber(stats.available);
  const active = readNumber(stats.active);
  const service = readNumber(stats.maintenance);
  const StateIcon = stateCopy?.icon;

  const handleCreateAmbulance = () => dispatchPanelEvent('openAmbulanceModal');
  const handleAnalytics = () => dispatchPanelEvent('openAnalyticsModal');
  const handleFilters = () => dispatchPanelEvent('openFilters');

  return (
    <div className="space-y-3">
      {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
      <section className="space-y-2">
        <div className="ml-1">
          <h3 className="text-[11px] font-semibold text-muted-foreground">Fleet context</h3>
          <p className="text-xs text-muted-foreground/80">From this page</p>
        </div>

        {stateCopy ? (
          <div className="rounded-card bg-muted/24 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-background/55 text-muted-foreground">
                <StateIcon className={`h-5 w-5 ${contextState === 'loading' ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{stateCopy.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{context.error || stateCopy.body}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-card surface-card p-4 shadow-[0_4px_12px_rgb(0_0_0/0.07)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-button bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                  <Ambulance className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ready} ready</p>
                  <p className="truncate text-xs text-muted-foreground">{total} fleet units</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-pill bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-200">
                Ready
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <FleetMetric
            icon={Activity}
            label="Active"
            value={active}
            tone="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
          />
          <FleetMetric
            icon={Wrench}
            label="Service"
            value={service}
            tone="bg-amber-500/10 text-amber-700 dark:text-amber-200"
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <PanelAction icon={Plus} label="Add unit" onClick={handleCreateAmbulance} />
        <PanelAction
          icon={BarChart3}
          label="Stats"
          onClick={handleAnalytics}
          tone="bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/15 dark:text-cyan-200"
        />
        <PanelAction
          icon={Filter}
          label="Filter"
          onClick={handleFilters}
          tone="bg-muted/28 text-muted-foreground hover:bg-muted/40"
        />
      </section>

      <section className="space-y-2">
        <h3 className="ml-1 text-[11px] font-semibold text-muted-foreground">Fleet list</h3>
        <div className="space-y-1">
          {recent.map((unit) => {
            const status = unit.status || 'available';
            const tone = getAmbulanceStatusToneClass(status);

            return (
              <div
                key={unit.id}
                className="flex items-center justify-between gap-3 rounded-inner bg-muted/22 p-3 transition-colors hover:bg-muted/34"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-button ${tone}`}>
                    <Ambulance className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {unit.call_sign || 'Unknown unit'}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {unit.vehicle_number || unit.license_plate || unit.station || 'No vehicle'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                  {unit.statusLabel || getAmbulanceStatusLabel(status)}
                </span>
              </div>
            );
          })}

          {recent.length === 0 && !stateCopy && (
            <div className="rounded-inner bg-muted/22 py-6 text-center text-xs text-muted-foreground">
              No units in this view
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
