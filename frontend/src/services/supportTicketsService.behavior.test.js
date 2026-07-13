import {
  assignTicket,
  createSupportTicket,
  getOpenTicketsCount,
  getSupportTicket,
  getSupportTickets,
  getSupportTicketsAnalytics,
  getSupportTicketsPage,
  getUserSupportTickets,
  subscribeToSupportTickets,
  updateSupportTicket,
  updateTicketStatus,
} from './supportTicketsService';
import { supabase } from '../lib/supabase';
import { applyAuthFilter, getCurrentUser } from './authService';
import { isValidUUID } from '../lib/utils';
import { withAudit, withRetry } from './supabaseHelpers';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../lib/utils', () => ({
  isValidUUID: jest.fn(),
}));

jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn((query) => query),
  getCurrentUser: jest.fn(),
}));

jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn((eventName, resourceType, operation) => operation()),
  withRetry: jest.fn((operation) => operation()),
}));

const USER_UUID = '11111111-1111-4111-8111-111111111111';
const ORG_UUID = '22222222-2222-4222-8222-222222222222';
const TICKET_UUID = '33333333-3333-4333-8333-333333333333';
const AGENT_UUID = '44444444-4444-4444-8444-444444444444';

function installReceivers(results) {
  const builders = [];

  supabase.from.mockImplementation((table) => {
    const result = results[builders.length] || { data: null, error: null };
    const builder = { table };
    const chainMethods = [
      'abortSignal',
      'delete',
      'eq',
      'in',
      'insert',
      'or',
      'order',
      'range',
      'select',
      'update',
    ];

    chainMethods.forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.maybeSingle = jest.fn().mockResolvedValue(result);
    builder.single = jest.fn().mockResolvedValue(result);
    builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    builders.push(builder);
    return builder;
  });

  return builders;
}

