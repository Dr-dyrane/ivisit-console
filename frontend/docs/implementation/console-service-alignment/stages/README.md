# Console Alignment Stages

## Purpose

Stage docs are the audit spine. They describe what was audited, what remains uncertain, and when implementation is allowed to begin.

## Documents

- [Stage 2 Service Data Flow Audit - 2026-05-24](./STAGE_2_SERVICE_DATA_FLOW_AUDIT_2026-05-24.md) - Stage 2 method, scope, and first service inventory.
- [Stage 3 Console Capability Gap Audit - 2026-05-24](./STAGE_3_CONSOLE_CAPABILITY_GAP_AUDIT_2026-05-24.md) - Page-level Supabase calls, context-owned server data, duplicate services, mock paths, realtime ownership, and route loading feedback.
- [Stage 4 L5 State Data Ownership Audit - 2026-05-24](./STAGE_4_L5_STATE_DATA_OWNERSHIP_AUDIT_2026-05-24.md) - Surface/service ownership matrix for source of truth, console consumption, missing consumption, writes, drift, and required owner.
- [Stage 6 Implementation Pass Plan - 2026-05-24](./STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md) - Ordered implementation pass inputs, receiver/field and trace gates, work packages, acceptance gates, verification expectations, and commit boundary.

## Rule

Stages summarize. They should not become the home for every service detail. Put exact service coverage in `../services`, domain comparisons in `../service-maps`, and executable user-flow plans in `../passes`.
