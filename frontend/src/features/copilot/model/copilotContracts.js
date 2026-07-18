import { z } from 'zod';

export const COPILOT_ACTION_IDS = Object.freeze({
  DASHBOARD_EXPLAIN: 'dashboard.explain',
  ORGANIZATION_EXPLAIN_READINESS: 'organization.explain_readiness',
  EMERGENCY_EXPLAIN_NEXT_ACTION: 'emergency.explain_next_action',
});

export const COPILOT_COMMAND_IDS = Object.freeze({
  OPEN_REQUESTS: 'workflow.open_requests',
  OPEN_LIVE_MAP: 'workflow.open_live_map',
  OPEN_APPROVALS: 'workflow.open_approvals',
  OPEN_ORGANIZATIONS: 'workflow.open_organizations',
  OPEN_FACILITIES: 'workflow.open_facilities',
  OPEN_PROVIDERS: 'workflow.open_providers',
  OPEN_STAFF: 'workflow.open_staff',
  OPEN_SCHEDULES: 'workflow.open_schedules',
  OPEN_FINANCE: 'workflow.open_finance',
});

const text = z.string().trim().min(1).max(280);
const commandId = z.enum(Object.values(COPILOT_COMMAND_IDS));

export const copilotCommandSchema = z.object({
  id: commandId,
}).strict();

const availableSuggestedActionSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9._-]+$/),
  label: text,
  description: z.string().trim().max(360).optional(),
  availability: z.literal('available'),
  stages: z.tuple([
    z.literal('prepare'),
    z.literal('confirm'),
    z.literal('execute'),
  ]),
  requiresConfirmation: z.literal(true),
  command: copilotCommandSchema,
  reason: z.never().optional(),
}).strict();

const unavailableSuggestedActionSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9._-]+$/),
  label: text,
  description: z.string().trim().max(360).optional(),
  availability: z.literal('unavailable'),
  stages: z.tuple([
    z.literal('prepare'),
    z.literal('confirm'),
    z.literal('execute'),
  ]),
  requiresConfirmation: z.literal(true),
  command: z.never().optional(),
  reason: text,
}).strict();

export const copilotSuggestedActionSchema = z.discriminatedUnion('availability', [
  availableSuggestedActionSchema,
  unavailableSuggestedActionSchema,
]);


export const copilotEvidenceSchema = z.object({
  label: text,
  value: z.union([z.string().trim().max(280), z.number().finite()]).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(['neutral', 'ready', 'attention', 'blocked', 'critical']).optional(),
}).strict();

const evidenceContext = z.object({
  heading: z.string().trim().min(1).max(160).optional(),
  evidence: z.array(copilotEvidenceSchema).max(24),
  suggestedActions: z.array(copilotSuggestedActionSchema).max(8).optional(),
}).strict();

const dashboardRequestSchema = z.object({
  actionId: z.literal(COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN),
  context: z.object({ dashboard: evidenceContext }).strict(),
}).strict();

const organizationRequestSchema = z.object({
  actionId: z.literal(COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS),
  context: z.object({ organization: evidenceContext }).strict(),
}).strict();

const emergencyRequestSchema = z.object({
  actionId: z.literal(COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION),
  context: z.object({ emergency: evidenceContext }).strict(),
}).strict();

export const copilotRequestSchema = z.discriminatedUnion('actionId', [
  dashboardRequestSchema,
  organizationRequestSchema,
  emergencyRequestSchema,
]);

export const copilotProposalSchema = z.object({
  version: z.literal(2),
  proposalOnly: z.boolean(),
  actionId: z.enum([
    COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
    COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS,
    COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
  ]),
  kind: z.enum(['explanation', 'guidance']),
  availability: z.enum(['available', 'unavailable']),
  title: text,
  summary: text,
  evidence: z.array(copilotEvidenceSchema).max(24),
  guardrail: text,
  suggestedActions: z.array(copilotSuggestedActionSchema).max(8),
  execution: z.never().optional(),
  source: z.literal('local-deterministic'),
}).strict();

export class CopilotContractError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = 'CopilotContractError';
    this.issues = issues;
  }
}

export const validateCopilotRequest = (request) => {
  const result = copilotRequestSchema.safeParse(request);
  if (!result.success) {
    throw new CopilotContractError('This Copilot request has an unsupported action or context.', result.error.issues);
  }
  return result.data;
};

export const validateCopilotCommand = (command) => {
  const result = copilotCommandSchema.safeParse(command);
  if (!result.success) {
    throw new CopilotContractError('This Copilot command is not supported.', result.error.issues);
  }
  return result.data;
};

export const validateCopilotProposal = (proposal) => {
  const result = copilotProposalSchema.safeParse(proposal);
  if (!result.success) {
    throw new CopilotContractError('The Copilot response did not satisfy the capability contract.', result.error.issues);
  }
  return result.data;
};
