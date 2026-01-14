import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Ambulance, Hospital, Activity, AlertTriangle, MapPin, Phone, Clock, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

export const GodModeMap = () => {
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showLayers, setShowLayers] = useState({ emergencies: true, ambulances: true, hospitals: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions
    const emergencyChannel = supabase
      .channel('emergency_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, fetchEmergencyRequests)
      .subscribe();
    
    const ambulanceChannel = supabase
      .channel('ambulance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' }, fetchAmbulances)
      .subscribe();

    return () => {
      supabase.removeChannel(emergencyChannel);
      supabase.removeChannel(ambulanceChannel);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchEmergencyRequests(), fetchAmbulances(), fetchHospitals()]);
    setLoading(false);
  };

  const fetchEmergencyRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .in('status', ['pending', 'dispatched', 'en_route', 'arrived']);

      if (error) throw error;
      
      const requestsWithLocations = (data || []).map(request => ({
        ...request,
        lat: request.latitude || LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.1,
        lng: request.longitude || LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.1,
      }));
      
      setEmergencyRequests(requestsWithLocations);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
    }
  };

  const fetchAmbulances = async () => {
    try {
      const { data, error } = await supabase
        .from('ambulances')
        .select('*');

      if (error) throw error;
      
      const ambulancesWithLocations = (data || []).map(ambulance => ({
        ...ambulance,
        lat: LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.15,
        lng: LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.15,
      }));
      
      setAmbulances(ambulancesWithLocations);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    }
  };

  const fetchHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*');

      if (error) throw error;
      
      const hospitalsWithLocations = (data || []).map(hospital => ({
        ...hospital,
        lat: hospital.latitude || LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.12,
        lng: hospital.longitude || LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.12,
      }));
      
      setHospitals(hospitalsWithLocations);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

  const filteredRequests = filter === 'all' 
    ? emergencyRequests 
    : emergencyRequests.filter(r => r.status === filter);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      dispatched: '#3b82f6',
      en_route: '#8b5cf6',
      arrived: '#10b981',
      available: '#10b981',
      busy: '#ef4444',
      off_duty: '#6b7280',
    };
    return colors[status] || '#f59e0b';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
    };
    return colors[priority] || '#3b82f6';
  };

  const toggleLayer = (layer) => {
    setShowLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="editorial-title text-3xl mb-1">God Mode Map</h1>
            <p className="text-muted-foreground font-semibold">Real-time emergency response tracking</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Layer Toggles */}
            <div className="flex items-center gap-1 glass squircle px-2 py-1">
              <Button
                variant={showLayers.emergencies ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('emergencies')}
                className="squircle h-8 px-3"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
              <Button
                variant={showLayers.ambulances ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('ambulances')}
                className="squircle h-8 px-3"
              >
                <Ambulance className="h-4 w-4" />
              </Button>
              <Button
                variant={showLayers.hospitals ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleLayer('hospitals')}
                className="squircle h-8 px-3"
              >
                <Hospital className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 glass squircle px-2 py-1">
              {['all', 'pending', 'dispatched', 'en_route'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="squircle h-8 px-3 capitalize"
                >
                  {f.replace('_', ' ')}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllData}
              className="squircle"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Map Container */}
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Map */}
        <Card className="flex-1 squircle-lg p-0 overflow-hidden glass border-0">
          {GOOGLE_MAPS_API_KEY ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={LAGOS_CENTER}
                defaultZoom={12}
                mapId="ivisit-god-mode"
                className="w-full h-full"
                disableDefaultUI={false}
                gestureHandling="greedy"
              >
                {/* Emergency Request Markers */}
                {showLayers.emergencies && filteredRequests.map((request) => (
                  <AdvancedMarker
                    key={`emergency-${request.id}`}
                    position={{ lat: request.lat, lng: request.lng }}
                    onClick={() => setSelectedMarker({ type: 'emergency', data: request })}
                  >
                    <div 
                      className="relative cursor-pointer transform hover:scale-110 transition-transform"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: getPriorityColor(request.priority),
                        border: '3px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      <AlertTriangle style={{ width: '18px', height: '18px', color: 'white' }} />
                      {request.priority === 'critical' && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      )}
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Ambulance Markers */}
                {showLayers.ambulances && ambulances.map((ambulance) => (
                  <AdvancedMarker
                    key={`ambulance-${ambulance.id}`}
                    position={{ lat: ambulance.lat, lng: ambulance.lng }}
                    onClick={() => setSelectedMarker({ type: 'ambulance', data: ambulance })}
                  >
                    <div 
                      className="cursor-pointer transform hover:scale-110 transition-transform"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(ambulance.status),
                        border: '3px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      <Ambulance style={{ width: '18px', height: '18px', color: 'white' }} />
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Hospital Markers */}
                {showLayers.hospitals && hospitals.map((hospital) => (
                  <AdvancedMarker
                    key={`hospital-${hospital.id}`}
                    position={{ lat: hospital.lat, lng: hospital.lng }}
                    onClick={() => setSelectedMarker({ type: 'hospital', data: hospital })}
                  >
                    <div 
                      className="cursor-pointer transform hover:scale-110 transition-transform"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: '#3b82f6',
                        border: '3px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      <Hospital style={{ width: '20px', height: '20px', color: 'white' }} />
                    </div>
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-semibold">Google Maps API key not configured</p>
              </div>
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <div className="w-80 space-y-4 hidden lg:block">
          {/* Live Stats */}
          <Card className="squircle-lg p-5 glass border-0">
            <h3 className="font-black text-lg mb-4">Live Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 squircle bg-destructive/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-semibold">Active Emergencies</span>
                </div>
                <Badge className="squircle bg-destructive text-destructive-foreground font-black">
                  {emergencyRequests.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 squircle bg-success/10">
                <div className="flex items-center gap-2">
                  <Ambulance className="h-5 w-5 text-success" />
                  <span className="text-sm font-semibold">Available Units</span>
                </div>
                <Badge className="squircle bg-success text-success-foreground font-black">
                  {ambulances.filter(a => a.status === 'available').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 squircle bg-info/10">
                <div className="flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-info" />
                  <span className="text-sm font-semibold">Hospitals</span>
                </div>
                <Badge className="squircle bg-info text-info-foreground font-black">
                  {hospitals.length}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Selected Marker Details */}
          <AnimatePresence>
            {selectedMarker && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Card className="squircle-lg p-5 glass border-0">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-black text-lg">
                      {selectedMarker.type === 'emergency' && 'Emergency Request'}
                      {selectedMarker.type === 'ambulance' && 'Ambulance Unit'}
                      {selectedMarker.type === 'hospital' && 'Hospital'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMarker(null)}
                      className="squircle h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>

                  {selectedMarker.type === 'emergency' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`squircle font-bold ${
                          selectedMarker.data.priority === 'critical' ? 'bg-destructive text-destructive-foreground' :
                          selectedMarker.data.priority === 'high' ? 'bg-warning text-warning-foreground' :
                          'bg-info text-info-foreground'
                        }`}>
                          {selectedMarker.data.priority || 'medium'}
                        </Badge>
                        <Badge className="squircle bg-muted" variant="outline">
                          {selectedMarker.data.status}
                        </Badge>
                      </div>
                      {selectedMarker.data.emergency_type && (
                        <p className="text-sm font-semibold text-primary">{selectedMarker.data.emergency_type}</p>
                      )}
                      {selectedMarker.data.location && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{selectedMarker.data.location}</span>
                        </div>
                      )}
                      <Button className="w-full squircle bg-primary" size="sm">
                        Dispatch Ambulance
                      </Button>
                    </div>
                  )}

                  {selectedMarker.type === 'ambulance' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Call Sign</p>
                        <p className="font-black text-lg">{selectedMarker.data.call_sign || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 squircle bg-muted/30">
                          <p className="text-xs text-muted-foreground">Type</p>
                          <p className="font-bold text-sm">{selectedMarker.data.type || 'BLS'}</p>
                        </div>
                        <div className="p-3 squircle bg-muted/30">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge className={`squircle text-xs ${
                            selectedMarker.data.status === 'available' ? 'bg-success/20 text-success' :
                            selectedMarker.data.status === 'busy' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted'
                          }`}>
                            {selectedMarker.data.status}
                          </Badge>
                        </div>
                      </div>
                      {selectedMarker.data.vehicle_number && (
                        <p className="text-sm text-muted-foreground">
                          Vehicle: <span className="font-semibold text-foreground">{selectedMarker.data.vehicle_number}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {selectedMarker.type === 'hospital' && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-black text-lg">{selectedMarker.data.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedMarker.data.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 squircle bg-muted/30">
                          <p className="text-xs text-muted-foreground">Available Beds</p>
                          <p className="font-black text-lg">{selectedMarker.data.available_beds || 0}</p>
                        </div>
                        <div className="p-3 squircle bg-muted/30">
                          <p className="text-xs text-muted-foreground">Ambulances</p>
                          <p className="font-black text-lg">{selectedMarker.data.ambulances_count || 0}</p>
                        </div>
                      </div>
                      {selectedMarker.data.phone && (
                        <Button variant="outline" className="w-full squircle" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          {selectedMarker.data.phone}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Emergencies */}
          <Card className="squircle-lg p-5 glass border-0">
            <h3 className="font-black text-lg mb-4">Recent Emergencies</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {emergencyRequests.slice(0, 5).map((req) => (
                <div 
                  key={req.id}
                  className="p-3 squircle bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMarker({ type: 'emergency', data: req })}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">#{req.id?.slice(-6)}</span>
                    <Badge className={`squircle text-xs ${
                      req.priority === 'critical' ? 'bg-destructive/20 text-destructive' :
                      req.priority === 'high' ? 'bg-warning/20 text-warning' :
                      'bg-muted'
                    }`}>
                      {req.priority || 'medium'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{req.emergency_type || req.location || 'Emergency'}</p>
                </div>
              ))}
              {emergencyRequests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active emergencies</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
