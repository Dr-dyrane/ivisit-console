# Database Schema Reference - COMPLETE ✅

## 🎯 Complete Table Schemas

Generated using: `npx supabase gen types typescript --project-id dlwtcmhdzoklveihuhjf --schema public`

---

## 🚑 **Emergency Requests Table**

```typescript
interface EmergencyRequest {
  // Patient Information
  user_id: string | null              // UUID of patient who requested
  patient_snapshot: Json | null       // Patient details (name, email, phone)
  patient_location: unknown           // GPS coordinates of patient
  patient_heading: number | null      // Direction patient is facing

  // Service Details
  id: string                          // Unique emergency ID
  request_id: string | null           // Human-readable request ID
  service_type: string                // 'ambulance', 'bed', 'doctor', etc.
  specialty: string | null            // Medical specialty required
  status: string                      // 'in_progress', 'accepted', 'arrived', 'completed', 'cancelled'
  
  // Hospital Information
  hospital_id: string | null          // Hospital UUID
  hospital_name: string | null        // Hospital name
  
  // Ambulance Details
  ambulance_id: string | null         // Assigned ambulance ID
  ambulance_type: string | null       // 'basic', 'advanced', 'critical'
  estimated_arrival: string | null    // ETA in minutes
  
  // Bed Details (if bed request)
  bed_number: string | null           // Assigned bed number
  bed_type: string | null             // Bed type (ICU, regular, etc.)
  bed_count: string | null            // Number of beds requested
  
  // Responder (Driver) Information
  responder_id: string | null         // Driver profile UUID
  responder_name: string | null       // Driver name
  responder_phone: string | null      // Driver contact
  responder_vehicle_type: string | null // Vehicle type
  responder_vehicle_plate: string | null // License plate
  responder_location: unknown         // Real-time GPS location
  responder_heading: number | null   // Direction facing
  
  // Location & Timing
  pickup_location: unknown             // GPS coordinates for pickup
  destination_location: unknown       // GPS coordinates for destination
  created_at: string                  // When request was created
  updated_at: string                  // Last update time
  completed_at: string | null         // When completed
  cancelled_at: string | null          // When cancelled
  
  // Additional Data
  shared_data_snapshot: Json | null   // Shared medical information
}
```

---

## 🏥 **Visits Table**

```typescript
interface Visit {
  // Patient Information
  user_id: string                     // UUID of patient
  id: string                          // Unique visit ID
  
  // Hospital Information
  hospital: string | null             // Hospital name
  hospital_id: string | null          // Hospital UUID
  address: string | null              // Hospital address
  phone: string | null               // Hospital phone
  
  // Doctor Information
  doctor: string | null               // Doctor name (TEXT field)
  doctor_image: string | null         // Doctor photo
  specialty: string | null            // Medical specialty
  
  // Visit Details
  date: string | null                 // Visit date
  time: string | null                 // Visit time
  type: string | null                 // 'Consultation', 'Surgery', 'Emergency', etc.
  status: string | null               // 'scheduled', 'completed', 'cancelled'
  room_number: string | null          // Room number
  estimated_duration: string | null    // Expected duration
  
  // Medical Information
  notes: string | null                // Doctor notes
  summary: string | null              // Visit summary
  preparation: string[] | null        // Preparation instructions
  prescriptions: string[] | null      // Prescriptions
  next_visit: string | null           // Follow-up visit
  
  // Financial Information
  cost: string | null                 // Visit cost
  insurance_covered: boolean | null   // Insurance coverage
  
  // Virtual Visit
  meeting_link: string | null         // Video call link
  
  // Images & Media
  image: string | null                // Hospital/department image
  
  // Lifecycle Management
  lifecycle_state: string | null      // Visit lifecycle state
  lifecycle_updated_at: string | null // Last lifecycle update
  
  // Rating System
  rating: number | null               // Patient rating (1-5)
  rating_comment: string | null       // Rating comments
  rated_at: string | null             // When rating was given
  
  // Emergency Link
  request_id: string | null           // Linked emergency request ID
  
  // Timestamps
  created_at: string                  // When visit was created
  updated_at: string                  // Last update time
}
```

---

## 🚗 **Ambulances Table**

