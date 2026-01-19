import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const MapPanel = ({ emergencyStats }) => {
  const { mapData, setFilter, setSelectedMarker, recenterMap } = useMapContext();
  const { selectedMarker, emergencyRequests, filter: activeFilter } = mapData;

  // Filter Logic for List
  const filteredList = React.useMemo(() => {
    if (activeFilter === 'all') return emergencyRequests;
    return emergencyRequests.filter(req => req.priority === activeFilter);
  }, [emergencyRequests, activeFilter]);

  const emergencyFilters = [
    { key: 'all', label: 'All', icon: Radio, count: emergencyStats.critical + emergencyStats.pending + emergencyStats.inProgress },
    { key: 'pending', label: 'Pending', icon: Clock, count: emergencyStats.pending },
    { key: 'dispatched', label: 'Dispatched', icon: CheckCircle, count: emergencyStats.inProgress },
    { key: 'en_route', label: 'En Route', icon: Ambulance, count: Math.max(0, emergencyStats.inProgress - 2) }
  ];

  // --- INSPECTOR VIEW (Selected Marker) ---
  if (selectedMarker) {
    return (
      <div className="h-full flex flex-col">
        {/* Back Navigation */}
        <div className="p-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMarker(null)}
            className="text-muted-foreground hover:text-foreground pl-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Feed
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-4">
          {/* Header Card */}
          <Card className="overflow-hidden bg-background/50 backdrop-blur-xs border-0 shadow-premium">
            <div className={`h-24 relative flex items-center justify-center ${selectedMarker.type === "emergency" ? "bg-destructive/20" :
              selectedMarker.type === "ambulance" ? "bg-success/20" : "bg-info/20"
              }`}>
              {selectedMarker.type === "emergency" && <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />}
              {selectedMarker.type === "ambulance" && <Ambulance className="h-12 w-12 text-success opacity-50" />}
              {selectedMarker.type === "hospital" && <Hospital className="h-12 w-12 text-info opacity-50" />}
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Badge variant="outline" className="mb-2 border-0 bg-muted uppercase tracking-wider text-[10px] font-bold">
                    {selectedMarker.type}
                  </Badge>
                  <h2 className="text-2xl font-black leading-tight">
                    {selectedMarker.data.name || selectedMarker.data.call_sign || `#${selectedMarker.data.id?.slice(0, 6)}`}
                  </h2>
                </div>
              </div>

              {/* Type-Specific Details */}
              {selectedMarker.type === "emergency" && (
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Badge className={`squircle font-bold px-3 py-1 ${selectedMarker.data.priority === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-primary'
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
                        <p className="text-sm font-medium leading-snug">
                          {selectedMarker.data.location || "Coordinates Received"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {Number(selectedMarker.data.lat).toFixed(6)}, {Number(selectedMarker.data.lng).toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full squircle font-bold h-12 text-lg shadow-lg shadow-primary/20">
                    Dispatch Unit Now
                  </Button>
                </div>
              )}

              {selectedMarker.type === "ambulance" && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                      <p className={`font-black text-lg ${selectedMarker.data.status === 'available' ? 'text-success' : 'text-warning'
                        }`}>{selectedMarker.data.status?.toUpperCase()}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Type</span>
                      <p className="font-black text-lg">{selectedMarker.data.type || 'ALS'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                    <span className="text-sm font-bold text-muted-foreground">Vehicle No.</span>
                    <span className="font-mono font-bold bg-background px-2 py-1 rounded">
                      {selectedMarker.data.vehicle_number}
                    </span>
                  </div>
                </div>
              )}

              {selectedMarker.type === "hospital" && (
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">{selectedMarker.data.address || "Address not available"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Available Beds</span>
                      <p className="font-black text-2xl text-primary">{selectedMarker.data.available_beds ?? '-'}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Ambulances</span>
                      <p className="font-black text-2xl">{selectedMarker.data.ambulances_count ?? 0}</p>
                    </div>
                  </div>
                  {selectedMarker.data.phone && (
                    <Button variant="outline" className="w-full squircle gap-2">
                      <Phone className="h-4 w-4" /> Call Facility
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- DEFAULT DASHBOARD VIEW ---
  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      {/* Live Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm flex flex-col justify-between">
          <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
          <div>
            <span className="text-2xl font-black">{emergencyStats.critical + emergencyStats.pending}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Active</p>
          </div>
        </Card>
        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm flex flex-col justify-between">
          <Ambulance className="h-5 w-5 text-success mb-2" />
          <div>
            <span className="text-2xl font-black">{Math.max(0, 12 - emergencyStats.inProgress)}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Ready</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {emergencyFilters.map(f => (
          <Button
            key={f.key}
            variant={activeFilter === f.key ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="h-8 rounded-full text-xs font-bold whitespace-nowrap"
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {/* Live Feed */}
      <div className="space-y-3">
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between">
          Live Feed
          <Badge variant="outline" className="h-5 text-[10px]">Recent {Math.min(filteredList.length, 3)}</Badge>
        </h3>

        <div className="space-y-3 pb-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">No active requests</p>
            </div>
          ) : (
            <>
              {filteredList.slice(0, 3).map((req) => (
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
                        <span className="font-black text-sm">#{req.id.slice(0, 4)}</span>
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

              {filteredList.length > 3 && (
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground h-8">
                  View {filteredList.length - 3} more emergencies...
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