describe('support ticket service behavior boundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({
      id: USER_UUID,
      organization_id: ORG_UUID,
      role: 'org_admin',
    });
    applyAuthFilter.mockImplementation((query) => query);
    isValidUUID.mockImplementation((value) => (
      typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
    ));
    withAudit.mockImplementation((eventName, resourceType, operation) => operation());
    withRetry.mockImplementation((operation) => operation());
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('keeps the page read scoped, exact, searchable, paginated, abortable, and normalized', async () => {
    const rawRow = {
      id: TICKET_UUID,
      requester_name: 'Legacy requester',
      subject: ' ',
      message: null,
      category: null,
      priority: null,
      status: null,
      extra_field: 'preserved',
    };
    const builders = installReceivers([
      { count: 41, error: null },
      { count: 40, error: null },
      { count: 10, error: null },
      { count: 5, error: null },
      { count: 20, error: null },
      { count: 5, error: null },
      { count: 3, error: null },
      { data: [rawRow], error: null },
    ]);
    const controller = new AbortController();

    const result = await getSupportTicketsPage({
      assigned_to: AGENT_UUID,
      category: ' Technical ',
      limit: '10',
      offset: '20',
      priority: 'URGENT',
      search: ' %needle_, test% ',
      sortDirection: 'asc',
      sortKey: 'subject',
      statsFilter: { category: ['billing'] },
      status: [' OPEN ', 'resolved'],
      abortSignal: controller.signal,
      quiet: true,
    });

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(applyAuthFilter).toHaveBeenCalledTimes(8);
    applyAuthFilter.mock.calls.forEach(([, user, options]) => {
      expect(user).toEqual({
        id: USER_UUID,
        organization_id: ORG_UUID,
        role: 'org_admin',
      });
      expect(options).toEqual({
        userIdField: 'user_id',
        orgIdField: 'organization_id',
        resourceType: 'support',
      });
    });

    builders.slice(0, 7).forEach((builder) => {
      expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(builder.range).not.toHaveBeenCalled();
      expect(builder.abortSignal).toHaveBeenCalledWith(controller.signal);
    });
    expect(builders[7].select).toHaveBeenCalledWith('*');
    expect(builders[7].in).toHaveBeenCalledWith('status', ['open', 'resolved']);
    expect(builders[7].eq).toHaveBeenCalledWith('priority', 'urgent');
    expect(builders[7].eq).toHaveBeenCalledWith('category', 'technical');
    expect(builders[7].eq).toHaveBeenCalledWith('assigned_to', AGENT_UUID);
    expect(builders[7].or).toHaveBeenCalledWith(
      'subject.ilike.% needle test %,message.ilike.% needle test %,category.ilike.% needle test %'
    );
    expect(builders[7].order).toHaveBeenCalledWith('subject', { ascending: true });
    expect(builders[7].range).toHaveBeenCalledWith(20, 29);
    expect(builders[7].abortSignal).toHaveBeenCalledWith(controller.signal);

    expect(result).toEqual({
      data: [{
        ...rawRow,
        id: TICKET_UUID,
        user_id: null,
        organization_id: null,
        subject: 'Support request',
        message: '',
        category: 'general',
        priority: 'normal',
        status: 'open',
        assigned_to: null,
        customer_name: 'Legacy requester',
        created_at: null,
        updated_at: null,
      }],
      count: 41,
      stats: {
        total: 40,
        open: 10,
        inProgress: 5,
        resolved: 20,
        closed: 5,
        urgent: 3,
        active: 15,
        exactCounts: true,
      },
    });
  });

  it('rejects an already-aborted page read before auth and honors quiet logging', async () => {
    const quietController = new AbortController();
    quietController.abort();

    await expect(getSupportTicketsPage({
      abortSignal: quietController.signal,
      quiet: true,
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    const loudController = new AbortController();
    loudController.abort();
    await expect(getSupportTicketsPage({
      abortSignal: loudController.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching support tickets page:',
      expect.objectContaining({ name: 'AbortError' })
    );
  });

  it('preserves the legacy list query, raw rows, scope, and quiet error model', async () => {
    const rows = [{ id: TICKET_UUID, subject: 'Raw subject' }];
    const builders = installReceivers([{ data: rows, error: null }]);

    await expect(getSupportTickets({
      category: ['billing', 'technical'],
      limit: 5,
      offset: 10,
      priority: 'high',
      search: 'ignored by this legacy export',
      status: ['open', 'resolved'],
    })).resolves.toBe(rows);

    expect(applyAuthFilter).toHaveBeenCalledWith(
      builders[0],
      expect.objectContaining({ id: USER_UUID, organization_id: ORG_UUID }),
      {
        userIdField: 'user_id',
        orgIdField: 'organization_id',
        resourceType: 'support',
      }
    );
    expect(builders[0].in).toHaveBeenCalledWith('status', ['open', 'resolved']);
    expect(builders[0].eq).toHaveBeenCalledWith('priority', 'high');
    expect(builders[0].in).toHaveBeenCalledWith('category', ['billing', 'technical']);
    expect(builders[0].or).not.toHaveBeenCalled();
    expect(builders[0].order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builders[0].range).toHaveBeenCalledWith(10, 14);

    supabase.from.mockReset();
    installReceivers([{ data: null, error: new Error('read denied') }]);
    await expect(getSupportTickets({ quiet: true })).rejects.toThrow('read denied');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('keeps UUID-native single and user reads and returns their raw receiver shapes', async () => {
    isValidUUID.mockReturnValue(false);
    await expect(getSupportTicket('SUP-42')).resolves.toBeNull();
    await expect(getUserSupportTickets('USR-42')).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();

    isValidUUID.mockReturnValue(true);
    const ticket = { id: TICKET_UUID, subject: 'Raw ticket' };
    const tickets = [ticket];
    const builders = installReceivers([
      { data: ticket, error: null },
      { data: tickets, error: null },
    ]);

    await expect(getSupportTicket(TICKET_UUID)).resolves.toBe(ticket);
    await expect(getUserSupportTickets(USER_UUID)).resolves.toBe(tickets);
    expect(builders[0].eq).toHaveBeenCalledWith('id', TICKET_UUID);
    expect(builders[0].maybeSingle).toHaveBeenCalledTimes(1);
    expect(builders[1].eq).toHaveBeenCalledWith('user_id', USER_UUID);
    expect(builders[1].order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('derives create identity and excludes caller authority and attachment fields', async () => {
    const created = { id: TICKET_UUID };
    const builders = installReceivers([{ data: created, error: null }]);

    await expect(createSupportTicket({
      assigned_to: AGENT_UUID,
      attachment: { name: 'private.txt' },
      attachment_url: 'https://example.invalid/private.txt',
      category: ' Technical ',
      message: '  The queue is paused.  ',
      organization_id: 'caller-org',
      priority: 'HIGH',
      status: 'closed',
      subject: '  Printer  ',
      user_id: 'caller-user',
    })).resolves.toBe(created);

    expect(builders[0].insert).toHaveBeenCalledWith([{
      subject: 'Printer',
      message: 'The queue is paused.',
      category: 'technical',
      priority: 'high',
      user_id: USER_UUID,
      organization_id: ORG_UUID,
      assigned_to: null,
      status: 'open',
    }]);
    expect(withAudit).toHaveBeenCalledWith(
      'support_ticket.create',
      'support_ticket',
      expect.any(Function),
      { category: 'technical', priority: 'high' }
    );
  });

  it('keeps update, status, and assignment on their direct audited table receivers', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    const updated = { id: TICKET_UUID };
    const statusUpdated = { id: TICKET_UUID, status: 'resolved' };
    const assigned = { id: TICKET_UUID, assigned_to: AGENT_UUID };
    const builders = installReceivers([
      { data: updated, error: null },
      { data: statusUpdated, error: null },
      { data: assigned, error: null },
    ]);

    await expect(updateSupportTicket(TICKET_UUID, {
      assigned_to: AGENT_UUID,
      attachment_url: 'https://example.invalid/private.txt',
      category: ' Billing ',
      organization_id: 'caller-org',
      priority: 'URGENT',
      status: 'closed',
      subject: '  Updated subject  ',
      user_id: 'caller-user',
    })).resolves.toBe(updated);
    await expect(updateTicketStatus(TICKET_UUID, ' RESOLVED ')).resolves.toBe(statusUpdated);
    await expect(assignTicket(TICKET_UUID, AGENT_UUID)).resolves.toBe(assigned);

    expect(builders[0].update).toHaveBeenCalledWith({
      subject: 'Updated subject',
      category: 'billing',
      priority: 'urgent',
      updated_at: '2026-07-13T12:00:00.000Z',
    });
    expect(builders[0].eq).toHaveBeenCalledWith('id', TICKET_UUID);
    expect(builders[1].update).toHaveBeenCalledWith({
      status: 'resolved',
      updated_at: '2026-07-13T12:00:00.000Z',
    });
    expect(builders[1].eq).toHaveBeenCalledWith('id', TICKET_UUID);
    expect(builders[2].update).toHaveBeenCalledWith({
      assigned_to: AGENT_UUID,
      status: 'in_progress',
      updated_at: '2026-07-13T12:00:00.000Z',
    });
    expect(builders[2].eq).toHaveBeenCalledWith('id', TICKET_UUID);

    expect(withAudit.mock.calls.map(([eventName, resourceType, , metadata]) => ({
      eventName,
      resourceType,
      metadata,
    }))).toEqual([
      {
        eventName: 'support_ticket.update',
        resourceType: 'support_ticket',
        metadata: {
          ticket_id: TICKET_UUID,
          fields: ['subject', 'category', 'priority', 'updated_at'],
        },
      },
      {
        eventName: 'support_ticket.status',
        resourceType: 'support_ticket',
        metadata: { ticket_id: TICKET_UUID, status: 'resolved' },
      },
      {
        eventName: 'support_ticket.assign',
        resourceType: 'support_ticket',
        metadata: { ticket_id: TICKET_UUID, assigned_to: AGENT_UUID },
      },
    ]);
  });

  it('preserves exact open count and scoped analytics consumer shapes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    const analyticsRows = [
      {
        status: 'resolved',
        priority: 'urgent',
        category: 'technical',
        created_at: '2026-07-12T10:00:00.000Z',
        updated_at: '2026-07-12T14:00:00.000Z',
      },
      {
        status: 'open',
        priority: 'normal',
        category: 'billing',
        created_at: '2026-06-01T10:00:00.000Z',
        updated_at: null,
      },
    ];
    const builders = installReceivers([
      { count: 7, error: null },
      { data: analyticsRows, error: null },
    ]);

    await expect(getOpenTicketsCount()).resolves.toBe(7);
    await expect(getSupportTicketsAnalytics()).resolves.toEqual({
      total: 2,
      byStatus: { resolved: 1, open: 1 },
      byPriority: { urgent: 1, normal: 1 },
      byCategory: { technical: 1, billing: 1 },
      recent: 1,
      resolved: 1,
      averageResolutionTime: 4,
    });

    expect(builders[0].select).toHaveBeenCalledWith('id', { count: 'exact' });
    expect(builders[0].eq).toHaveBeenCalledWith('status', 'open');
    expect(builders[1].select).toHaveBeenCalledWith(
      'status, priority, category, created_at, updated_at'
    );
    expect(applyAuthFilter).toHaveBeenCalledWith(
      builders[1],
      expect.objectContaining({ id: USER_UUID, organization_id: ORG_UUID }),
      {
        userIdField: 'user_id',
        orgIdField: 'organization_id',
        resourceType: 'support',
      }
    );
  });

  it('subscribes to the support table and removes the exact created channel on cleanup', () => {
    const callback = jest.fn();
    const subscribedChannel = { topic: 'support-ticket-channel' };
    const subscribe = jest.fn(() => subscribedChannel);
    const on = jest.fn(() => ({ subscribe }));
    const channelBuilder = { on };
    supabase.channel.mockReturnValue(channelBuilder);

    const cleanup = subscribeToSupportTickets(callback);

    expect(supabase.channel).toHaveBeenCalledWith('support_tickets_changes');
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_tickets' },
      callback
    );
    expect(subscribe).toHaveBeenCalledTimes(1);

    cleanup();
    expect(supabase.removeChannel).toHaveBeenCalledWith(subscribedChannel);
  });
});
