# RBAC Navigation Design - Apple Gold Standard

## Philosophy: Intelligent Progressive Access

The navigation follows Apple's **"Show, Don't Ask"** principle - users see exactly what they need, when they need it, in the order of importance to their role.

---

## Role Hierarchy & Access Patterns

### 1️⃣ **Platform Admin** (`admin`)
**Analogy**: *System Architect - Full Observatory*

**Access**: Global, unrestricted
- All navigation visible
- Can perform any action across all organizations
- Analytics show system-wide metrics
- Support tickets include escalations from all org_admins

**Navigation Philosophy**: *Complete Control, Clear Context*
- Dashboard shows multi-org health
- Can switch org context (future feature)
- Quick filters to scope to specific orgs

---

### 2️⃣ **Organization Admin** (`org_admin`)
**Analogy**: *Hospital Director - Fleet Commander*

**Access**: Organization-scoped
- Manages their hospital's resources (doctors, ambulances, beds)
- Oversees provider verification queue
- Reviews support tickets from their providers
- Can escalate to platform admin
- Views organization-specific analytics

**Navigation Philosophy**: *Strategic Oversight*
```
Main:
  ✓ Dashboard (org-scoped)
  ✓ Live Map (their org's assets)
  ✓ Statistics (org analytics)

Operations:
  ✓ Visits (all visits at their hospital)
  ✓ Emergencies (all emergencies routed to their org)
  ✓ Hospitals (manage their hospital profile)
  ✓ Ambulances (their fleet)
  ✓ Doctors (their staff)

Management:
  ✓ Support (from providers + escalate)
  ✓ Health News (create/edit news)
  ✓ Verification Queue (approve providers)
  ✗ Insurance (admin only)
  ✗ Subscriptions (admin only)
  ✗ Users (admin only)
```

---

### 3️⃣ **Provider** (`provider` - Doctors, Nurses, Specialists)
**Analogy**: *Frontline Clinician - Focused Workspace*

**Access**: Self-scoped + assigned records
- Only sees their own visits and emergencies
- Cannot manage other doctors
- Profile management for their own metadata
- Submit support tickets (to org_admin)
- Read health news (stay informed)

**Navigation Philosophy**: *Calm Focus, Remove Distractions*
```
Main:
  ✓ Dashboard (their schedule, pending visits)
  ✓ Live Map (emergencies they can respond to)
  ✗ Statistics (too broad, not actionable)

Operations:
  ✓ Visits (only their assigned visits)
  ✓ Emergencies (only where they're assigned/available)
  ✗ Hospitals (not their concern)
  ✗ Ambulances (handled by dispatch)
  ✗ Doctors (manage via Profile → Professional Info)

Management:
  ✓ Support (submit tickets to org_admin)
  ✓ Health News (read-only, stay updated)
  ✗ All admin functions
```

**Why Hide "Doctors Page" from Providers?**
- Doctors don't manage other doctors
- Their own professional info lives in Settings → Profile
- Reduces cognitive load
- Follows Apple's "One Task, One Place" principle

---

### 4️⃣ **Sponsor** (`sponsor`)
**Analogy**: *Community Supporter - Observer*

**Access**: Read-only, limited
- View analytics (impact of their support)
- See general statistics
- Cannot modify data

**Navigation Philosophy**: *Transparent Impact*
```
Main:
  ✓ Dashboard (impact overview)
  ✓ Statistics (how funds are used)
  
Operations/Management:
  ✗ All (read-only analytics only)
```

---

### 5️⃣ **Viewer** (`viewer`)
**Analogy**: *Auditor/Observer - Dashboard Only*

**Access**: Minimal, read-only
- Dashboard
- Maybe limited analytics

---

## Support Ticket Workflow (3-Tier System)

### Provider → Org Admin
1. Provider encounters issue (billing, schedule, access)
2. Submits ticket via Support page
3. Org Admin sees in their queue
4. Resolves or escalates

### Org Admin → Platform Admin
1. Org Admin faces technical/system issue
2. Escalates ticket with context
3. Platform Admin receives in master queue
4. Resolves or coordinates with dev team

### Visibility Rules
- **Provider**: Only their submitted tickets
- **Org Admin**: All tickets from their providers + their own escalations
- **Platform Admin**: All tickets (filterable by org)

---

## Apple-Quality Principles Applied

