# Mobile App Service Audit & Consolidation Plan

## 🔍 **Service Analysis Results**

### **Current Mobile App Services (26 total)**

| Service | Purpose | Status | Duplicates | Real-time | Notes |
|---------|---------|--------|------------|-----------|-------|
| `emergencyRequestsService.js` | Emergency CRUD | ✅ Active | None | ❌ Missing | Core service |
| `simulationService.js` | Mock ambulance tracking | ❌ Demo | None | ❌ Mock | **DELETE** |
| `discoveryService.js` | Trending/search tracking | ✅ Active | None | ❌ No | **KEEP** |
| `ambulanceService.js` | Ambulance CRUD | ✅ Active | None | ❌ No | Basic only |
| `hospitalsService.js` | Hospital CRUD | ✅ Active | None | ❌ No | Core service |
| `visitsService.js` | Visit management | ✅ Active | None | ❌ No | Core service |
| `notificationsService.js` | Local notifications | ✅ Active | None | ❌ No | Keep |
| `authService.js` | Authentication | ✅ Active | Mock version | ❌ No | Keep |
| `emergencyContactsService.js` | Emergency contacts | ✅ Active | None | ❌ No | Keep |
| `medicalProfileService.js` | Medical records | ✅ Active | None | ❌ No | Keep |
| `notificationDispatcher.js` | Notification routing | ✅ Active | None | ❌ No | Keep |
| `pushNotificationService.js` | Push notifications | ✅ Active | None | ❌ No | Keep |
| `imageService.js` | Image handling | ✅ Active | None | ❌ No | Keep |
| `insuranceService.js` | Insurance data | ✅ Active | None | ❌ No | Keep |
| `preferencesService.js` | User preferences | ✅ Active | Mock version | ❌ No | Keep |
| `profileCompletionService.js` | Profile completion | ✅ Active | None | ❌ No | Keep |
| `hapticService.js` | Haptic feedback | ✅ Active | None | ❌ No | Keep |
| `soundService.js` | Audio feedback | ✅ Active | None | ❌ No | Keep |
| `ocrService.js` | OCR processing | ✅ Active | None | ❌ No | Keep |
| `helpSupportService.js` | Support tickets | ✅ Active | None | ❌ No | Keep |
| `appMigrationsService.js` | App migrations | ✅ Active | None | ❌ No | Keep |
| `seederService.js` | Data seeding | ✅ Active | None | ❌ No | Keep |
| `supabase.js` | DB client | ✅ Active | None | ❌ No | Core |
| `index.js` | Service exports | ✅ Active | None | ❌ No | Keep |

---

## 🚨 **Critical Issues Found**

### **1. Location Manipulation in Mobile App**
**File**: `EmergencyContext.jsx` (Lines 56-100)

```javascript
// PROBLEM: FAKE hospital location manipulation
const localized = dbHospitals.map((h, index) => {
  const seed = h.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angle = ((seed % 360) / 360) * Math.PI * 2;
  const distance = 0.005 + ((seed % 25) / 1000);
  
  return {
    ...h,
    coordinates: {
      latitude: userLocation.latitude + latOffset, // FAKE!
      longitude: userLocation.longitude + lngOffset, // FAKE!
    }
  };
});
```

**Impact**: Real hospital coordinates are being replaced with fake ones to "match" user location.

### **2. Mock Simulation Service**
**File**: `simulationService.js`

```javascript
// PROBLEM: Fake ambulance movement
async startSimulation(requestId, routeCoordinates) {
  // FAKE: Mock driver acceptance after 5 seconds
  setTimeout(async () => {
    await supabase.from('emergency_requests').update({
      status: 'accepted',
      responder_name: "John Doe", // FAKE
      responder_phone: "+15550109988", // FAKE
      // ... more fake data
    });
  }, 5000);
}
```

**Impact**: No real ambulance tracking, completely simulated.

### **3. Missing Real-time Subscriptions**
**File**: `emergencyRequestsService.js`

```javascript
// MISSING: No real-time subscriptions
// Should have:
export const subscribeToEmergencyUpdates = (requestId, callback) => {
  // NOT IMPLEMENTED
};
```

**Impact**: Mobile app doesn't receive live updates from database.

---

## 🖥️ **Admin Console Location Analysis**

### **✅ Admin Console Uses REAL Locations**
**File**: `supabaseMapService.js`

```javascript
// WORKING: Real GPS coordinates from database
subscribeToEmergencies(onChange) {
  const channel = supabase
    .channel('map_emergencies_all')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'emergency_requests' // REAL data
    }, (payload) => {
      onChange(payload.eventType, payload.new, payload.old);
    })
    .subscribe();
}
```

**File**: Database migrations show real coordinates:
```sql
-- REAL hospital coordinates in database
INSERT INTO hospitals (name, latitude, longitude, ...)
VALUES ('City General Hospital', 6.5244, 3.3792, ...);
```

