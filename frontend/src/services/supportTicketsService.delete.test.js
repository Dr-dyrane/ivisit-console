import { deleteSupportTicket } from './supportTicketsService';
import { supabase } from '../lib/supabase';
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

const installDeleteReceiver = (result) => {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ maybeSingle }));
  const eq = jest.fn(() => ({ select }));
  const deleteQuery = jest.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ delete: deleteQuery });
  return { deleteQuery, eq, select, maybeSingle };
};

describe('support ticket delete receiver confirmation', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    withAudit.mockImplementation((eventName, resourceType, operation) => operation());
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns the receiver-confirmed deleted identity', async () => {
    const receiver = installDeleteReceiver({ data: { id: 'ticket-1' }, error: null });

    await expect(deleteSupportTicket('ticket-1')).resolves.toEqual({ id: 'ticket-1' });

    expect(supabase.from).toHaveBeenCalledWith('support_tickets');
    expect(receiver.deleteQuery).toHaveBeenCalledTimes(1);
    expect(receiver.eq).toHaveBeenCalledWith('id', 'ticket-1');
    expect(receiver.select).toHaveBeenCalledWith('id');
    expect(receiver.maybeSingle).toHaveBeenCalledTimes(1);
    expect(withAudit).toHaveBeenCalledWith(
      'support_ticket.delete',
      'support_ticket',
      expect.any(Function),
      { ticket_id: 'ticket-1' }
    );
  });

  it('rejects a stale or policy-filtered delete that affected no row', async () => {
    installDeleteReceiver({ data: null, error: null });

    await expect(deleteSupportTicket('missing-ticket')).rejects.toThrow('Support ticket was not deleted');
  });
});
