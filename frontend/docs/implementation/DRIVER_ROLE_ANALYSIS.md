# Driver Role Analysis & ivisit-ops Planning

## 🎯 Current Architecture Analysis

### **ivisit-app Structure**
```
ivisit-app/
├── app/(user)/(tabs)/
│   ├── bed.js          # Emergency booking
│   ├── index.js        # Home
│   └── visits.js       # Visit management
├── screens/
│   ├── EmergencyScreen.jsx      # Main emergency interface
│   ├── RequestAmbulanceScreen.jsx
│   └── ProfileScreen.jsx
└── supabase/migrations/
    └── 20260113180000_add_user_roles.sql
```

### **ivisit-console Structure**
```
ivisit-console/
├── src/components/pages/
│   ├── BentoHome.jsx           # RBAC dashboard
│   └── GodModeMap.jsx          # Operations view
├── src/contexts/
│   ├── AuthContext.jsx          # Role management
│   └── PageDataContext.jsx      # Data fetching
└── src/services/
    └── emergencyService.js      # RBAC-scoped queries
```

### **Current Database Schema**
```sql
-- User Roles
profiles.role: 'patient' | 'provider' | 'admin'
profiles.provider_type: 'hospital' | 'ambulance_service' | 'doctor' | 'driver' | 'paramedic'

-- Ambulance Structure
ambulances (
  id, type, call_sign, status, location, eta,
  crew: text[],  -- Array of crew member names
  hospital, vehicle_number, current_call: jsonb
)
```

---

## 🎯 **Driver Role Analysis**

### **Current State: Driver as Provider Type**
✅ **Already Supported**: `provider_type = 'driver'` exists in schema
✅ **Authentication**: Drivers can login as providers
✅ **RBAC Ready**: Role system supports provider-level access

### **Current Ambulance-Driver Relationship**
```sql
-- Current approach: Ambulances have crew array
ambulances.crew: ['Paramedic John D.', 'EMT Sarah M.']

-- Issue: No direct driver-ambulance relationship
- Drivers can't claim ownership of specific ambulances
- No driver-specific location updates
- No driver authentication to ambulance
```

---

## 🎯 **Recommendation: Driver as Provider Role**

### **✅ Keep Driver as Provider Type**
**Reasoning**: Current architecture already supports this well

```sql
-- Enhanced driver-ambulance relationship
ALTER TABLE ambulances 
ADD COLUMN IF NOT EXISTS driver_id text REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS driver_location geometry(Point, 4326),
ADD COLUMN IF NOT EXISTS last_location_update timestamp with time zone;
```

### **Driver Capabilities**
```javascript
// Driver can:
✅ Login as provider with driver role
✅ View assigned ambulances only
✅ Update ambulance location in real-time
✅ Manage ambulance status (available, en_route, on_scene)
✅ View assigned emergency requests
✅ Communicate with dispatch
```

---

## 🎯 **ivisit-ops Architecture Plan**

### **Purpose**
Operations team dashboard for:
- **Fleet Management**: Real-time ambulance tracking
- **Dispatch Coordination**: Emergency assignment
- **Resource Allocation**: Hospital and crew management
- **Analytics**: Response times, utilization metrics

### **Technical Architecture**
```
ivisit-ops/
├── src/
│   ├── components/
│   │   ├── FleetDashboard.jsx      # Real-time ambulance tracking
│   │   ├── DispatchCenter.jsx       # Emergency assignment interface
│   │   ├── ResourceManagement.jsx   # Hospital/crew management
│   │   └── AnalyticsDashboard.jsx   # Operations metrics
│   ├── contexts/
│   │   ├── FleetContext.jsx         # Real-time fleet data
│   │   ├── DispatchContext.jsx       # Dispatch state
│   │   └── OperationsAuthContext.jsx # Ops-specific RBAC
│   ├── services/
│   │   ├── fleetService.js          # Ambulance management
│   │   ├── dispatchService.js        # Emergency dispatch
│   │   └── operationsAnalytics.js   # Ops metrics
│   └── hooks/
│       ├── useRealTimeFleet.js      # WebSocket fleet updates
│       └── useDispatchOperations.js # Dispatch workflow
```

### **Database Enhancements Needed**
```sql
-- Operations-specific tables
CREATE TABLE dispatch_operations (
  id text PRIMARY KEY,
  dispatcher_id text REFERENCES profiles(id),
  emergency_request_id text REFERENCES emergency_requests(id),
  ambulance_id text REFERENCES ambulances(id),
  status text DEFAULT 'assigned',
  assigned_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE fleet_events (
  id text PRIMARY KEY,
  ambulance_id text REFERENCES ambulances(id),
  event_type text, -- 'location_update', 'status_change', 'assignment'
  event_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## 🎯 **Driver-Console Integration Flow**

### **Data Flow Architecture**
```
Driver App (ivisit-app) → Supabase Realtime → ivisit-console → ivisit-ops
     ↓                        ↓                    ↓              ↓
