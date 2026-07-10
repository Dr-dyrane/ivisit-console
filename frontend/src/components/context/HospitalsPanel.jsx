import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bed,
  Filter,
  Hospital,
  Loader2,
  MapPin,
  Phone,
  Plus
} from 'lucide-react';

const toCount = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const statusTone = {
  available: {
    label: 'Available',
    iconClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
  busy: {
    label: 'Busy',
    iconClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    chipClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  },
  full: {
    label: 'Full',
    iconClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  },
  inactive: {
    label: 'Inactive',
    iconClass: 'bg-muted/40 text-muted-foreground',
    chipClass: 'bg-muted/40 text-muted-foreground',
  },
};

const getStatusTone = (status) => statusTone[status] || statusTone.available;

const getFacilityTitle = (hospital) => (
  hospital?.name ||
  hospital?.facility_name ||
  (hospital?.id ? `Facility ${String(hospital.id).slice(0, 4)}` : 'Facility record')
);

const getFacilityLocation = (hospital) => (
  hospital?.city ||
  hospital?.address ||
  hospital?.state ||
  'Location not set'
);

export const HospitalsPanel = ({ hospitalContext }) => {
  const context = hospitalContext || {};
  const stats = context.stats || {};
  const recent = Array.isArray(context.recent) ? context.recent : [];
  const hasContext = Boolean(hospitalContext);
  const loading = Boolean(context.loading) || !hasContext;
  const total = toCount(stats.total ?? context.count, recent.length);
  const available = toCount(stats.available, 0);
  const full = toCount(stats.full, 0);
  // Deny-by-default context gating (EmergencyPanel recipe): the page publishes
  // canAdd -- honor it instead of a cosmetically-disabled-but-live button.
  const canAdd = context.canAdd === true;
  const errorMessage = context.errorMessage;
  const contactPhone = context.focusedHospital?.phone || null;
  const [panelNotice, setPanelNotice] = React.useState('Facility actions ready.');

  React.useEffect(() => {
    if (errorMessage) {
      setPanelNotice('Facilities did not fully refresh. The page can retry.');
    }
  }, [errorMessage]);

  const handleAddFacility = () => {
    if (!canAdd) {
      setPanelNotice('Add facility is unavailable.');
      return;
    }
    setPanelNotice('Opening facility form.');
    window.dispatchEvent(new CustomEvent('openHospitalModal'));
  };

  const handleOpenAnalytics = () => {
    setPanelNotice('Opening facility statistics.');
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  const handleOpenFilters = () => {
    setPanelNotice('Opening filters.');
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleContact = () => {
    if (!contactPhone) {
      setPanelNotice('Focus a facility with a phone number to call it.');
      return;
    }
    setPanelNotice(`Calling ${contactPhone}.`);
    window.location.href = `tel:${contactPhone}`;
  };

  return (
    <div className="space-y-3">
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="space-y-3"
        aria-label="Facilities overview"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Facilities overview
        </p>

        <div className="rounded-sheet bg-sky-500/10 p-4 text-sky-900 shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/75 dark:text-sky-100/70">
                Current route scope
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
                {loading ? '...' : total}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {total === 1 ? 'Facility in this view' : 'Facilities in this view'}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-background/55 text-sky-700 dark:text-sky-200">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hospital className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-inner bg-emerald-500/10 p-3 text-emerald-800 shadow-e2 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/55">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : available}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Available
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-inner bg-amber-500/10 p-3 text-amber-800 shadow-e2 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/55">
                <Bed className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-normal text-foreground">
                  {loading ? '...' : full}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Full
                </span>
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-2" aria-label="Panel actions">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Panel actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddFacility}
            disabled={!canAdd}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-inner bg-sky-500/10 px-3 text-sky-700 shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-sky-200"
            title={canAdd ? 'Add facility' : 'Add facility is unavailable'}
            aria-disabled={!canAdd}
            data-state={canAdd ? 'idle' : 'unavailable'}
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Add</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAnalytics}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-inner bg-cyan-500/10 px-3 text-cyan-700 shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-cyan-500/15 dark:text-cyan-200"
            title="View facility statistics"
          >
            <BarChart3 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Stats</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenFilters}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-inner bg-muted/34 px-3 text-muted-foreground shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-muted/44 hover:text-foreground"
            title="Filter facilities"
          >
            <Filter className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Filter</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContact}
            disabled={!contactPhone}
            className="group flex min-h-[68px] items-center justify-center gap-3 rounded-inner bg-muted/24 px-3 text-muted-foreground shadow-e2 transition-[background,box-shadow,transform] duration-200 hover:bg-muted/34 disabled:cursor-not-allowed disabled:opacity-55"
            title={contactPhone ? `Call ${contactPhone}` : 'Focus a facility with a phone number to call it'}
            aria-disabled={!contactPhone}
            data-state={contactPhone ? 'idle' : 'unavailable'}
          >
            <Phone className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Contact</span>
          </motion.button>
        </div>
        <p className="px-1 text-xs font-medium text-muted-foreground" role="status" aria-live="polite">
          {panelNotice}
        </p>
      </section>

      <section className="space-y-2" aria-label="Current list">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Current list
        </p>

        <div className="space-y-2">
          {recent.map((hospital, index) => {
            const tone = getStatusTone(hospital?.status);

            return (
              <motion.div
                key={hospital?.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group rounded-inner bg-background/46 p-3 shadow-[0_12px_36px_rgb(0_0_0/0.10)] transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-muted/36"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon transition-transform duration-200 group-hover:scale-105 ${tone.iconClass}`}>
                      <Hospital className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">
                        {getFacilityTitle(hospital)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {getFacilityLocation(hospital)}
                      </span>
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-pill px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.chipClass}`}>
                    {tone.label}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {!loading && recent.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              No facilities in the current view.
            </div>
          )}

          {loading && recent.length === 0 && (
            <div className="rounded-inner bg-muted/24 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
              Loading facilities.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
