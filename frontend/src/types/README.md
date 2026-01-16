# TypeScript Types Documentation

This directory contains all TypeScript interfaces and types for the iVisit Console application.

## Emergency Types (`emergency.ts`)

### Usage Example

```typescript
import {
  EmergencyRequest,
  EmergencyStatus,
  CreateEmergencyRequestInput,
  GeoPoint,
  EmergencyRequestDisplay,
} from '@/types/emergency';

// Create new emergency request
const input: CreateEmergencyRequestInput = {
  user_id: 'user-123',
  service_type: 'ambulance',
  specialty: 'cardiology',
  pickup_location: {
    type: 'Point',
    coordinates: [-118.243683, 34.052235], // [longitude, latitude]
  },
  destination_location: {
    type: 'Point',
    coordinates: [-118.285167, 34.063611],
  },
};

// Create request
const request = await createEmergencyRequest(input);

// Update responder location
await updateResponderLocation(request.id, {
  type: 'Point',
  coordinates: [-118.244, 34.053],
}, 45); // heading in degrees

// Subscribe to real-time updates
const unsubscribe = subscribeToEmergencyRequest(request.id, (updated) => {
  console.log('Request updated:', updated);
});
```

### Key Types

#### `EmergencyRequest`
Complete emergency request record with all 31 columns from database.

**Properties:**
- `id` - Primary key (text, not UUID)
- `user_id` - UUID of requester
- `status` - One of: `in_progress`, `pending`, `accepted`, `completed`, `cancelled`
- `service_type` - Type of service needed
- `hospital_id` - Destination hospital
- `ambulance_id` - Assigned ambulance
- `responder_id`, `responder_name`, `responder_phone` - Ambulance responder info
- `pickup_location` - GeoJSON Point (coordinates: [lon, lat])
- `destination_location` - Hospital destination
- `patient_location` - Current patient location
- `responder_location` - Ambulance current location
- `patient_snapshot` - Medical info snapshot (JSONB)
- `created_at`, `updated_at`, `completed_at`, `cancelled_at` - Timestamps

#### `CreateEmergencyRequestInput`
Input for creating new emergency request.

```typescript
{
  user_id: string;
  service_type: string;
  specialty?: string;
  pickup_location: GeoPoint;
  destination_location?: GeoPoint;
  patient_snapshot?: PatientSnapshot;
  shared_data_snapshot?: SharedDataSnapshot;
  estimated_arrival?: string;
}
```

#### `UpdateEmergencyRequestInput`
Input for updating emergency request.

```typescript
{
  status?: EmergencyStatus;
  ambulance_id?: string;
  responder_id?: string;
  responder_location?: GeoPoint;
  responder_heading?: number;
  patient_location?: GeoPoint;
  patient_heading?: number;
  completed_at?: string;
  cancelled_at?: string;
}
```

#### `GeoPoint`
GeoJSON Point for location data. Follows GeoJSON standard.

```typescript
{
  type: 'Point';
  coordinates: [longitude, latitude]; // Note: longitude first!
}
```

**Example:**
```typescript
const location: GeoPoint = {
  type: 'Point',
  coordinates: [-118.243683, 34.052235], // Los Angeles
};
```

#### `EmergencyStatus`
Enum of possible statuses.

```typescript
enum EmergencyStatus {
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

#### `PatientSnapshot`
Medical data captured at time of emergency.

```typescript
{
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  emergency_contact?: string;
  medical_notes?: string;
}
```

#### `EmergencyRequestDisplay`
Extended type with computed fields for UI display.

Adds computed properties:
- `distance_to_destination` - meters
- `time_elapsed` - seconds
- `response_time` - seconds (created to accepted)
- `is_overdue` - boolean
- `priority_level` - 'critical' | 'high' | 'medium' | 'low'
- `patient_name` - from profiles table

### Service Integration

The `emergencyService.ts` provides complete CRUD operations:

```typescript
import * as emergencyService from '@/services/emergencyService';

// Query operations
const requests = await emergencyService.getEmergencyRequests({
  status: EmergencyStatus.IN_PROGRESS,
  limit: 10,
});

const active = await emergencyService.getActiveEmergencyRequests();

const stats = await emergencyService.getEmergencyStats();

// Mutations
const created = await emergencyService.createEmergencyRequest(input);
const updated = await emergencyService.updateEmergencyRequest(id, updates);
const accepted = await emergencyService.acceptEmergencyRequest(id, ambulanceId, responderId, name, phone);
const completed = await emergencyService.completeEmergencyRequest(id);
const cancelled = await emergencyService.cancelEmergencyRequest(id);

// Real-time subscriptions
const unsubscribe = emergencyService.subscribeToEmergencyRequest(id, (request) => {
  console.log('Updated:', request);
});

const unsubscribeAll = emergencyService.subscribeToAllEmergencyRequests((request, eventType) => {
  console.log(`${eventType}:`, request);
});
```

### Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { EmergencyRequest } from '@/types/emergency';
import * as emergencyService from '@/services/emergencyService';

export function EmergencyDashboard() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    emergencyService
      .getActiveEmergencyRequests()
      .then(setRequests)
      .finally(() => setLoading(false));

    // Subscribe to real-time updates
    const unsubscribe = emergencyService.subscribeToAllEmergencyRequests(
      (request, eventType) => {
        setRequests((prev) => {
          if (eventType === 'DELETE') {
            return prev.filter((r) => r.id !== request.id);
          }
          const index = prev.findIndex((r) => r.id === request.id);
          if (index >= 0) {
            return [...prev.slice(0, index), request, ...prev.slice(index + 1)];
          }
          return [request, ...prev];
        });
      }
    );

    return unsubscribe;
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Active Emergencies: {requests.length}</h1>
      {requests.map((request) => (
        <div key={request.id}>
          <h3>{request.service_type}</h3>
          <p>Status: {request.status}</p>
          <p>Responder: {request.responder_name}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Adding More Types

For each new table, follow this pattern:

1. **Create type file** (`src/types/[table-name].ts`)
   - Define interfaces for the table
   - Include input types (Create, Update, Filter)
   - Add any enums for fixed values

2. **Create service file** (`src/services/[table-name]Service.ts`)
   - Implement CRUD operations
   - Use typed inputs/outputs
   - Add real-time subscriptions if needed
   - Include error handling

3. **Export from index** (optional, for easier imports)
   ```typescript
   // src/types/index.ts
   export * from './emergency';
   export * from './hospital';
   ```

---

## Best Practices

✅ **DO:**
- Use types throughout your application
- Keep types close to where they're used
- Use enums for fixed values (status, type, etc.)
- Include JSDoc comments
- Validate data before creating/updating

❌ **DON'T:**
- Use `any` types
- Create overly generic types
- Put business logic in types
- Forget to handle null/undefined

---

## Testing Types

```typescript
import { EmergencyRequest, EmergencyStatus } from '@/types/emergency';

// Type checking at compile time
const request: EmergencyRequest = {
  id: 'req-123',
  service_type: 'ambulance',
  status: EmergencyStatus.ACCEPTED, // ✅ TypeScript knows these values
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // ❌ TypeScript error if you forget required fields
};
```

---

## Related Files

- Service layer: `/src/services/emergencyService.ts`
- Database schema: `/docs/DATABASE_SCHEMA.md`
- Supabase client: `/src/lib/supabase.js`
