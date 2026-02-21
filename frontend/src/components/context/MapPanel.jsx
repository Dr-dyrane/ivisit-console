import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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
        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 px-0 border-0 shadow-premium">
          <div className={`h-24 relative flex items-center justify-center mb-6 ${selectedMarker.type === "emergency" ? "bg-destructive/20" :
            selectedMarker.type === "ambulance" ? "bg-success/20" : "bg-info/20"
            }`}>
            {selectedMarker.type === "emergency" && <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />}
            {selectedMarker.type === "ambulance" && <Ambulance className="h-12 w-12 text-success opacity-50" />}
            {selectedMarker.type === "hospital" && <Hospital className="h-12 w-12 text-info opacity-50" />}
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className="mb-2 border-0 bg-muted uppercase tracking-wider text-[10px] font-semibold">
                  {selectedMarker.type}
                </Badge>
                <h2 className="text-2xl font-bold leading-tight">
                  {selectedMarker.data.name || selectedMarker.data.call_sign || `#${selectedMarker.data.id?.slice(0, 6)}`}
                </h2>
              </div>
            </div>

            {/* Type-Specific Details */}
            {selectedMarker.type === "emergency" && (
              <div className="space-y-6 mt-6">
                <div className="flex gap-2">
                  <Badge className={`squircle font-semibold px-3 py-1 ${selectedMarker.data.priority === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-primary'
                    }`}>
                    {selectedMarker.data.priority?.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="squircle capitalize">
                    {selectedMarker.data.status}
                  </Badge>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl space-y-2">
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
                  <Button variant="outline" className="w-full squircle gap-2" title="Contact emergency location">
                    <Phone className="h-4 w-4" /> Contact
                  </Button>
                  <Button variant="outline" className="w-full squircle gap-2" title="Navigate to emergency location">
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
              </div>
            )}

            {selectedMarker.type === "ambulance" && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-xl space-y-2">
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
                  <Button variant="outline" className="w-full squircle gap-2" title="Call ambulance unit directly">
                    <Phone className="h-4 w-4" /> Call Unit
                  </Button>
                  <Button variant="outline" className="w-full squircle gap-2" title="Track ambulance unit location">
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
      <Card className="bg-background/20 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Map Controls</h3>
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
      <Card className="bg-background/20 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-success" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card
            onClick={handleRecenterAll}
            className="cursor-pointer transition-all hover:shadow-md bg-muted/20 hover:bg-muted/30 border-0 p-4 rounded-lg text-center"
            title="Recenter map to show all emergency locations"
          >
            <div className="flex flex-col gap-2">
              <Navigation className="h-4 w-4 mx-auto text-muted-foreground" />
              <span className="text-sm font-normal">Recenter Map</span>
            </div>
          </Card>
          <Card
            onClick={handleExportMapData}
            className="cursor-pointer transition-all hover:shadow-md bg-muted/20 hover:bg-muted/30 border-0 p-4 rounded-lg text-center"
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
      <Card className="bg-background/20 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-info" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Live Statistics</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
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
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Ambulance className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-bold tracking-tight">
                  {Math.max(0, 12 - (emergencyStats?.inProgress || 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Response Rate</p>
                <p className="text-lg font-bold tracking-tight">
                  {Math.round(((emergencyStats?.completed || 0) / Math.max(1, emergencyStats?.total || 1)) * 100)}%
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-lg font-bold tracking-tight">4.2m</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Emergency Filters */}
      <Card className="bg-background/20 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-warning" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Emergency Filters</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {emergencyFilters.map(f => (
            <Card
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer transition-all hover:shadow-md relative ${activeFilter === f.key
                ? 'bg-primary/20 border-primary/30'
                : 'bg-muted/20 hover:bg-muted/30'
                } border-0 p-4 rounded-lg text-center`}
              title={`Filter ${f.label} emergencies`}
            >
              {/* Icon fixed to top left */}
              <div className="absolute top-2 left-2">
                <f.icon className={`h-4 w-4 ${activeFilter === f.key ? 'text-primary' : 'text-muted-foreground'
                  }`} />
              </div>

              {/* Centered content */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-normal">{f.label}</span>
                <Badge
                  variant={activeFilter === f.key ? "default" : "secondary"}
                  className="h-6 px-2 text-xs font-semibold"
                >
                  {f.count}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Live Feed */}
      <Card className="bg-background/20 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-destructive" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Live Feed</h3>
          <Badge variant="outline" className="h-5 text-[10px] ml-auto">
            Recent {Math.min(filteredList.length, 5)}
          </Badge>
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
                  className="group cursor-pointer bg-background/60 hover:bg-background/80 transition-all border-0 shadow-sm hover:shadow-md p-3 squircle-lg relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.priority === 'critical' ? 'bg-destructive' : 'bg-primary'
                    }`} />

                  <div className="flex justify-between items-start pl-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">#{req.id.slice(0, 4)}</span>
                        {req.priority === 'critical' && <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{req.status}</Badge>
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