---

## 🗺️ **Complete Map Service Architecture**

### **Mobile App Map Flow (BROKEN)**
```
UI: EmergencyScreen.jsx
  ↓
Context: EmergencyContext.jsx ❌ (FAKE LOCATIONS)
  ↓
Hooks: useEmergency(), useHospitals()
  ↓
Services: hospitalsService.js ✅ (REAL DATA)
  ↓
Database: hospitals table ✅ (REAL COORDINATES)
           ↓
    ❌ EmergencyContext MANIPULATES real coordinates
```

### **Admin Console Map Flow (WORKING)**
```
UI: GodModeMap.jsx
  ↓
Context: MapContext.jsx
  ↓
Services: supabaseMapService.js ✅ (REAL-TIME)
  ↓
Database: emergency_requests ✅ (REAL COORDINATES)
```

---

## 🎯 **Detailed Fix Plan**

### **Phase 1: Remove Location Manipulation (Week 1)**

#### **1.1 Fix EmergencyContext.jsx**
```javascript
// BEFORE: Fake location manipulation
const localized = dbHospitals.map((h, index) => {
  // ... fake coordinate calculations
  return {
    ...h,
    coordinates: {
      latitude: userLocation.latitude + latOffset, // FAKE
      longitude: userLocation.longitude + lngOffset, // FAKE
    }
  };
});

// AFTER: Use real coordinates
const updateHospitals = useCallback((newHospitals) => {
  const normalized = normalizeHospitals(newHospitals);
  // USE REAL COORDINATES FROM DATABASE
  setHospitals(normalized);
}, [normalizeHospitals]);
```

#### **1.2 Add Real Geospatial Queries**
```javascript
// NEW: geoService.js
export const geoService = {
  async findNearbyHospitals(userLocation, radiusKm = 50) {
    const { data, error } = await supabase
      .rpc('nearby_hospitals', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        radius_km: radiusKm
      });
    
    return data || [];
  },
  
  async calculateDistance(from, to) {
    const { data } = await supabase
      .rpc('calculate_distance', {
        lat1: from.latitude,
        lng1: from.longitude,
        lat2: to.latitude,
        lng2: to.longitude
      });
    
    return data?.distance_km || 0;
  }
};
```

#### **1.3 Create PostGIS Functions**
```sql
-- NEW: nearby_hospitals.sql
CREATE OR REPLACE FUNCTION nearby_hospitals(
  user_lat numeric,
  user_lng numeric,
  radius_km numeric
)
RETURNS TABLE (
  id uuid,
  name text,
  latitude numeric,
  longitude numeric,
  distance_km numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.latitude,
    h.longitude,
    ST_Distance(
      ST_Point(user_lng, user_lat)::geography,
      ST_Point(h.longitude, h.latitude)::geography
    ) / 1000 as distance_km
  FROM hospitals h
  WHERE ST_DWithin(
    ST_Point(user_lng, user_lat)::geography,
    ST_Point(h.longitude, h.latitude)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- NEW: calculate_distance.sql
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
RETURNS TABLE (
  distance_km numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Distance(
      ST_Point(lng1, lat1)::geography,
      ST_Point(lng2, lat2)::geography
    ) / 1000;
END;
$$ LANGUAGE plpgsql;
```

### **Phase 2: Add Real-time Subscriptions (Week 1)**

#### **2.1 Update emergencyRequestsService.js**
```javascript
// ADD: Real-time subscriptions
export const subscribeToEmergencyUpdates = (requestId, callback) => {
  const channel = supabase
    .channel(`emergency_${requestId}`)
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'emergency_requests',
        filter: `id=eq.${requestId}`
      }, 
      callback
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
};

export const subscribeToAmbulanceLocation = (requestId, callback) => {
  const channel = supabase
    .channel(`ambulance_location_${requestId}`)
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ambulances',
        filter: `current_call=eq.${requestId}`
      },
      callback
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
};

export const subscribeToHospitalBeds = (hospitalId, callback) => {
  const channel = supabase
    .channel(`hospital_beds_${hospitalId}`)
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hospitals',
        filter: `id=eq.${hospitalId}`
      },
      callback
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
};
```

#### **2.2 Update EmergencyContext.jsx**
```javascript
// ADD: Real-time subscriptions
useEffect(() => {
  if (!activeAmbulanceTrip?.requestId) return;
  
  const unsubscribeEmergency = subscribeToEmergencyUpdates(
    activeAmbulanceTrip.requestId,
    (payload) => {
      if (payload.new) {
        setAmbulanceTripStatus(payload.new.status);
      }
    }
  );
  
  const unsubscribeAmbulance = subscribeToAmbulanceLocation(
    activeAmbulanceTrip.requestId,
    (payload) => {
      if (payload.new?.location) {
        updateAmbulanceLocation(payload.new.location);
      }
    }
  );
  
  return () => {
    unsubscribeEmergency();
    unsubscribeAmbulance();
  };
}, [activeAmbulanceTrip?.requestId]);

useEffect(() => {
  if (!activeBedBooking?.hospitalId) return;
  
  const unsubscribeBeds = subscribeToHospitalBeds(
    activeBedBooking.hospitalId,
    (payload) => {
      if (payload.new) {
        updateHospitalBedCount(payload.new);
      }
    }
  );
  
  return unsubscribeBeds;
}, [activeBedBooking?.hospitalId]);
```

