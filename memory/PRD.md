# iVisit Admin Console - Product Requirements Document

## Original Problem Statement
Build a futuristic, Apple-like admin console for an application called "iVisit" - an emergency response management system.

### Key Design Requirements
- **Bento grid** layout
- **Glassmorphism** effects with blur and transparency
- **Squircle** (highly rounded) corners with no borders
- Premium, meaningful data representation
- **Hover-to-reveal** interactions and smooth animations
- Mobile-first responsiveness with **island/pill** style navigation

### Functional Requirements
- Integration with **Supabase** for backend/database
- **CRUD** (Create, Read, Update, Delete) functionality for all entities
- **Role-Based Access Control (RBAC)** - Admin, Sponsor, and other roles
- Specific pages for "God Mode Map", "Verification Queue", and "Analytics"
- Loading skeletons for better UX

## Tech Stack
- **Frontend:** React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend/DB:** Supabase (PostgreSQL)
- **Deployment:** Vercel (target)

## Database Schema
| Table | Key Fields |
|-------|------------|
| profiles | id, username, email, role, phone, bvn_verified |
| hospitals | id, name, address, status, available_beds, ambulances_count, rating |
| ambulances | id, call_sign, type, status, vehicle_number, hospital |
| doctors | id, name, specialization, hospital_id, phone, email, status, rating |
| visits | id, user_id, hospital_id, visit_type, status, scheduled_at |
| emergency_requests | id, user_id, emergency_type, priority, status, location |

## What's Been Implemented

### ✅ Completed Features (December 2025)

#### Design System
- Custom Tailwind CSS configuration with HSL-based color tokens
- Squircle border-radius (24px standard, variants for sm/lg)
- Glassmorphism utility classes
- Custom animations (shimmer, stagger, fade, slide, scale)
- Hover effects (lift, reveal, scale)
- Editorial typography styles
- **Hidden scrollbar with scroll functionality**
- **Custom favicon using iVisit logo**

#### Core Layout & Navigation
- **BentoHome.jsx** - Main dashboard with bento grid layout
- **IslandNavigation.jsx** - Island/pill navigation with:
  - Desktop (lg+): Top right floating island with theme toggle
  - Mobile/Tablet: Vertical left sidebar with scroll-to-hide
  - Expandable dropdown menu for CRUD pages
  - **Theme toggle (dark/light mode)** integrated into navigation

#### Dashboard Components
- Live emergency counter with area chart
- Response time card
- Today's requests card
- Quick access cards for all entities
- System status section with progress bars
- Recent activity feed

#### God Mode Map (P0 Complete)
- Real-time map view with simulated markers (Google Maps API blocked in preview)
- Emergency request markers with priority colors
- Ambulance unit markers with status colors
- Hospital location markers
- Layer toggle controls (Emergencies, Ambulances, Hospitals)
- Status filter (All, Pending, Dispatched, En Route)
- Live statistics sidebar
- Click-to-select marker details
- Recent emergencies list
- Real-time Supabase subscriptions

#### Verification Queue (P0 Complete)
- Pending verification count with stats cards
- Searchable user list
- Filter by verification status (Pending, Approved, All)
- User detail review modal
- Approve/Reject workflow
- Revoke verification option
- Real-time updates via Supabase

#### Analytics Dashboard (P0 Complete)
- 6 key metric stat cards with trends
- Response Time Trend area chart
- Request Status pie chart with legend
- Daily Request Volume bar chart (requests vs completed)
- Emergency Types horizontal bar chart
- Time range selector (7d, 30d, 90d)
- Export button
- Real data from Supabase

#### Dashboard Components
- Live emergency counter with area chart
- Response time card
- Today's requests card
- Quick access cards for all entities
- System status section with progress bars
- Recent activity feed

#### CRUD Pages (All with consistent design)
| Entity | Status | Features |
|--------|--------|----------|
| Hospitals | ✅ Complete | Grid view, View/Edit/Delete, Create modal |
| Ambulances | ✅ Complete | Grid view, View/Edit/Delete, Create modal |
| Users | ✅ Complete | List view, View/Edit/Delete, Create modal |
| Doctors | ✅ Complete | Grid view, View/Edit/Delete, Create modal |
| Visits | ✅ Complete | List view, View/Edit/Delete, Schedule modal |
| Emergency Requests | ✅ Complete | List view, View/Edit/Delete, Create modal |

#### CRUD Modals (Consistent glassmorphism design)
- HospitalModal.jsx
- AmbulanceModal.jsx
- UserModal.jsx
- DoctorModal.jsx
- VisitModal.jsx
- EmergencyRequestModal.jsx

#### Other Pages
- GodModeMap.jsx (placeholder)
- VerificationQueue.jsx (placeholder)
- Analytics.jsx (placeholder)

#### Infrastructure
- Supabase client configured
- AuthContext foundation for RBAC
- ProtectedRoute component
- Loading skeletons with shimmer effect

## Pending/Future Tasks

### P0 - High Priority
- [ ] Real data integration for dashboard stats (currently mock data)
- [ ] Build out God Mode Map with Google Maps integration
- [ ] Build out Verification Queue functionality
- [ ] Build out Analytics with charts

### P1 - Medium Priority
- [ ] Full RBAC implementation
  - Fetch user roles from Supabase
  - Restrict routes based on roles
  - Conditional UI rendering
- [ ] Authentication flow (login/logout)
- [ ] Real-time updates using Supabase subscriptions

### P2 - Lower Priority
- [ ] "Single focus flow" - dimming effect for focused interactions
- [ ] Beautiful back buttons refinement
- [ ] Mobile responsiveness review
- [ ] ESLint warnings cleanup
- [ ] Build optimization for Vercel deployment

## RBAC Roles (Planned)
- **Admin** - Full access to all features
- **Sponsor** - Limited access, sponsorship management
- **Provider** - Doctors, ambulance operators
- **Viewer** - Read-only access

## File Structure
```
/app/frontend/src/
├── components/
│   ├── common/
│   │   ├── IslandNavigation.jsx
│   │   ├── Navigation.jsx (PageHeader, BackButton)
│   │   ├── ProtectedRoute.jsx
│   │   └── Skeletons.jsx
│   ├── modals/
│   │   ├── AmbulanceModal.jsx
│   │   ├── DoctorModal.jsx
│   │   ├── EmergencyRequestModal.jsx
│   │   ├── HospitalModal.jsx
│   │   ├── UserModal.jsx
│   │   └── VisitModal.jsx
│   ├── pages/
│   │   ├── AmbulancesPage.jsx
│   │   ├── Analytics.jsx
│   │   ├── BentoHome.jsx
│   │   ├── DoctorsPage.jsx
│   │   ├── EmergencyRequestsPage.jsx
│   │   ├── GodModeMap.jsx
│   │   ├── HospitalsPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── VerificationQueue.jsx
│   │   └── VisitsPage.jsx
│   └── ui/ (shadcn components)
├── contexts/
│   └── AuthContext.jsx
├── lib/
│   ├── supabase.js
│   └── utils.js
├── App.js
├── App.css
└── index.css
```

## Environment Variables
```
REACT_APP_BACKEND_URL=<preview-url>
REACT_APP_SUPABASE_URL=<supabase-url>
REACT_APP_SUPABASE_ANON_KEY=<supabase-key>
REACT_APP_GOOGLE_MAPS_API_KEY=<google-maps-key>
```
