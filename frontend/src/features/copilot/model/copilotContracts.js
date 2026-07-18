import { z } from 'zod';

export const COPILOT_ACTION_IDS = Object.freeze({
  DASHBOARD_EXPLAIN: 'dashboard.explain',
  ORGANIZATION_EXPLAIN_READINESS: 'organization.explain_readiness',
  EMERGENCY_EXPLAIN_NEXT_ACTION: 'emergency.explain_next_action',
});

const text = z.string().trim().min(1).max(280);

export const copilotEvidenceSchema = z.object({
  label: text,
  value: z.union([z.string().trim().max(280), z.number().finite()]).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(['neutral', 'ready', 'attention', 'blocked', 'critical']).optional(),
}).strict();

const evidenceContext = z.object({
  heading: z.string().trim().min(1).max(160).optional(),
  evidence: z.array(copilotEvidenceSchema).max(24),
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
  version: z.literal(1),
  proposalOnly: z.literal(true),
  actionId: z.enum([
    COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
    COPILOT_ACTION_IDS.ORGANIZATION_EXPLAIN_READINESS,
    COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
  ]),
  kind: z.literal('explanation'),
  availability: z.enum(['available', 'unavailable']),
  title: text,
  summary: text,
  evidence: z.array(copilotEvidenceSchema).max(24),
  guardrail: text,
  suggestedActions: z.array(z.never()).length(0),
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

export const validateCopilotProposal = (proposal) => {
  const result = copilotProposalSchema.safeParse(proposal);
  if (!result.success) {
    throw new CopilotContractError('The Copilot response did not satisfy the proposal-only contract.', result.error.issues);
  }
  return result.data;
};
