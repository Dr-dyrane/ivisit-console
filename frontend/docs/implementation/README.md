# Implementation Documentation

## Overview

Implementation guides and technical documentation for iVisit Console features and alignment work.

## Active Alignment Work

- **[Console-App Alignment Audit - 2026-05-24](./CONSOLE_APP_ALIGNMENT_AUDIT_2026-05-24.md)** - Current target plan for matching console data flow, CRUD, RPCs, and operational UI to `ivisit-app`.
- **[Console Alignment Audit Program - 2026-05-24](./CONSOLE_ALIGNMENT_AUDIT_PROGRAM_2026-05-24.md)** - Staged audit method and commit boundaries before implementation.
- **[Stage 1 Database Truth Audit - 2026-05-24](./STAGE_1_DATABASE_TRUTH_AUDIT_2026-05-24.md)** - Started schema, RPC, trigger, policy, Edge Function, ID, and Postgres truth audit.
- **[Console Service Alignment](./console-service-alignment/README.md)** - Active Stage 2-6 service, feature, contract, and implementation-planning subtree against database truth and `ivisit-app`.

## Available Documentation

### RBAC Implementation

- **[Dashboard RBAC](../rbac/RBAC_DASHBOARD_IMPLEMENTATION.md)** - Role-based dashboard setup.
- **[Scope-Based RBAC](../rbac/SCOPE_BASED_RBAC_GUIDE.md)** - Service-level patterns.
- **[Navigation RBAC](../rbac/RBAC_NAVIGATION_DESIGN.md)** - Navigation access control.

### Bug Fixes And Optimizations

- **[Infinite Loop Fixes](../fixes/INFINITE_LOOP_FIXES.md)** - React hook dependency issues.

## Implementation Status

### Current Focus

- Align console schema, RPC, service, CRUD, realtime, and operational UI flows to the current patient app and console-only operations.
- Keep implementation gated by the service taxonomy, contract exhibits, and user-flow pass subplans rather than broad page-by-page patching.

### Stable But Needs Recheck During Alignment

- RBAC system.
- Role-appropriate dashboard structure.
- Navigation access patterns.
- Existing optimization plans in `../architecture/`.

---

**Last Updated**: May 24, 2026
**Status**: Active alignment work
