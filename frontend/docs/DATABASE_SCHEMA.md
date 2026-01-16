# iVisit Console - Database Schema Documentation

**Last Updated:** January 16, 2026  
**Environment:** Supabase PostgreSQL  
**Total Tables:** 20 (1 PostGIS system table)

---

## 📊 Database Overview

| Table | Rows | Purpose | Status |
|-------|------|---------|--------|
| **spatial_ref_sys** | 8,500 | PostGIS coordinate system reference | System |
| **emergency_requests** | 191 | Emergency ambulance/medical requests | Core |
| **notifications** | 140 | User notifications log | Core |
| **visits** | 91 | Medical visit records | Core |
| **preferences** | 14 | User preferences | Core |
| **profiles** | 14 | User accounts & roles | Core |
| **insurance_policies** | 14 | Insurance plan data | Reference |
| **hospitals** | 12 | Hospital facility records | Reference |
| **health_news** | 10 | News feed content | Content |
| **medical_profiles** | 10 | Patient medical history | Core |
| **ambulances** | 10 | Ambulance fleet data | Reference |
| **trending_topics** | 10 | Trending health topics | Content |
| **search_events** | 10 | Search analytics | Analytics |
| **doctors** | 8 | Doctor directory | Reference |
| **search_history** | 6 | User search history | Analytics |
| **subscribers** | 2 | Email subscribers | Reference |
| **support_faqs** | 0 | Support FAQ database | Reference |
| **support_tickets** | 0 | Support tickets | Reference |
| **search_selections** | 1 | Search filter selections | Analytics |

---

## 🔑 Core Tables (Critical for MVP)

### 1. **profiles** (14 rows)
User account and authentication data.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY) - User ID from Supabase Auth
- `email` (text) - Email address
- `role` (text) - admin, provider, sponsor, viewer
- `username` (text) - Display name
- `avatar_url` (text) - Profile picture
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Uses:**
- User authentication & authorization
- Role-based access control (RBAC)
- User profile display

---

### 2. **doctors** (8 rows)
Doctor directory and credentials.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `name` (text)
- `specialization` (text)
- `hospital_id` (uuid, FK → hospitals)
- `license_number` (text)
- `phone` (text)
- `email` (text)
- `rating` (float)
- `verified` (boolean)
- `created_at` (timestamp)

**Uses:**
- Doctor search & filtering
- Doctor profile display
- Booking appointments
- Verification status

---

### 3. **hospitals** (12 rows)
Hospital/facility database.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `name` (text)
- `address` (text)
- `latitude` (float)
- `longitude` (float)
- `phone` (text)
- `email` (text)
- `bed_count` (integer)
- `status` (text) - active, inactive
- `verified` (boolean)
- `created_at` (timestamp)

**Uses:**
- Map display
- Hospital search
- Emergency request routing
- Hospital details page

---

### 4. **ambulances** (10 rows)
Ambulance fleet management.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `plate_number` (text)
- `hospital_id` (uuid, FK → hospitals)
- `driver_name` (text)
- `driver_phone` (text)
- `latitude` (float)
- `longitude` (float)
- `status` (text) - available, on_call, maintenance
- `equipment_level` (text) - basic, advanced
- `created_at` (timestamp)

**Uses:**
- Real-time ambulance tracking
- Emergency dispatch
- Fleet management
- Location updates

---

### 5. **emergency_requests** (191 rows) ⚡ **HIGH PRIORITY**
Emergency call/request log. **31 columns total**.

**Core Columns:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | text | NO | Primary key (request ID) |
| `request_id` | text | YES | Alternative request identifier |
| `user_id` | uuid | YES | FK → profiles (requester) |
| `service_type` | text | NO | ambulance, consultation, emergency_room, critical_care |
| `status` | text | NO | Default: 'in_progress' → pending, accepted, completed, cancelled |
| `created_at` | timestamp tz | NO | Default: now() - when created |
| `updated_at` | timestamp tz | NO | Default: now() - last update |
| `completed_at` | timestamp tz | YES | When completed |
| `cancelled_at` | timestamp tz | YES | When cancelled |

**Hospital/Facility Columns:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `hospital_id` | text | YES | FK → hospitals |
| `hospital_name` | text | YES | Denormalized hospital name |
| `specialty` | text | YES | Medical specialty requested |
| `bed_number` | text | YES | Specific bed assigned |
| `bed_type` | text | YES | icu, standard, isolation, pediatric |
| `bed_count` | text | YES | Available beds at hospital |

