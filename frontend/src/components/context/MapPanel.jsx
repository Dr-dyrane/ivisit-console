import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { useMapContext } from '../../contexts/MapContext';
import {
  AlertTriangle,
  Ambulance,
  Map,
  Zap,
  Clock,
  CheckCircle,
  Radio,
  MapPin,
  Phone,
  Hospital,
  ArrowLeft,
  ChevronRight,
  User,
  Settings,
  Filter,
  Navigation,
  Shield,
  Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const MapPanel = ({ emergencyStats }) => {
  const { mapData, setFilter, setSelectedMarker, recenterMap } = useMapContext();
  const { selectedMarker, emergencyRequests, filter: activeFilter } = mapData;

  // Command Center State
  const [realTimeTracking, setRealTimeTracking] = useState(true);
  const [autoRecenter, setAutoRecenter] = useState(false); // PULLBACK NOTE: Added auto-recenter state
  const [alertRadius, setAlertRadius] = useState(5); // PULLBACK NOTE: Added alert radius state
  const [mapStyle, setMapStyle] = useState('standard'); // PULLBACK NOTE: Added map style state

  // Filter Logic for List
  // PULLBACK NOTE: Changed filter logic to match new emergency schema
  // OLD: req.priority === activeFilter
  // NEW: req.service_type === activeFilter
  const filteredList = React.useMemo(() => {
    if (activeFilter === 'all') return emergencyRequests;
    return emergencyRequests.filter(req => req.service_type === activeFilter);
  }, [emergencyRequests, activeFilter]);

  // PULLBACK NOTE: Updated emergency filters to use new service types
  // OLD: Used priority-based filters (pending, dispatched, en_route)
  // NEW: Uses service_type filters (ambulance, bed, critical_care)
  const emergencyFilters = [
    { key: 'all', label: 'All', icon: Radio, count: emergencyRequests?.length || 0 },
    { key: 'ambulance', label: 'Ambulance', icon: Ambulance, count: emergencyRequests?.filter(req => req.service_type === 'ambulance').length || 0 },
    { key: 'bed', label: 'Bed', icon: Hospital, count: emergencyRequests?.filter(req => req.service_type === 'bed').length || 0 },
    { key: 'critical_care', label: 'Critical Care', icon: AlertTriangle, count: emergencyRequests?.filter(req => req.service_type === 'critical_care').length || 0 }
  ].filter(filter => emergencyRequests && emergencyRequests.length > 0 ? true : filter.key === 'all');

  const handleRecenterAll = () => {
    recenterMap();
  };

  // ... rest of the code remains the same ...
  const handleExportMapData = () => {
    const mapDataExport = {
      timestamp: new Date().toISOString(),
      emergencyRequests,
      selectedMarker,
      activeFilter,
      settings: {
        realTimeTracking,
        autoRecenter,
        alertRadius,
        mapStyle
      }
    };

    const blob = new Blob([JSON.stringify(mapDataExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- INSPECTOR VIEW (Selected Marker) ---
  if (selectedMarker) {
    return (
      <div className="space-y-6 max-h-screen overflow-y-auto no-scrollbar">
        {/* Back Navigation */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedMarker(null)}
          className="w-full justify-start"
          title="Return to emergency list view"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Live Feed
        </Button>

        {/* Selected Marker Details */}
        <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 px-0 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
          <div className={`h-24 relative flex items-center justify-center mb-6 ${selectedMarker.type === "emergency" ? "bg-destructive/20" :
            selectedMarker.type === "ambulance" ? "bg-emerald-500/20" : "bg-sky-500/20"
            }`}>
            {selectedMarker.type === "emergency" && <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />}
            {selectedMarker.type === "ambulance" && <Ambulance className="h-12 w-12 text-emerald-600 opacity-50 dark:text-emerald-300" />}
            {selectedMarker.type === "hospital" && <Hospital className="h-12 w-12 text-sky-600 opacity-50 dark:text-sky-300" />}
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="mb-2 inline-flex rounded-pill bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {selectedMarker.type}
                </span>
                <h2 className="text-2xl font-bold leading-tight">
                  {selectedMarker.data.name || selectedMarker.data.call_sign || `#${selectedMarker.data.id?.slice(0, 6)}`}
                </h2>
              </div>
            </div>

            {/* Type-Specific Details */}
            {selectedMarker.type === "emergency" && (
              <div className="space-y-6 mt-6">
                <div className="flex gap-2">
                  <span className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${selectedMarker.data.priority === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-sky-500/10 text-sky-700 dark:text-sky-200'
                    }`}>
                    {selectedMarker.data.priority?.toUpperCase()}
                  </span>
                  <span className="inline-flex rounded-pill bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                    {selectedMarker.data.status}
                  </span>
                </div>

                <div className="p-3 bg-muted/30 rounded-inner space-y-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-normal leading-snug">
                        {selectedMarker.data.location || "Coordinates Received"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedMarker.data.lat?.toFixed(4)}, {selectedMarker.data.lng?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full rounded-button gap-2" title="Contact emergency location">
                    <Phone className="h-4 w-4" /> Contact
                  </Button>
                  <Button variant="outline" className="w-full rounded-button gap-2" title="Navigate to emergency location">
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
              </div>
            )}

            {selectedMarker.type === "ambulance" && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-inner space-y-2">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-normal leading-snug">
                        {selectedMarker.data.call_sign || "Ambulance Unit"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {selectedMarker.data.status || "Active"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full rounded-button gap-2" title="Call ambulance unit directly">
                    <Phone className="h-4 w-4" /> Call Unit
                  </Button>
                  <Button variant="outline" className="w-full rounded-button gap-2" title="Track ambulance unit location">
                    <Navigation className="h-4 w-4" /> Track
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // --- DEFAULT COMMAND CENTER VIEW ---
  return (
    <div className="p-4 px-0 space-y-6 max-h-screen overflow-y-auto no-scrollbar">
      {/* Map Controls */}
      <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-bold text-sm">Map Controls</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Real-time Tracking</span>
            <Switch
              checked={realTimeTracking}
              onCheckedChange={setRealTimeTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auto Recenter</span>
            <Switch
              checked={autoRecenter}
              onCheckedChange={setAutoRecenter}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-normal">Alert Radius (km)</label>
            <Input
              type="number"
              value={alertRadius}
              onChange={(e) => setAlertRadius(parseInt(e.target.value) || 5)}
              placeholder="Alert radius in kilometers"
              className="h-8"
            />
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          <h3 className="font-bold text-sm">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card
            onClick={handleRecenterAll}
            className="cursor-pointer transition-all hover:shadow-md bg-muted/20 hover:bg-muted/30 p-4 rounded-inner text-center"
            title="Recenter map to show all emergency locations"
          >
            <div className="flex flex-col gap-2">
              <Navigation className="h-4 w-4 mx-auto text-muted-foreground" />
              <span className="text-sm font-normal">Recenter Map</span>
            </div>
          </Card>
          <Card
            onClick={handleExportMapData}
            className="cursor-pointer transition-all hover:shadow-md bg-muted/20 hover:bg-muted/30 p-4 rounded-inner text-center"
            title="Export map data and settings to JSON file"
          >
            <div className="flex flex-col gap-2">
              <Filter className="h-4 w-4 mx-auto text-muted-foreground" />
              <span className="text-sm font-normal">Export Data</span>
            </div>
          </Card>
        </div>
      </Card>

      {/* Live Statistics */}
      <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          <h3 className="font-bold text-sm">Live Statistics</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold tracking-tight">
                  {(emergencyStats?.critical || 0) + (emergencyStats?.pending || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-inner">
            <div className="flex items-center gap-2">
              <Ambulance className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-bold tracking-tight">
                  {Math.max(0, 12 - (emergencyStats?.inProgress || 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-sky-500/10 rounded-inner">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-sky-600 dark:text-sky-300" />
              <div>
                <p className="text-xs text-muted-foreground">Response Rate</p>
                <p className="text-lg font-bold tracking-tight">
                  {Math.round(((emergencyStats?.completed || 0) / Math.max(1, emergencyStats?.total || 1)) * 100)}%
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-inner">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-lg font-bold tracking-tight">4.2m</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Emergency Filters */}
      <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          <h3 className="font-bold text-sm">Emergency Filters</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {emergencyFilters.map(f => (
            <Card
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer transition-all hover:shadow-md relative ${activeFilter === f.key
                ? 'bg-sky-500/16 text-sky-700 dark:text-sky-200'
                : 'bg-muted/20 hover:bg-muted/30'
                } p-4 rounded-inner text-center`}
              title={`Filter ${f.label} emergencies`}
            >
              {/* Icon fixed to top left */}
              <div className="absolute top-2 left-2">
                <f.icon className={`h-4 w-4 ${activeFilter === f.key ? 'text-sky-600 dark:text-sky-300' : 'text-muted-foreground'
                  }`} />
              </div>

              {/* Centered content */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-normal">{f.label}</span>
                <span
                  className={`mx-auto inline-flex h-6 items-center rounded-pill px-2 text-xs font-semibold ${activeFilter === f.key ? 'bg-sky-500/20 text-sky-700 dark:text-sky-200' : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {f.count}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Live Feed */}
      <Card className="bg-card/68 backdrop-blur-2xl rounded-card p-4 shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-bold text-sm">Live Feed</h3>
          <span className="ml-auto inline-flex h-5 items-center rounded-pill bg-muted px-2 text-[10px] font-medium text-muted-foreground">
            Recent {Math.min(filteredList.length, 5)}
          </span>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-normal">No active requests</p>
            </div>
          ) : (
            <>
              {filteredList.slice(0, 5).map((req) => (
                <Card
                  key={req.id}
                  onClick={() => {
                    setSelectedMarker({ type: 'emergency', data: req });
                    window.dispatchEvent(new CustomEvent('recenter-map-target', { detail: { lat: req.lat, lng: req.lng } }));
                  }}
                  className="group cursor-pointer bg-background/60 hover:bg-background/80 transition-all shadow-sm hover:shadow-md p-3 rounded-card relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.priority === 'critical' ? 'bg-destructive' : 'bg-foreground/20'
                    }`} />

                  <div className="flex justify-between items-start pl-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">#{req.id.slice(0, 4)}</span>
                        {req.priority === 'critical' && <span className="flex h-2 w-2 rounded-pill bg-destructive animate-pulse" />}
                        <span className="inline-flex h-4 items-center rounded-pill bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{req.status}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}

              {filteredList.length > 5 && (
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground h-8">
                  View {filteredList.length - 5} more emergencies...
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
