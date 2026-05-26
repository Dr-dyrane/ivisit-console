# Console Alignment Implementation Checklists

## Purpose

This folder holds narrow, executable implementation checklists derived from the pass audits. A checklist is still planning. It does not authorize database mutation, Edge invocation, email sending, Storage upload, cleanup, seed, reset, migration, or production data repair.

Use a checklist only after the relevant pass subplan and contracts are read. If source code has changed since the checklist was written, refresh the exact-line evidence before editing runtime files.

## Documents

- [Pass 1 Emergency First Implementation Checklist - 2026-05-25](./PASS_1_EMERGENCY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-25.md)
- [Pass 2 Wallet First Implementation Checklist - 2026-05-26](./PASS_2_WALLET_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md)
- [Pass 3 Facility First Implementation Checklist - 2026-05-26](./PASS_3_FACILITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md)
- [Pass 4 Identity First Implementation Checklist - 2026-05-26](./PASS_4_IDENTITY_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md)
- [Pass 5 Provider Operations First Implementation Checklist - 2026-05-26](./PASS_5_PROVIDER_OPERATIONS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md)

## Rule

Each checklist must name:

- exact runtime files in scope
- exact runtime files excluded
- source truth and receiver boundaries
- read-only cleanup versus blocked L5 repair
- field/parser risks
- visible controls to disable or move behind capability state
- app-facing consequence
- verification commands
- commit boundary

If a row cannot identify its receiver, actor scope, payload fields, reflected read, and disabled state, do not implement it yet.