Location Updates        WebSocket           RBAC Filter    Fleet View
Status Changes          Broadcast           Role Scoping   Dispatch UI
Emergency Acceptance     → Database           → Analytics    → Assignment
```

### **Real-Time Features**
```javascript
// Driver location updates
const updateLocation = async (ambulanceId, location) => {
  await supabase
    .from('ambulances')
    .update({ 
      driver_location: location,
      last_location_update: new Date().toISOString()
    })
    .eq('id', ambulanceId);
    
  // Triggers real-time update to ivisit-ops
};

// ivisit-ops real-time subscription
supabase
  .channel('fleet-updates')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'ambulances' },
    (payload) => updateFleetView(payload.new)
  )
  .subscribe();
```

---

## 🎯 **RBAC for ivisit-ops**

### **Operations Roles**
```javascript
// New roles for ivisit-ops
const OPERATIONS_ROLES = {
  'ops_admin': {
    permissions: ['fleet_manage', 'dispatch_all', 'analytics_full', 'resource_manage']
  },
  'ops_dispatcher': {
    permissions: ['dispatch_assign', 'fleet_view', 'emergency_view']
  },
  'ops_analyst': {
    permissions: ['analytics_view', 'fleet_view', 'reports_generate']
  }
};
```

### **Access Control Matrix**
| Feature | ops_admin | ops_dispatcher | ops_analyst |
|---------|-----------|----------------|-------------|
| Fleet Management | ✅ Full | ❌ View Only | ❌ View Only |
| Emergency Dispatch | ✅ Full | ✅ Assign | ❌ View Only |
| Analytics | ✅ Full | ❌ Limited | ✅ Full |
| Resource Management | ✅ Full | ❌ None | ❌ None |

---

## 🎯 **Implementation Priority**

### **Phase 1: Driver Enhancement (Immediate)**
1. ✅ **Enhance ambulance schema** with driver relationship
2. ✅ **Update driver RBAC** in ivisit-console
3. ✅ **Add location update API** for drivers
4. ✅ **Real-time driver tracking** in console

### **Phase 2: ivisit-ops Foundation (Next)**
1. 🔄 **Create ivisit-ops project structure**
2. 🔄 **Implement operations RBAC** system
3. 🔄 **Build fleet dashboard** with real-time updates
4. 🔄 **Create dispatch interface**

### **Phase 3: Advanced Operations (Future)**
1. ⏳ **Predictive analytics** for fleet optimization
2. ⏳ **AI-powered dispatch** recommendations
3. ⏳ **Mobile ops app** for field managers
4. ⏳ **Integration with hospitals** for bed management

---

## 🎯 **Technical Considerations**

### **Real-Time Architecture**
```javascript
// Use Supabase Realtime for driver updates
const DRIVER_UPDATES_CHANNEL = 'driver_location_updates';

// Driver app publishes location
const publishLocation = (ambulanceId, location) => {
  supabase.channel(DRIVER_UPDATES_CHANNEL)
    .send({
      type: 'broadcast',
      event: 'location_update',
      payload: { ambulanceId, location, timestamp: Date.now() }
    });
};

// ivisit-ops subscribes
supabase.channel(DRIVER_UPDATES_CHANNEL)
  .on('broadcast', { event: 'location_update' }, (payload) => {
    updateAmbulanceLocation(payload.payload);
  })
  .subscribe();
```

### **Security & Permissions**
```sql
-- RLS policies for driver updates
CREATE POLICY "Drivers can update their assigned ambulance"
ON ambulances FOR UPDATE
USING (
  auth.jwt() ->> 'provider_type' = 'driver' AND 
  driver_id = auth.uid()
);

-- Operations team access
CREATE POLICY "Operations team can view all ambulances"
ON ambulances FOR SELECT
USING (
  auth.jwt() ->> 'role' IN ('ops_admin', 'ops_dispatcher', 'ops_analyst')
);
```

---

## 🎯 **Recommendation Summary**

### **Driver Role**: ✅ **Keep as Provider Type**
- **Pros**: Leverages existing architecture, minimal changes needed
- **Cons**: Limited to provider-level permissions
- **Best For**: Current system stability and quick implementation

### **ivisit-ops**: 🚀 **Build as Separate Application**
- **Pros**: Specialized operations interface, scalable architecture
- **Cons**: Additional development effort
- **Best For**: Professional operations team workflow

### **Integration Strategy**
1. **Enhance driver capabilities** in current system
2. **Build ivisit-ops** with real-time integration
3. **Share database** with proper RBAC separation
4. **Use Supabase Realtime** for live fleet tracking

---

**Status**: ✅ **Ready for Implementation**

The architecture supports both driver enhancement and ivisit-ops development with minimal disruption to existing systems.
