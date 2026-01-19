import React, { createContext, useContext, useState } from 'react';

const MapContext = createContext();

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within MapProvider');
  }
  return context;
};

export const MapProvider = ({ children }) => {
  const [mapData, setMapData] = useState({
    emergencyRequests: [],
    ambulances: [],
    hospitals: [],
    showLayers: { emergencies: true, ambulances: true, hospitals: true },
    filter: 'all', // 'all', 'pending', 'dispatched', 'en_route'
    loading: false,
    selectedMarker: null
  });

  const value = {
    mapData,
    setMapData,
    updateEmergencyRequests: (requests) => setMapData(prev => ({ ...prev, emergencyRequests: requests })),
    updateAmbulances: (ambulances) => setMapData(prev => ({ ...prev, ambulances })),
    updateHospitals: (hospitals) => setMapData(prev => ({ ...prev, hospitals })),
    toggleLayer: (layer) => setMapData(prev => ({ 
      ...prev, 
      showLayers: { ...prev.showLayers, [layer]: !prev.showLayers[layer] }
    })),
    setFilter: (filter) => setMapData(prev => ({ ...prev, filter })),
    setLoading: (loading) => setMapData(prev => ({ ...prev, loading })),
    setSelectedMarker: (marker) => setMapData(prev => ({ ...prev, selectedMarker: marker }))
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};
