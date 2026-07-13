import {
  createSupportTicket,
  updateSupportTicket,
  updateTicketStatus,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from './supportTicketsService';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { withAudit } from './supabaseHelpers';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('./supabaseHelpers', () => ({
  withRetry: jest.fn(),
  withAudit: jest.fn((eventName, resourceType, operation) => operation()),
}));

const installInsertReceiver = (row) => {
  const single = jest.fn().mockResolvedValue({ data: row, error: null });
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  supabase.from.mockReturnValue({ insert });
  return { insert, select, single };
};

describe('support ticket enum boundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 'user-1', organization_id: 'org-1' });
    withAudit.mockImplementation((eventName, resourceType, operation) => operation());
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('uses the source-proved mounted vocabularies without legacy aliases', () => {
    expect(SUPPORT_TICKET_CATEGORIES).toEqual([
      'general',
      'technical',
      'billing',
      'account',
      'feature_request',
      'bug_report',
      'medical',
    ]);
    expect(SUPPORT_TICKET_PRIORITIES).toEqual(['low', 'normal', 'high', 'urgent']);
    expect(SUPPORT_TICKET_STATUSES).toEqual(['open', 'in_progress', 'resolved', 'closed']);
    expect(SUPPORT_TICKET_PRIORITIES).not.toContain('medium');
  });

  it('normalizes supported create values and sends only canonical tokens', async () => {
    const returnedRow = { id: 'ticket-1', category: 'technical', priority: 'high', status: 'open' };
    const receiver = installInsertReceiver(returnedRow);

    await expect(createSupportTicket({
      subject: 'Printer',
      message: 'Queue is paused',
      category: ' Technical ',
      priority: 'HIGH',
    })).resolves.toBe(returnedRow);

    expect(receiver.insert).toHaveBeenCalledWith([expect.objectContaining({
      subject: 'Printer',
      message: 'Queue is paused',
      category: 'technical',
      priority: 'high',
      status: 'open',
      user_id: 'user-1',
      organization_id: 'org-1',
    })]);
  });

  it.each([
    ['category', () => createSupportTicket({ subject: 'Test', message: 'Body', category: 'unsupported' })],
    ['priority', () => updateSupportTicket('ticket-1', { priority: 'medium' })],
    ['status', () => updateTicketStatus('ticket-1', 'pending')],
  ])('rejects an unsupported %s before any receiver write', async (field, invoke) => {
    await expect(invoke()).rejects.toThrow(`Unsupported support ticket ${field}`);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(withAudit).not.toHaveBeenCalled();
  });
});
