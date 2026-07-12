import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hospital,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { useMapContext } from '../../contexts/MapContext';

const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'canceled', 'closed']);

const markerTitle = (marker) => marker?.data?.name
  || marker?.data?.call_sign
  || marker?.data?.display_id
  || (marker?.data?.id ? `#${String(marker.data.id).slice(0, 6)}` : 'Map record');

const markerLocation = (marker) => marker?.data?.location
  || marker?.data?.address
  || marker?.data?.hospital_name
  || 'Location label unavailable';

const formatTime = (value) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Metric = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-icon ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold">{value}</p>
      </div>
    </div>
  </div>
);

export const MapPanel = () => {
  const { mapData, setFilter, setSelectedMarker, recenterMap, refresh } = useMapContext();
  const {
    selectedMarker,
    emergencyRequests = [],
    ambulances = [],
    hospitals = [],
    filter: activeFilter = 'all',
    loading = false,
    error = null,
  } = mapData;
  const [panelNotice, setPanelNotice] = useState('Live map data is route-owned.');

  const visibleRequests = useMemo(() => (
    activeFilter === 'all'
      ? emergencyRequests
      : emergencyRequests.filter((request) => request.service_type === activeFilter)
  ), [activeFilter, emergencyRequests]);

  const activeRequests = useMemo(() => emergencyRequests.filter(
    (request) => !CLOSED_STATUSES.has(String(request.status || '').toLowerCase())
  ), [emergencyRequests]);

  const filters = useMemo(() => [
    { key: 'all', label: 'All', icon: Radio, count: emergencyRequests.length },
    { key: 'ambulance', label: 'Ambulance', icon: Ambulance, count: emergencyRequests.filter((request) => request.service_type === 'ambulance').length },
    { key: 'bed', label: 'Bed', icon: Hospital, count: emergencyRequests.filter((request) => request.service_type === 'bed').length },
    { key: 'critical_care', label: 'Critical care', icon: AlertTriangle, count: emergencyRequests.filter((request) => request.service_type === 'critical_care').length },
  ], [emergencyRequests]);

  const handleFilter = (filter) => {
    setFilter(filter.key);
    setPanelNotice(`${filter.label} requests shown on the map.`);
  };

  const handleRecenter = () => {
    recenterMap();
    setPanelNotice('Map recenter requested.');
  };

  const handleRefresh = async () => {
    setPanelNotice('Refreshing live map data.');
    await refresh();
    setPanelNotice('Live map refresh finished.');
  };

  if (loading && !emergencyRequests.length && !ambulances.length && !hospitals.length) {
    return (
      <div className="space-y-3 py-2" aria-label="Loading live map context">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}
      </div>
    );
  }

  if (selectedMarker) {
    const markerType = String(selectedMarker.type || 'record').replace('_', ' ');
    const markerStatus = selectedMarker.data?.status || selectedMarker.data?.priority || 'Status unavailable';
    return (
      <div className="space-y-4 py-2">
        <button
          type="button"
          onClick={() => setSelectedMarker(null)}
          className="flex h-10 w-full items-center gap-2 rounded-button bg-background/45 px-3 text-sm font-medium transition-colors hover:bg-foreground/10 active:scale-[0.98] dark:bg-white/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to live feed
        </button>

        <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium capitalize text-muted-foreground">{markerType}</p>
              <h3 className="mt-1 truncate text-base font-semibold">{markerTitle(selectedMarker)}</h3>
            </div>
          </div>
          <dl className="mt-4 space-y-2">
            <div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1 text-sm font-medium capitalize">{String(markerStatus).replace('_', ' ')}</dd>
            </div>
            <div className="rounded-inner bg-background/50 p-3 dark:bg-white/[0.04]">
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd className="mt-1 text-sm font-medium">{markerLocation(selectedMarker)}</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {error && (
        <div role="alert" className="rounded-inner bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-semibold">Live map data did not load.</p>
          <button type="button" onClick={handleRefresh} className="mt-2 inline-flex items-center gap-2 rounded-button bg-background/70 px-3 py-2 text-xs font-semibold active:scale-[0.98]">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Live scope</h3>
          <span className="rounded-pill bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">Route-owned</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric icon={AlertTriangle} label="Active requests" value={activeRequests.length} tone="bg-rose-500/10 text-rose-700 dark:text-rose-200" />
          <Metric icon={Ambulance} label="Fleet visible" value={ambulances.length} tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" />
          <Metric icon={Hospital} label="Hospitals visible" value={hospitals.length} tone="bg-sky-500/10 text-sky-700 dark:text-sky-200" />
          <Metric icon={CheckCircle2} label="Closed requests" value={emergencyRequests.length - activeRequests.length} tone="bg-violet-500/10 text-violet-700 dark:text-violet-200" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Map actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleRecenter} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-sm font-medium transition-colors hover:bg-foreground/10 active:scale-[0.98] dark:bg-white/[0.04]">
            <LocateFixed className="h-4 w-4 text-sky-700 dark:text-sky-200" /> Recenter
          </button>
          <button type="button" onClick={handleRefresh} aria-busy={loading ? 'true' : undefined} disabled={loading} data-state={loading ? 'pending' : 'ready'} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-sm font-medium transition-colors hover:bg-foreground/10 active:scale-[0.98] disabled:opacity-60 dark:bg-white/[0.04]">
            <RefreshCw className={`h-4 w-4 text-emerald-700 dark:text-emerald-200 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{panelNotice}</p>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Request filters</h3>
        <div className="grid grid-cols-2 gap-2">
          {filters.map(({ icon: Icon, ...filter }) => (
            <button key={filter.key} type="button" onClick={() => handleFilter(filter)} aria-pressed={activeFilter === filter.key} className={`flex min-h-[64px] items-center gap-3 rounded-inner p-3 text-left transition-colors active:scale-[0.98] ${activeFilter === filter.key ? 'bg-sky-500/12 text-sky-800 dark:text-sky-100' : 'bg-background/45 hover:bg-foreground/10 dark:bg-white/[0.04]'}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0"><span className="block truncate text-xs font-medium">{filter.label}</span><span className="mt-1 block text-sm font-semibold">{filter.count}</span></span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Live feed</h3>
          <span className="text-xs text-muted-foreground">Showing {Math.min(visibleRequests.length, 5)} of {visibleRequests.length}</span>
        </div>
        <div className="space-y-2">
          {!visibleRequests.length ? (
            <div className="rounded-inner bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground dark:bg-white/[0.04]">No requests in this filter.</div>
          ) : visibleRequests.slice(0, 5).map((request) => (
            <button key={request.id} type="button" onClick={() => setSelectedMarker({ type: 'emergency', data: request })} className="flex w-full items-center gap-3 rounded-inner bg-background/45 p-3 text-left transition-colors hover:bg-foreground/10 active:scale-[0.99] dark:bg-white/[0.04]">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-pill ${request.priority === 'critical' ? 'bg-destructive' : 'bg-sky-500'}`} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{request.display_id || request.service_type || `#${String(request.id).slice(0, 6)}`}</span><span className="mt-1 flex items-center gap-1 text-xs capitalize text-muted-foreground"><Clock className="h-3 w-3" />{String(request.status || 'Status pending').replace('_', ' ')} - {formatTime(request.created_at)}</span></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
