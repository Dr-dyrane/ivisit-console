# Database

## 📋 **Contents**

Complete database schema, type definitions, and data relationships.

### **📖 [README](../README.md)** ← Back to Main Documentation

### **📚 Available Documents**

#### **📊 [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)**
**⭐ PRIMARY REFERENCE** - Complete database schema with all table definitions, field types, and relationships.

#### **🔧 Database Types**
Generated TypeScript types from Supabase database schema in `src/types/database.ts`.

---

## 🎯 **Database Features**

### **✅ Complete Schema**
```bash
✅ Emergency Requests Table (30+ fields)
✅ Visits Table (30+ fields)  
✅ Ambulances Table (15+ fields)
✅ Profiles Table (user management)
✅ Hospitals Table (facility management)
✅ All supporting tables
```

### **✅ Type Safety**
```typescript
// Generated from database schema
interface DatabaseEmergencyRequest {
  responder_id: string | null         // Driver UUID
  patient_location: unknown          // GPS coordinates
  hospital_id: string | null          // Hospital UUID
  // All fields properly typed
}
```

### **✅ Relationships**
```typescript
// Tight integration points
emergency_requests.responder_id ↔ profiles.id (driver)
emergency_requests.hospital_id ↔ hospitals.id
visits.doctor ↔ profiles.full_name (doctor name)
```

---

## 🎯 **Key Tables**

### **🚑 Emergency Requests**
- Patient information and location
- Driver assignment and tracking
- Hospital coordination
- Real-time updates
- Service completion tracking

### **🏥 Visits**
- Patient appointments
- Doctor assignments
- Hospital information
- Medical records
- Billing and insurance

### **🚗 Ambulances**
- Vehicle management
- Crew assignments
- Location tracking
- Maintenance records
- Performance metrics

### **👥 Profiles**
- User management
- Role assignments
- Organization links
- Provider types
- Contact information

---

## 🎯 **Schema Generation**

### **🔄 Regenerate Types**
```bash
# PowerShell
.\scripts\generate-types.ps1

# Bash  
./scripts/generate-types.sh
```

### **📊 Generated Files**
```bash
✅ src/types/database.ts (2,486 lines)
✅ All table schemas with exact field types
✅ Row/Insert/Update/Relationship types
✅ Real-time sync with Supabase schema
```

---

## 🎯 **Usage Guidelines**

### **💻 For Development**
```typescript
// Import database types
import { DatabaseEmergencyRequest } from '@/types';
import type { Database } from '@/types';

// Use exact field types
emergency.responder_id // string | null
visit.doctor           // string | null (TEXT field)
```

### **🔧 For Service Layer**
```typescript
// Proper field matching
if (resourceType === 'visit') {
  query = query.eq('doctor', user.full_name); // TEXT in TEXT
} else if (resourceType === 'emergency') {
  query = query.eq('responder_id', user.id);  // UUID in UUID
}
```

---

## 🎯 **Critical Field Types**

### **✅ UUID Fields (Exact Matching)**
```typescript
user_id: string                    // Patient UUID
responder_id: string               // Driver UUID  
hospital_id: string                // Hospital UUID
ambulance_id: string               // Ambulance UUID
```

### **✅ Text Fields (Name Matching)**
```typescript
doctor: string                     // Doctor full name
responder_name: string             // Driver name
hospital_name: string              // Hospital name
```

### **✅ Geography Fields (GPS)**
```typescript
responder_location: unknown        // Driver real-time GPS
patient_location: unknown          // Patient GPS
pickup_location: unknown           // Pickup GPS
```

---

## 🎯 **Privacy & Security**

### **🚑 Sensitive Medical Data**
```typescript
// High privacy - limit access
visits.notes: string                // Doctor notes
visits.prescriptions: string[]      // Prescriptions
patient_snapshot: Json             // Patient medical info
```

### **🔐 Operational Data**
```typescript
// Lower privacy - operational access
emergency_requests.status: string  // Emergency status
ambulances.location: unknown       // Vehicle location
responder_location: unknown        // Driver location
```

---

## 🎯 **Database "Bible"**

The [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) serves as the definitive reference for:

- All table schemas and field types
- Proper data matching patterns
- Relationship definitions
- Privacy and security guidelines
- Usage examples and best practices

---

**Return to [Main Documentation](../README.md)** 📚