**Ambulance/Responder Columns:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `ambulance_type` | text | YES | basic, advanced, critical_care |
| `ambulance_id` | text | YES | FK → ambulances |
| `responder_id` | uuid | YES | FK → profiles (driver/medic) |
| `responder_name` | text | YES | Name of responder |
| `responder_phone` | text | YES | Contact phone |
| `responder_vehicle_type` | text | YES | Vehicle type (ambulance, bike, etc) |
| `responder_vehicle_plate` | text | YES | License plate number |

**Location Columns (PostGIS geometry - USER-DEFINED type):**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `pickup_location` | geometry | YES | GeoJSON Point - where to pick up patient |
| `destination_location` | geometry | YES | GeoJSON Point - hospital/destination |
| `patient_location` | geometry | YES | Current patient location |
| `patient_heading` | double | YES | Compass bearing 0-360° |
| `responder_location` | geometry | YES | Ambulance current location |
| `responder_heading` | double | YES | Ambulance heading 0-360° |

**Medical Data Columns (JSON):**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `patient_snapshot` | jsonb | YES | Medical snapshot: blood_type, allergies, conditions, medications |
| `shared_data_snapshot` | jsonb | YES | Data shared with responders/hospitals |
| `estimated_arrival` | text | YES | ETA or duration estimate |

**Uses:**
- Emergency dispatch dashboard (real-time updates)
- Live ambulance tracking (map integration)
- Emergency queue management
- Response time analytics
- Success rate reporting
- Historical emergency logs

---

### 6. **visits** (91 rows)
Medical visit records.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `doctor_id` (uuid, FK → doctors)
- `hospital_id` (uuid, FK → hospitals)
- `visit_date` (timestamp)
- `visit_type` (text) - consultation, checkup, surgery
- `notes` (text)
- `status` (text) - scheduled, completed, cancelled
- `prescription` (text)
- `created_at` (timestamp)

**Uses:**
- Visit history
- Doctor/hospital analytics
- Patient medical records
- Appointment scheduling

---

### 7. **medical_profiles** (10 rows)
Patient medical history and conditions.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `blood_type` (text)
- `allergies` (text[])
- `chronic_conditions` (text[])
- `medications` (text[])
- `emergency_contact` (text)
- `insurance_id` (uuid, FK → insurance_policies)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Uses:**
- Medical records display
- Emergency response
- Doctor consultation context

---

### 8. **insurance_policies** (14 rows)
Insurance plan data.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `provider_name` (text)
- `policy_number` (text)
- `coverage_type` (text) - basic, premium, platinum
- `expiry_date` (date)
- `active` (boolean)
- `created_at` (timestamp)

**Uses:**
- Insurance verification
- Coverage checking
- Patient eligibility

---

## 📱 Activity & Notifications

### 9. **notifications** (140 rows)
User notification log.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `type` (text) - emergency_alert, appointment_reminder, message
- `title` (text)
- `message` (text)
- `read` (boolean)
- `action_url` (text)
- `created_at` (timestamp)
- `read_at` (timestamp)

**Uses:**
- Notification feed
- Real-time alerts
- User engagement

---

### 10. **preferences** (14 rows)
User settings and preferences.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `notifications_enabled` (boolean)
- `language` (text)
- `theme` (text) - light, dark
- `location_sharing` (boolean)
- `emergency_alerts` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Uses:**
- User settings
- Notification preferences
- Theme/localization

---

## 📊 Analytics & Search

### 11. **search_history** (6 rows)
User search activity log.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `query` (text)
- `query_type` (text) - doctor, hospital, service
- `results_count` (integer)
- `created_at` (timestamp)

**Uses:**
- Search analytics
- Popular queries
- User behavior tracking

---

### 12. **search_events** (10 rows)
Detailed search interaction events.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `event_type` (text) - search, filter, sort, view
- `search_id` (uuid, FK → search_history)
- `result_id` (uuid) - doctor/hospital clicked
- `created_at` (timestamp)

**Uses:**
- Search funnel analysis
- Popular results
- UX optimization

---

### 13. **search_selections** (1 row)
Search filter/selection state.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `filters` (jsonb) - saved filter state
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Uses:**
- Saved search filters
- Filter persistence

---

## 📰 Content

### 14. **health_news** (10 rows)
Health news feed content.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `title` (text)
- `description` (text)
- `content` (text)
- `image_url` (text)
- `source` (text)
- `category` (text) - wellness, disease, treatment
- `views` (integer)
- `published_at` (timestamp)
- `created_at` (timestamp)

