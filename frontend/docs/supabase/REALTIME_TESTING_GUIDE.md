# 🧪 REALTIME TESTING & DEBUGGING GUIDE

## 🚨 **Issues Identified**

### **1. Database Function Error**
```
ERROR: structure of query does not match function result type
DETAIL: Returned type double precision does not match expected type numeric
```
**✅ FIXED**: Changed `distance_km` from `numeric` to `double precision`

### **2. No Hospitals Nearby**
The nearby hospitals function might not find hospitals if:
- No hospitals have valid coordinates
- Hospitals are outside the search radius
- Hospital status is not 'available'

### **3. Mobile App Location Accuracy**
Potential issues with location reading in mobile app.

---

## 🔧 **IMMEDIATE FIXES**

### **Step 1: Apply Fixed Database Function**
Run the corrected SQL in Supabase SQL Editor:

```sql
-- Apply this in: https://app.supabase.com/project/ivisit/sql
CREATE OR REPLACE FUNCTION nearby_hospitals(
  user_lat numeric,
  user_lng numeric,
  radius_km numeric DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  latitude numeric,
  longitude numeric,
  distance_km double precision, -- FIXED: Changed from numeric
  available_beds integer,
  address text,
  phone text,
  rating numeric,
  type text,
  specialties text[],
  service_types text[],
  emergency_level text,
  status text
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
    ) / 1000 as distance_km,
    h.available_beds,
    h.address,
    h.phone,
    h.rating,
    h.type,
    h.specialties,
    h.service_types,
    h.emergency_level,
    h.status
  FROM hospitals h
  WHERE 
    h.status = 'available'
    AND ST_DWithin(
      ST_Point(user_lng, user_lat)::geography,
      ST_Point(h.longitude, h.latitude)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
```

### **Step 2: Run Debug Script**
Execute `debug_and_test_realtime.sql` in Supabase SQL Editor to:
- Check existing hospitals and their locations
- Add test hospitals near Lagos if needed
- Test the nearby hospitals function
- Verify real-time tables are enabled

---

## 🧪 **TESTING REALTIME FUNCTIONALITY**

### **1. Admin Console Testing**
```javascript
// Test in browser console
// 1. Open admin console
// 2. Go to map page
// 3. Open browser console and run:

// Test nearby hospitals function
fetch('/api/nearby-hospitals', {
  method: 'POST',
  body: JSON.stringify({ lat: 6.5244, lng: 3.3792, radius: 50 })
}).then(r => r.json()).then(console.log);

// Check real-time subscriptions
window.supabaseChannel = supabase
  .channel('test-emergency')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'emergency_requests' },
    (payload) => console.log('Real-time update:', payload)
  )
  .subscribe();
```

### **2. Mobile App Testing**
```javascript
// Add to EmergencyScreen.jsx for debugging
useEffect(() => {
  console.log('[DEBUG] Hospitals:', hospitals);
  console.log('[DEBUG] User Location:', userLocation);
  console.log('[DEBUG] Active Trip:', activeAmbulanceTrip);
  
  // Test real-time subscription
  const testChannel = supabase
    .channel('test-mobile')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'emergency_requests' },
      (payload) => console.log('[MOBILE] Real-time:', payload)
    )
    .subscribe();
    
  return () => supabase.removeChannel(testChannel);
}, [hospitals, userLocation, activeAmbulanceTrip]);
```

---

## 🗺️ **POLYLINE & AMBULANCE ANIMATION TESTING**

### **1. Test Emergency Flow**
1. **Create Emergency Request**
   ```sql
   INSERT INTO emergency_requests (
     id, user_id, service_type, status, latitude, longitude
   ) VALUES (
     gen_random_uuid()::text,
     'test-user-id',
     'ambulance',
     'pending',
     6.5244, 3.3792
   );
   ```

2. **Assign Ambulance**
   ```sql
   UPDATE emergency_requests 
   SET status = 'accepted',
       responder_id = 'test-ambulance-id',
       responder_location = 'POINT(3.3792 6.5244)'
   WHERE id = 'your-request-id';
   ```

3. **Update Ambulance Location**
   ```sql
   UPDATE emergency_requests 
   SET responder_location = 'POINT(3.3892 6.5344)'
   WHERE id = 'your-request-id';
   ```

### **2. Test Polyline Rendering**
In mobile app, check if polylines render:
```javascript
// In FullScreenEmergencyMap.jsx
useEffect(() => {
  console.log('[DEBUG] Route coordinates:', routeCoordinates);
  console.log('[DEBUG] Animate ambulance:', animateAmbulance);
  console.log('[DEBUG] Responder location:', responderLocation);
}, [routeCoordinates, animateAmbulance, responderLocation]);
```

---

## 📱 **MOBILE APP LOCATION ACCURACY FIXES**

### **1. Check Location Permissions**
```javascript
// Add to useMapLocation.js
useEffect(() => {
  console.log('[DEBUG] Location permission:', locationPermission);
  console.log('[DEBUG] User location:', userLocation);
  console.log('[DEBUG] Loading location:', isLoadingLocation);
}, [locationPermission, userLocation, isLoadingLocation]);
```

### **2. Validate Coordinates**
```javascript
// Add to EmergencyContext.jsx
const validateCoordinates = (hospitals) => {
  return hospitals.map(h => ({
    ...h,
    hasValidLocation: h.latitude && h.longitude && 
                      h.latitude !== 0 && h.longitude !== 0,
    distance: userLocation ? calculateDistance(
      userLocation.latitude, userLocation.longitude,
      h.latitude, h.longitude
    ) : null
  }));
};

// In the hospitals update effect
const validatedHospitals = validateCoordinates(localized);
console.log('[DEBUG] Validated hospitals:', validatedHospitals);
```

---

## 🔍 **DEBUGGING CHECKLIST**

### **Database Layer**
- [ ] Nearby hospitals function works
- [ ] Test hospitals exist with valid coordinates
- [ ] Real-time publications enabled
- [ ] Emergency requests have valid locations

### **Admin Console**
- [ ] Map shows real hospital locations
- [ ] Nearby hospitals query works
- [ ] Real-time updates appear
- [ ] No simulation fallback

### **Mobile App**
- [ ] Location permissions granted
- [ ] User location accurate
- [ ] Hospital coordinates real
- [ ] Real-time subscriptions active
- [ ] Polylines render correctly
- [ ] Ambulance animation works

---

## 🚀 **NEXT STEPS**

### **Immediate (Today)**
1. ✅ Apply fixed database function
2. ✅ Run debug script to add test data
3. ✅ Test nearby hospitals query
4. ✅ Verify real-time subscriptions

### **Testing (Tomorrow)**
1. 🔄 Test complete emergency flow
2. 🔄 Verify polyline rendering
3. 🔄 Test ambulance animation
4. 🔄 Check mobile app location accuracy

### **Production (This Week)**
1. 📋 Deploy to staging
2. 📋 End-to-end testing
3. 📋 Performance monitoring
4. 📋 Production deployment

---

## 📊 **SUCCESS METRICS**

### **Function Testing**
- ✅ Nearby hospitals returns results
- ✅ Distance calculations accurate
- ✅ Real-time subscriptions work
- ✅ No simulation fallback

### **UI Testing**
- ✅ Map shows real locations
- ✅ Polylines render correctly
- ✅ Ambulance animates smoothly
- ✅ Real-time updates appear

### **Integration Testing**
- ✅ Emergency flow complete
- ✅ Admin console syncs with mobile
- ✅ Location data accurate
- ✅ Performance acceptable

**Run the debug script first, then test the realtime functionality!** 🧪