### **Phase 3: Remove Mock Simulation (Week 1)**

#### **3.1 Delete simulationService.js**
```bash
# DELETE: services/simulationService.js
rm services/simulationService.js
```

#### **3.2 Update EmergencyScreen.jsx**
```javascript
// REMOVE: simulationService import
// import { simulationService } from "../services/simulationService";

// REMOVE: simulationService.startSimulation()
// ADD: Real-time tracking
const startRealTracking = useCallback(async (requestId) => {
  // Real-time subscription handles updates
  const unsubscribe = subscribeToAmbulanceLocation(requestId, (location) => {
    // UI automatically updates via real-time
  });
  
  return unsubscribe;
}, []);
```

#### **3.3 Update useEmergencyHandlers.js**
```javascript
// REMOVE: simulationService calls
// simulationService.stopSimulation();

// ADD: Real-time cleanup
const cleanupTracking = useCallback((requestId) => {
  // Real-time subscriptions auto-cleanup on unmount
}, []);
```

### **Phase 4: Service Consolidation (Week 2)**

#### **4.1 No Major Duplications Found**
✅ **Good news**: Services are well-separated with minimal duplication

#### **4.2 Minor Optimizations**
```javascript
// UPDATE: index.js (service exports)
// REMOVE: simulationService export
export {
  authService,
  ambulanceService,
  discoveryService, // KEEP - different purpose
  emergencyContactsService,
  emergencyRequestsService,
  // simulationService, // REMOVE
  hospitalsService,
  // ... other services
};
```

#### **4.3 Add Missing Real-time to Services**
```javascript
// UPDATE: ambulanceService.js
export const ambulanceService = {
  // EXISTING: list(), getById()
  
  // ADD: Real-time location updates
  async updateLocation(ambulanceId, location, heading) {
    const { error } = await supabase
      .from('ambulances')
      .update({
        location: `POINT(${location.longitude} ${location.latitude})`,
        heading,
        updated_at: new Date().toISOString()
      })
      .eq('id', ambulanceId);
    
    return !error;
  },
  
  async assignToCall(ambulanceId, requestId) {
    const { error } = await supabase
      .from('ambulances')
      .update({
        current_call: requestId,
        status: 'dispatched',
        updated_at: new Date().toISOString()
      })
      .eq('id', ambulanceId);
    
    return !error;
  }
};
```

---

## 📊 **Implementation Checklist**

### **Week 1: Critical Fixes**
- [ ] Remove fake location manipulation in EmergencyContext.jsx
- [ ] Add PostGIS functions for geospatial queries
- [ ] Add real-time subscriptions to emergencyRequestsService.js
- [ ] Update EmergencyContext.jsx with real-time
- [ ] Delete simulationService.js
- [ ] Update EmergencyScreen.jsx to use real-time
- [ ] Test ambulance dispatch flow

### **Week 2: Data Integrity**
- [ ] Add real geospatial queries
- [ ] Update hospitalsService.js with nearby search
- [ ] Add real-time to ambulanceService.js
- [ ] Test hospital location accuracy
- [ ] Test bed booking real-time updates

### **Week 3: Production Ready**
- [ ] End-to-end testing of emergency flow
- [ ] Performance testing of real-time updates
- [ ] GPS accuracy testing
- [ ] Production deployment
- [ ] Monitoring setup

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- **Location Accuracy**: Real GPS coordinates (no manipulation)
- **Real-time Latency**: < 100ms for updates
- **GPS Update Frequency**: Every 5 seconds
- **Database Performance**: < 50ms query time

### **Business Metrics**
- **Emergency Response Time**: < 8 minutes (urban)
- **Dispatch Accuracy**: > 95%
- **Location Accuracy**: > 99% real coordinates
- **User Satisfaction**: > 4.5/5

---

## 🚀 **Expected Outcome**

After implementation:

1. **✅ Real Hospital Locations**: No more fake coordinate manipulation
2. **✅ Real-time Updates**: Live ambulance tracking and status updates
3. **✅ Production Ready**: No mock services, all real data
4. **✅ Consistent Experience**: Mobile app matches admin console accuracy
5. **✅ Scalable Architecture**: Clean services with real-time capabilities

**Result**: Fully production-ready emergency medical system! 🚑