```typescript
interface Ambulance {
  // Basic Information
  id: string                          // Unique ambulance ID
  vehicle_number: string | null      // Vehicle number/plate
  call_sign: string | null           // Radio call sign
  type: string | null                 // 'basic', 'advanced', 'critical'
  
  // Hospital Assignment
  hospital: string | null             // Hospital name
  hospital_id: string | null          // Hospital UUID
  
  // Crew Information
  crew: string[] | null               // Crew member names/IDs
  
  // Status & Location
  status: string | null               // 'available', 'busy', 'maintenance'
  location: unknown                   // Current GPS location
  eta: string | null                  // Estimated time of arrival
  
  // Performance
  rating: number | null               // Performance rating
  
  // Maintenance
  last_maintenance: string | null     // Last maintenance date
  
  // Current Assignment
  current_call: Json | null           // Current emergency assignment details
  
  // Timestamps
  created_at: string | null           // When ambulance was added
  updated_at: string | null           // Last update time
}
```

---

## 🎯 **Key Field Relationships**

### **Emergency ↔ Ambulance Linkage**
```typescript
// Emergency assigned to ambulance
emergency.ambulance_id ↔ ambulance.id
emergency.responder_vehicle_plate ↔ ambulance.vehicle_number
emergency.responder_vehicle_type ↔ ambulance.type
```

### **Emergency ↔ Driver (Responder) Linkage**
```typescript
// Driver assigned to emergency
emergency.responder_id ↔ profiles.id (driver profile)
emergency.responder_name ↔ profiles.full_name
emergency.responder_phone ↔ profiles.phone
emergency.responder_location ↔ real-time GPS
```

### **Visit ↔ Hospital Linkage**
```typescript
// Visit at hospital
visit.hospital_id ↔ hospitals.id
visit.hospital ↔ hospitals.name
visit.address ↔ hospitals.address
```

### **Visit ↔ Doctor Linkage**
```typescript
// Doctor assigned to visit
visit.doctor ↔ profiles.full_name (TEXT field)
visit.doctor_image ↔ profiles.image_uri
visit.specialty ↔ profiles.provider_type
```

---

## 🎯 **Critical Field Types**

### **UUID Fields (for exact matching)**
```typescript
user_id: string                    // Patient UUID
responder_id: string               // Driver UUID  
hospital_id: string                // Hospital UUID
ambulance_id: string               // Ambulance UUID
```

### **Text Fields (for name matching)**
```typescript
doctor: string                     // Doctor full name
responder_name: string             // Driver name
hospital_name: string              // Hospital name
```

### **Geography Fields (GPS)**
```typescript
responder_location: unknown        // Driver real-time GPS
patient_location: unknown          // Patient GPS
pickup_location: unknown           // Pickup GPS
destination_location: unknown      // Destination GPS
```

### **JSON Fields (flexible data)**
```typescript
patient_snapshot: Json             // Patient details
shared_data_snapshot: Json         // Medical information
current_call: Json                 // Assignment details
```

---

## 🎯 **RBAC Field Mapping**

### **For Provider Filtering**
```typescript
// Visits: Filter by doctor name (TEXT)
visits.doctor: string               // "Dr. John Smith"

// Emergencies: Filter by responder_id (UUID)
emergency_requests.responder_id: string  // "uuid-of-driver"

// Hospital-based filtering
visits.hospital_id: string         // Hospital UUID
emergency_requests.hospital_id: string  // Hospital UUID
```

### **For Org Admin Filtering**
```typescript
// Organization-based access
profiles.organization_id: string    // Hospital/organization UUID
hospitals.id: string               // Hospital UUID matches org_id
```

---

## 🎯 **Privacy & Security Notes**

### **Sensitive Medical Data**
```typescript
// High privacy - limit access
visits.notes: string                // Doctor notes
visits.summary: string              // Medical summary
visits.prescriptions: string[]      // Prescriptions
patient_snapshot: Json             // Patient medical info
shared_data_snapshot: Json         // Shared medical data
```

### **Operational Data**
```typescript
// Lower privacy - operational access
emergency_requests.status: string  // Emergency status
emergency_requests.eta: string     // Arrival time
ambulances.location: unknown       // Vehicle location
responder_location: unknown        // Driver location
```

---

## 🎯 **Usage Guidelines**

### **✅ Safe for Driver Access**
```typescript
emergency_requests.status          // Emergency status
emergency_requests.eta             // Arrival time
emergency_requests.responder_id    // Their assignments
emergency_requests.hospital_id     // Hospital coordination
ambulances.location                // Vehicle location
ambulances.status                  // Vehicle status
```

### **❌ Not Safe for Driver Access**
```typescript
visits.notes                       // Patient medical notes
visits.summary                     // Medical summary
visits.prescriptions               // Prescriptions
patient_snapshot                   // Patient medical history
shared_data_snapshot              // Shared medical data
```

---

**This complete schema reference provides a global view of all tables and their relationships!** 📊✨

**Always reference this file when implementing new features or fixing data access issues.**
