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

#### Core Layout & Navigation
- **BentoHome.jsx** - Main dashboard with bento grid layout
- **IslandNavigation.jsx** - Island/pill navigation with dropdown menu
  - Desktop: Top right floating island
  - Mobile: Bottom pill navigation
  - Expandable menu for CRUD pages

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
