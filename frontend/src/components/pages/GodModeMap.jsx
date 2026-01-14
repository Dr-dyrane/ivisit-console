import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import { supabase, subscribeToTable } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Ambulance, MapPin, Activity, ArrowLeft, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, subscribeToTable } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Ambulance, MapPin, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };

export const GodModeMap = () => {
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchEmergencyRequests();
    fetchAmbulances();

    const unsubRequests = subscribeToTable('emergency_requests', fetchEmergencyRequests);
    const unsubAmbulances = subscribeToTable('ambulances', fetchAmbulances);

    return () => {
      unsubRequests();
      unsubAmbulances();
    };
  }, []);

  const fetchEmergencyRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          patient:profiles!emergency_requests_user_id_fkey(username, avatar_url),
          hospital:hospitals(name, latitude, longitude)
        `)
        .in('status', ['pending', 'accepted', 'in_progress']);

      if (error) throw error;
      
      const requestsWithLocations = (data || []).map(request => ({
        ...request,
        lat: request.hospital?.latitude || LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.1,
        lng: request.hospital?.longitude || LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.1,
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
        .select('*')
        .eq('status', 'available');

      if (error) throw error;
      
      const ambulancesWithLocations = (data || []).map(ambulance => ({
        ...ambulance,
        lat: LAGOS_CENTER.lat + (Math.random() - 0.5) * 0.2,
        lng: LAGOS_CENTER.lng + (Math.random() - 0.5) * 0.2,
      }));
      
      setAmbulances(ambulancesWithLocations);
    } catch (error) {
      console.error('Error fetching ambulances:', error);
    }
  };

  const filteredRequests = filter === 'all' 
    ? emergencyRequests 
    : emergencyRequests.filter(r => r.status === filter);

  return (
    <div className="space-y-6 animate-fadeIn h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">God Mode Map</h1>
          <p className="text-muted-foreground">Real-time emergency response tracking</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="squircle"
          >
            All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            className="squircle"
          >
            Pending
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setFilter('in_progress')}
            className="squircle"
          >
            In Progress
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-full">
        <Card className="flex-1 squircle-lg p-0 overflow-hidden glass">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={LAGOS_CENTER}
              defaultZoom={12}
              mapId="ivisit-map"
              className="w-full h-full"
              disableDefaultUI={false}
              styles={[
                {
                  featureType: 'all',
                  elementType: 'geometry',
                  stylers: [{ color: '#1a1a2e' }]
                },
                {
                  featureType: 'water',
                  elementType: 'geometry',
                  stylers: [{ color: '#0f3460' }]
                }
              ]}
            >
              {filteredRequests.map((request) => (
                <AdvancedMarker
                  key={request.id}
                  position={{ lat: request.lat, lng: request.lng }}
                  onClick={() => setSelectedMarker({ type: 'request', data: request })}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(request.status),
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Activity style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                </AdvancedMarker>
              ))}

              {ambulances.map((ambulance) => (
                <AdvancedMarker
                  key={ambulance.id}
                  position={{ lat: ambulance.lat, lng: ambulance.lng }}
                  onClick={() => setSelectedMarker({ type: 'ambulance', data: ambulance })}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Ambulance style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </Card>

        <div className="w-80 space-y-4">
          <Card className="squircle-lg p-6 glass">
            <h3 className="font-semibold mb-4">Live Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Emergencies</span>
                <Badge className="squircle bg-primary/20 text-primary">
                  {emergencyRequests.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Ambulances</span>
                <Badge className="squircle bg-success/20 text-success">
                  {ambulances.length}
                </Badge>
              </div>
            </div>
          </Card>

          <AnimatePresence>
            {selectedMarker && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Card className="squircle-lg p-6 glass">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold">
                      {selectedMarker.type === 'request' ? 'Emergency Request' : 'Ambulance'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMarker(null)}
                      className="squircle"
                    >
                      ×
                    </Button>
                  </div>

                  {selectedMarker.type === 'request' ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Patient</p>
                        <p className="font-medium">{selectedMarker.data.patient?.username || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hospital</p>
                        <p className="font-medium">{selectedMarker.data.hospital?.name || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={`squircle ${getStatusBadgeColor(selectedMarker.data.status)}`}>
                          {selectedMarker.data.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Call Sign</p>
                        <p className="font-medium">{selectedMarker.data.call_sign || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{selectedMarker.data.type || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className="squircle bg-success/20 text-success">
                          Available
                        </Badge>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status) {
  const colors = {
    pending: '#f59e0b',
    accepted: '#3b82f6',
    in_progress: '#e63946',
    completed: '#10b981',
  };
  return colors[status] || colors.pending;
}

function getStatusBadgeColor(status) {
  const colors = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    accepted: 'bg-info/20 text-info border-info/30',
    in_progress: 'bg-primary/20 text-primary border-primary/30',
    completed: 'bg-success/20 text-success border-success/30',
  };
  return colors[status] || colors.pending;
}
