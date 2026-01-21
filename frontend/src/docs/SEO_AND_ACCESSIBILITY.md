# SEO & Accessibility Improvements v1.0

## Overview
This update focuses on improving the Search Engine Optimization (SEO) and Web Accessibility (a11y) of the iVisit Console application.

## 1. SEO Implementation
We integrated `react-helmet-async` to manage document head tags dynamically.

### Components
- **`HelmetProvider`**: Wrapped the entire application in `src/index.js` to provide context for Helmet.
- **`SEOHead`**: A reusable component (`src/components/common/SEOHead.jsx`) created to easily manage:
  - `<title>`: Dynamic page titles (e.g., "Dashboard | iVisit Console").
  - `<meta name="description">`: Page-specific descriptions.
  - `<meta property="og:...">`: Open Graph tags for social sharing.
  - `<link rel="canonical">`: Canonical URLs.

### Usage
The `SEOHead` component is implemented in all major pages:
- **Dashboard**: `BentoHome.jsx`
- **Fleet**: `AmbulancesPage.jsx`
- **Facilities**: `HospitalsPage.jsx`
- **Staff**: `DoctorsPage.jsx`
- **Visits**: `VisitsPage.jsx`
- **Emergency**: `EmergencyRequestsPage.jsx`
- **Users**: `UsersPage.jsx`
- **Support**: `SupportTicketsPage.jsx`
- **Health News**: `HealthNewsManagementPage.jsx`

## 2. Accessibility (a11y)
We conducted an audit of interactive elements, specifically icon-only buttons, and added descriptive `aria-label` attributes to ensure screen reader compatibility.

### Updates
- **Grid/Table/List Actions**: Added `aria-label` to "View", "Edit", "Delete" buttons in all view components.
  - *Example*: `aria-label="View details for Dr. Smith"` instead of just an icon.
- **Filter Buttons**: Added `aria-label="Filter [resource]"` to all filter toggle buttons.
- **Header Actions**: Added `aria-label` to "Add New [Resource]" buttons where text might be hidden or icon-primary.
- **KPI Toggles**: Added `aria-label` to statistics toggle buttons (e.g., in Users page).

## 3. Dependencies
- Added `react-helmet-async` (npm install).

## Future Recommendations
- **Sitemap**: Generate a sitemap.xml for better crawling (if public facing).
- **Alt Text**: Ensure all dynamic images (avatars, uploads) have meaningful `alt` text (partially addressed in UsersPage).
- **Keyboard Navigation**: standard testing of tab order (standard HTML elements usually handle this well).