### 1. **Progressive Disclosure**
- Start with essentials (Dashboard, Map for providers)
- Reveal complexity as role requires it
- Org Admins see "Operations" group expand
- Admins see all groups

### 2. **Spatial Consistency**
- Navigation order never changes
- Items are removed, not rearranged
- Muscle memory stays intact across roles

### 3. **Intelligent Defaults**
- Providers land on Dashboard (their schedule)
- Org Admins land on Dashboard (org health)
- Admins land on Dashboard (system overview)

### 4. **Seamless Transitions**
- When provider is promoted to org_admin, new items appear with subtle animation
- No jarring changes, just gentle expansion of capability

### 5. **Feedback Without Friction**
- Support button always visible to everyone who can submit
- One tap to create ticket
- No multi-step wizards

### 6. **Respect for Context**
- Map shows only relevant assets (provider sees emergencies in their area)
- Analytics auto-scope to role (no manual filtering)
- Data services auto-apply RBAC filters

---

## Data Access Patterns (Service Layer)

### Provider Data Access
```javascript
// Visits: Only assigned to them
query = query.eq('doctor_id', currentDoctorId);

// Emergencies: Only where they're involved
query = query.or(`assigned_doctor_id.eq.${doctorId},available_for.cs.{${doctorId}}`);

// Support: Only their tickets
query = query.eq('created_by', userId);

// News: All (read-only enforced at component level)
query = query.select('*'); // No .insert() permission
```

### Org Admin Data Access
```javascript
// Visits: All at their hospital
query = query.eq('hospital_id', orgId);

// Doctors: All at their hospital
query = query.eq('hospital_id', orgId);

// Support: Their providers + their escalations
query = query.or(`created_by.in.(${orgProviderIds}),created_by.eq.${orgAdminId}`);
```

### Platform Admin Data Access
```javascript
// Everything, optionally filtered by org context
query = query; // No RBAC filter unless they choose to scope
```

---

## Read-Only Enforcement Strategy

### News for Providers
1. Navigation shows "Health News" ✓
2. Page loads in read-only mode
3. No "Add News" button rendered
4. Edit/Delete icons hidden
5. Clicking article opens modal (read-only)

**Implementation**:
```javascript
// In HealthNewsPage.jsx
const canEdit = can('edit', 'news'); // false for providers
const canCreate = can('create', 'news'); // false for providers

// Conditionally render actions
{canCreate && <Button>Add News</Button>}
{canEdit && <EditButton />}
```

---

## Future Enhancements

### 1. **Context Switching for Admins**
- Platform admin can "view as" specific org
- Temporarily scope all data to that org
- Clear indicator of scoped mode
- One-click to return to global view

### 2. **Smart Notifications**
- Providers get notified of new visits/emergencies
- Org Admins get support ticket alerts
- Platform Admins get escalation alerts

### 3. **Role-Based Onboarding**
- New provider sees tour of Visits, Emergencies, Support
- New org_admin sees tour of Fleet Management
- Contextual, never generic

### 4. **Adaptive Navigation**
- If provider has 0 pending visits, Visits badge shows green checkmark
- If org_admin has pending verifications, Queue shows count
- Navigation becomes a live status dashboard

---

## Testing Scenarios

### Test as Provider
1. Login as doctor
2. Verify navigation shows: Dashboard, Map, Visits, Emergencies, Support, News
3. Verify hidden: Doctors, Hospitals, Ambulances, Analytics, Verification, Insurance, Users
4. Test Support → can create ticket
5. Test News → cannot edit
6. Test Visits → only see assigned visits
7. Test clicking Doctors link doesn't exist

### Test as Org Admin
1. Login as hospital admin
2. Verify full Operations group visible
3. Test Doctors page → manage doctors
4. Test Support → see provider tickets + escalate
5. Test Verification → approve providers

### Test as Platform Admin
1. See everything
2. Support shows all tiers
3. Can access all orgs' data

---

## Implementation Status

✅ Navigation config updated
✅ ROLE_LEVELS defined
✅ getAccessibleNav() filtering
✅ Service layer RBAC (applyAuthFilter)
🔄 Component-level read-only enforcement (in progress)
🔄 Support ticket tier system (to implement)
⏳ Context switching for admins (future)

---

**Designed with relentless focus on user needs, not system capabilities.**