**Uses:**
- News feed display
- Health education
- User engagement

---

### 15. **trending_topics** (10 rows)
Trending health topics.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `topic_name` (text)
- `category` (text)
- `trend_score` (float)
- `views` (integer)
- `articles_count` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Uses:**
- Trending section
- Popular searches
- Content recommendations

---

## 💬 Support

### 16. **support_tickets** (0 rows)
Support/help desk tickets.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FK → profiles)
- `subject` (text)
- `description` (text)
- `status` (text) - open, in_progress, resolved, closed
- `priority` (text) - low, medium, high
- `assigned_to` (uuid, FK → profiles)
- `created_at` (timestamp)
- `resolved_at` (timestamp)

**Uses:**
- Help desk system
- User support

---

### 17. **support_faqs** (0 rows)
FAQ database.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `category` (text)
- `question` (text)
- `answer` (text)
- `views` (integer)
- `helpful_count` (integer)
- `created_at` (timestamp)

**Uses:**
- FAQ display
- Self-service help

---

## 📧 Reference

### 18. **subscribers** (2 rows)
Email subscriber list.

**Likely Columns:**
- `id` (uuid, PRIMARY KEY)
- `email` (text)
- `subscribed` (boolean)
- `created_at` (timestamp)
- `unsubscribed_at` (timestamp)

**Uses:**
- Email marketing list
- Newsletter management

---

## 🗺️ System

### 19. **spatial_ref_sys** (8,500 rows)
PostGIS coordinate system reference (auto-managed).

**Purpose:** Geographic data support for location features.

**Uses:**
- Map/location features
- Geospatial queries

---

## 🔗 Data Relationships

```
profiles (14)
├── medical_profiles (10)
├── insurance_policies (14)
├── preferences (14)
├── visits (91) → doctors (8)
├── emergency_requests (191) → ambulances (10)
├── notifications (140)
├── search_history (6)
├── search_events (10)
└── support_tickets (0)

hospitals (12)
├── doctors (8)
├── ambulances (10)
└── emergency_requests (191)

trending_topics (10)
health_news (10)
search_selections (1)
support_faqs (0)
subscribers (2)
```

---

## 📋 PageDataContext Feeds

Based on current tables, PageDataContext should provide:

```javascript
{
  // Emergency/Live Data
  emergencyStats: {
    liveEmergencies: emergency_requests.filter(status='in_progress'),
    responseTime: avg(emergency_requests.response_time),
    successRate: count(completed)/count(total)
  },

  // Analytics
  analyticsData: {
    visitsTrend: visits grouped by date,
    emergencyTrend: emergency_requests grouped by date,
    hospitalStats: hospitals with visit_count
  },

  // Directory
  doctorsData: doctors + specialization,
  hospitalsData: hospitals + services,
  ambulancesData: ambulances + status,

  // User Data
  visitsData: visits + doctor_name + hospital_name,
  medicalProfile: medical_profiles + insurance
}
```

---

## 🎯 Priority Implementation Order

### Phase 1 (MVP - Most Critical)
1. ✅ **profiles** - Auth foundation
2. ✅ **emergency_requests** - Core feature
3. ✅ **hospitals** - Reference data
4. ✅ **ambulances** - Live tracking
5. ✅ **doctors** - Directory

### Phase 2 (Essential Features)
6. **visits** - Medical records
7. **medical_profiles** - Patient info
8. **notifications** - User engagement
9. **insurance_policies** - Coverage

### Phase 3 (Analytics & Content)
10. **search_history** - Analytics
11. **health_news** - Content feed
12. **trending_topics** - Discovery

### Phase 4 (Polish)
13. **support_tickets** - Help system
14. **preferences** - User settings

---

## 🚀 Next Steps

1. **Run detailed schema query** - Get column names and types
2. **Create TypeScript interfaces** - One per table
3. **Update PageDataContext** - Feed correct queries
4. **Build API service layer** - Encapsulate Supabase calls
5. **Add data validation** - Ensure data integrity
6. **Mock data script** - Generate test data

---

## 📞 Queries to Run Next

Get complete table structures:

```sql
-- Get all column details for a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'emergency_requests'
ORDER BY ordinal_position;

-- Get all constraints and indexes
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'emergency_requests';

-- Get foreign key relationships
SELECT column_name, constraint_name
FROM information_schema.key_column_usage
WHERE table_name = 'emergency_requests';
```
