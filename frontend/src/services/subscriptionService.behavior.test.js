import {
  createSubscriber,
  createSubscriberWithWelcome,
  deleteSubscriber,
  getSubscriber,
  getSubscriberByEmail,
  getSubscribers,
  getSubscribersForBulkEmail,
  getSubscriptionAnalytics,
  getSubscriptionsPage,
  markWelcomeEmailSent,
  sendBulkEmail,
  sendCustomEmail,
  sendWelcomeEmail,
  sendWelcomeToSubscriber,
  subscribeToNewSubscribers,
  subscribeToSubscribers,
  updateSubscriber,
  updateSubscriberStatus,
  updateSubscriberType,
} from './subscriptionService';
import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';
import { getCurrentUser } from './authService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    functions: { invoke: jest.fn() },
    removeChannel: jest.fn(),
  },
}));

jest.mock('../lib/utils', () => ({ isValidUUID: jest.fn() }));
jest.mock('./authService', () => ({ getCurrentUser: jest.fn() }));

const SUBSCRIBER_ID = '11111111-1111-4111-8111-111111111111';

function createQueryBuilder(result = { data: null, error: null, count: null }) {
  const builder = {};
  [
    'delete',
    'eq',
    'gte',
    'ilike',
    'in',
    'insert',
    'limit',
    'lte',
    'not',
    'order',
    'range',
    'select',
    'update',
  ].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.single = jest.fn().mockResolvedValue(result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('subscription service behavior boundaries', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    isValidUUID.mockImplementation((value) => value === SUBSCRIBER_ID);
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('keeps page and legacy list reads admin-only without organization fallback scope', async () => {
    for (const role of ['org_admin', 'provider']) {
      getCurrentUser.mockResolvedValue({ id: `${role}-1`, role, organization_id: 'org-1' });
      supabase.from.mockClear();

      await expect(getSubscriptionsPage({ quiet: true })).resolves.toEqual({
        data: [],
        count: 0,
        denied: true,
        failed: false,
        reason: 'admin_only',
        stats: {
          total: 0,
          active: 0,
          pending: 0,
          unsubscribed: 0,
          paid: 0,
          free: 0,
          newUsers: 0,
          welcomeSent: 0,
          exactCounts: false,
          available: false,
          reason: 'admin_only',
          scope: 'admin_subscriber_projection',
        },
      });
      expect(supabase.from).not.toHaveBeenCalled();
    }

    const deniedListBuilder = createQueryBuilder({ data: [{ id: SUBSCRIBER_ID }], error: null });
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: 'org-1',
      hospital_ids: ['hospital-1'],
    });
    supabase.from.mockReturnValue(deniedListBuilder);

    await expect(getSubscribers({ quiet: true })).resolves.toEqual([]);
    expect(deniedListBuilder.select).toHaveBeenCalledWith('*');
    expect(deniedListBuilder.eq).not.toHaveBeenCalled();
    expect(deniedListBuilder.in).not.toHaveBeenCalled();
  });

  it('preserves exact page counts, trimmed search, sorting, and bounded offset pagination', async () => {
    const row = { id: SUBSCRIBER_ID, email: 'user@example.com' };
    const results = [
      { data: [row], error: null, count: 42 },
      { data: null, error: null, count: 8 },
      { data: null, error: null, count: 3 },
      { data: null, error: null, count: 2 },
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 4 },
      { data: null, error: null, count: 4 },
      { data: null, error: null, count: 5 },
      { data: null, error: null, count: 6 },
    ];
    const builders = [];
    supabase.from.mockImplementation(() => {
      const builder = createQueryBuilder(results[builders.length]);
      builders.push(builder);
      return builder;
    });

    await expect(getSubscriptionsPage({
      search: ' User ',
      status: ['active'],
      type: ['paid'],
      welcomeEmailSent: 'sent',
      kpiFilter: 'active',
      sortKey: 'subscription_date',
      sortDirection: 'asc',
      limit: 500,
      offset: -10,
      quiet: true,
    })).resolves.toEqual({
      data: [row],
      count: 42,
      denied: false,
      failed: false,
      reason: null,
      stats: {
        total: 8,
        active: 3,
        pending: 2,
        unsubscribed: 1,
        paid: 4,
        free: 4,
        newUsers: 5,
        welcomeSent: 6,
        exactCounts: true,
        available: true,
        scope: 'admin_subscriber_projection',
      },
    });

    const [rowsBuilder, ...countBuilders] = builders;
    expect(rowsBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(rowsBuilder.ilike).toHaveBeenCalledWith('email', '%User%');
    expect(rowsBuilder.in).toHaveBeenCalledWith('status', ['active']);
    expect(rowsBuilder.in).toHaveBeenCalledWith('type', ['paid']);
    expect(rowsBuilder.eq).toHaveBeenCalledWith('welcome_email_sent', true);
    expect(rowsBuilder.eq).toHaveBeenCalledWith('status', 'active');
    expect(rowsBuilder.order).toHaveBeenCalledWith('subscription_date', {
      ascending: true,
      nullsFirst: false,
    });
    expect(rowsBuilder.range).toHaveBeenCalledWith(0, 99);
    expect(countBuilders).toHaveLength(8);
    countBuilders.forEach((builder) => {
      expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(builder.ilike).toHaveBeenCalledWith('email', '%User%');
      expect(builder.eq).toHaveBeenCalledWith('welcome_email_sent', true);
    });
  });

  it('keeps UUID lookup, email normalization, and provider single-row receiver behavior', async () => {
    await expect(getSubscriber('SUB-100')).resolves.toBeNull();
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();

    const subscriber = { id: SUBSCRIBER_ID, email: 'user@example.com' };
    const idBuilder = createQueryBuilder({ data: subscriber, error: null });
    const emailBuilder = createQueryBuilder({ data: subscriber, error: null });
    getCurrentUser.mockResolvedValue({ id: 'provider-1', role: 'provider', provider_id: 'provider-1' });
    supabase.from.mockReturnValueOnce(idBuilder).mockReturnValueOnce(emailBuilder);

    await expect(getSubscriber(SUBSCRIBER_ID)).resolves.toEqual(subscriber);
    expect(idBuilder.eq).toHaveBeenCalledWith('id', SUBSCRIBER_ID);
    expect(idBuilder.eq).not.toHaveBeenCalledWith('provider_id', expect.anything());

    await expect(getSubscriberByEmail('  User@Example.COM ')).resolves.toEqual(subscriber);
    expect(emailBuilder.eq).toHaveBeenCalledWith('email', 'user@example.com');
    expect(emailBuilder.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('preserves legacy list filters and fixed offset result shape', async () => {
    const rows = [{ id: SUBSCRIBER_ID }];
    const builder = createQueryBuilder({ data: rows, error: null });
    supabase.from.mockReturnValue(builder);

    await expect(getSubscribers({
      email: 'user',
      status: 'active',
      type: 'paid',
      new_user: false,
      limit: 25,
      offset: 50,
      quiet: true,
    })).resolves.toEqual(rows);

    expect(builder.ilike).toHaveBeenCalledWith('email', '%user%');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(builder.eq).toHaveBeenCalledWith('type', 'paid');
    expect(builder.eq).toHaveBeenCalledWith('new_user', false);
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(25);
    expect(builder.range).toHaveBeenCalledWith(50, 74);
  });

  it('keeps unsupported table-operation receivers and payload allowlists unchanged', async () => {
    const builders = Array.from({ length: 6 }, () => createQueryBuilder({
      data: { id: SUBSCRIBER_ID },
      error: null,
    }));
    supabase.from.mockImplementation(() => builders.shift());

    await createSubscriber({
      email: '  User@Example.COM ',
      sendWelcomeEmail: true,
      unexpected_column: 'blocked',
    });
    await updateSubscriber(SUBSCRIBER_ID, {
      email: ' Updated@Example.COM ',
      type: 'paid',
      unexpected_column: 'blocked',
    });
    await deleteSubscriber(SUBSCRIBER_ID);
    await updateSubscriberStatus(SUBSCRIBER_ID, 'active');
    await updateSubscriberType(SUBSCRIBER_ID, 'paid');
    await markWelcomeEmailSent(SUBSCRIBER_ID);

    const [createBuilder, updateBuilder, deleteBuilder, statusBuilder, typeBuilder, markBuilder]
      = supabase.from.mock.results.map(({ value }) => value);
    const createdPayload = createBuilder.insert.mock.calls[0][0][0];
    expect(createdPayload).toEqual({
      email: 'user@example.com',
      type: 'free',
      status: 'pending',
      new_user: true,
      welcome_email_sent: false,
      subscription_date: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
    expect(createdPayload).not.toHaveProperty('sendWelcomeEmail');
    expect(createdPayload).not.toHaveProperty('unexpected_column');

    expect(updateBuilder.update).toHaveBeenCalledWith({
      email: 'updated@example.com',
      type: 'paid',
      updated_at: expect.any(String),
    });
    expect(deleteBuilder.delete).toHaveBeenCalledTimes(1);
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', SUBSCRIBER_ID);
    expect(statusBuilder.update).toHaveBeenCalledWith({
      status: 'active',
      updated_at: expect.any(String),
    });
    expect(typeBuilder.update).toHaveBeenCalledWith({
      type: 'paid',
      updated_at: expect.any(String),
    });
    expect(markBuilder.update).toHaveBeenCalledWith({
      welcome_email_sent: true,
      new_user: false,
      status: 'active',
      updated_at: expect.any(String),
    });
  });

  it('keeps each email provider receiver and payload boundary exact', async () => {
    supabase.functions.invoke.mockImplementation(async (receiver) => ({
      data: { receiver },
      error: null,
    }));

    await expect(sendWelcomeEmail('welcome@example.com')).resolves.toEqual({
      receiver: 'sendWelcome',
    });
    await expect(sendCustomEmail(
      { email: 'custom@example.com' },
      'Subject',
      'Content'
    )).resolves.toEqual({ receiver: 'sendCustomEmail' });
    await expect(sendBulkEmail(
      [{ email: 'one@example.com' }, { email: '' }, { email: 'two@example.com' }],
      'Bulk subject',
      'Bulk content'
    )).resolves.toEqual({ receiver: 'sendBulkEmail' });

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'sendWelcome', {
      body: { email: 'welcome@example.com' },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'sendCustomEmail', {
      body: {
        email: 'custom@example.com',
        subject: 'Subject',
        content: 'Content',
      },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(3, 'sendBulkEmail', {
      body: {
        emails: ['one@example.com', 'two@example.com'],
        subject: 'Bulk subject',
        content: 'Bulk content',
      },
    });
  });

  it('keeps the legacy bulk-recipient read active-only and backend-authorized', async () => {
    const recipients = [{ id: SUBSCRIBER_ID, email: 'active@example.com', status: 'active' }];
    const builder = createQueryBuilder({ data: recipients, error: null });
    supabase.from.mockReturnValue(builder);

    await expect(getSubscribersForBulkEmail()).resolves.toEqual(recipients);
    expect(builder.select).toHaveBeenCalledWith('id, email, type, status, created_at');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('does not reinvoke the welcome receiver for a subscriber already marked sent', async () => {
    const welcomed = {
      id: SUBSCRIBER_ID,
      email: 'user@example.com',
      welcome_email_sent: true,
    };
    supabase.from.mockReturnValue(createQueryBuilder({ data: welcomed, error: null }));

    await expect(sendWelcomeToSubscriber(SUBSCRIBER_ID)).resolves.toEqual({
      subscriber: welcomed,
      emailResult: { success: true, skipped: true, reason: 'already_sent' },
      marked: true,
    });
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('derives welcome state only from the receiver-refreshed subscriber result', async () => {
    const pending = {
      id: SUBSCRIBER_ID,
      email: 'user@example.com',
      welcome_email_sent: false,
    };
    const refreshed = { ...pending, welcome_email_sent: true, status: 'active' };
    const firstRead = createQueryBuilder({ data: pending, error: null });
    const secondRead = createQueryBuilder({ data: refreshed, error: null });
    supabase.from.mockReturnValueOnce(firstRead).mockReturnValueOnce(secondRead);
    supabase.functions.invoke.mockResolvedValue({
      data: { success: true, delivery_id: 'delivery-1' },
      error: null,
    });

    await expect(sendWelcomeToSubscriber(SUBSCRIBER_ID)).resolves.toEqual({
      subscriber: refreshed,
      emailResult: { success: true, delivery_id: 'delivery-1' },
      marked: true,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('sendWelcome', {
      body: { email: 'user@example.com' },
    });
    expect(firstRead.update).not.toHaveBeenCalled();
    expect(secondRead.update).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('returns the refreshed row from the create-with-welcome compatibility workflow', async () => {
    const created = { id: SUBSCRIBER_ID, email: 'user@example.com' };
    const pending = { ...created, welcome_email_sent: false };
    const refreshed = { ...created, welcome_email_sent: true, status: 'active' };
    const insertBuilder = createQueryBuilder({ data: created, error: null });
    const firstRead = createQueryBuilder({ data: pending, error: null });
    const secondRead = createQueryBuilder({ data: refreshed, error: null });
    supabase.from
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(firstRead)
      .mockReturnValueOnce(secondRead);

    await expect(createSubscriberWithWelcome({ email: created.email })).resolves.toEqual(refreshed);
    expect(insertBuilder.insert).toHaveBeenCalledTimes(1);
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('preserves analytics derivation and completeness metadata result shape', async () => {
    const rows = [
      {
        type: 'paid',
        status: 'active',
        new_user: true,
        welcome_email_sent: true,
        created_at: '2020-01-01T00:00:00.000Z',
        subscription_date: null,
      },
      {
        type: 'free',
        status: 'pending',
        new_user: false,
        welcome_email_sent: false,
        created_at: '2020-01-02T00:00:00.000Z',
        subscription_date: null,
      },
    ];
    const builder = createQueryBuilder({ data: rows, error: null, count: 4 });
    supabase.from.mockReturnValue(builder);

    await expect(getSubscriptionAnalytics({ quiet: true })).resolves.toEqual({
      total: 2,
      byType: { paid: 1, free: 1 },
      byStatus: { active: 1, pending: 1 },
      newUsers: 1,
      welcomeEmailsSent: 1,
      active: 1,
      paid: 1,
      free: 1,
      paidConversionRate: 50,
      recentSubscriptions: 0,
      activeFree: 0,
      activePremium: 1,
      inactiveFree: 1,
      inactivePremium: 0,
      sample: { returnedCount: 2, totalCount: 4, complete: false },
    });
  });

  it('keeps abort-like failures inside each legacy quiet-error contract', async () => {
    const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
    const pageResults = [
      { data: null, error: abortError, count: null },
      ...Array.from({ length: 8 }, () => ({ data: null, error: null, count: 0 })),
    ];
    supabase.from.mockImplementation(() => createQueryBuilder(pageResults.shift()));

    await expect(getSubscriptionsPage({ quiet: true })).resolves.toMatchObject({
      data: [],
      count: 0,
      denied: false,
      failed: true,
      reason: 'query_failed',
    });
    expect(consoleError).not.toHaveBeenCalled();

    supabase.from.mockReset();
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: abortError }));
    await expect(getSubscribers({ quiet: true })).resolves.toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();

    supabase.from.mockReset();
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: abortError }));
    await expect(getSubscriptionAnalytics({ quiet: true })).rejects.toBe(abortError);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('preserves realtime filters, callback identity, and subscribed-channel cleanup', () => {
    const subscriptions = [];
    supabase.channel.mockImplementation((name) => {
      const subscribedChannel = { name: `${name}-subscribed` };
      const state = { name, subscribedChannel };
      const channelBuilder = {
        on: jest.fn((event, config, callback) => {
          state.event = event;
          state.config = config;
          state.callback = callback;
          return channelBuilder;
        }),
        subscribe: jest.fn(() => subscribedChannel),
      };
      subscriptions.push(state);
      return channelBuilder;
    });
    const allCallback = jest.fn();
    const newCallback = jest.fn();

    const cleanupAll = subscribeToSubscribers(allCallback);
    const cleanupNew = subscribeToNewSubscribers(newCallback);

    expect(subscriptions[0]).toMatchObject({
      event: 'postgres_changes',
      config: { event: '*', schema: 'public', table: 'subscribers' },
      callback: allCallback,
    });
    expect(subscriptions[1]).toMatchObject({
      event: 'postgres_changes',
      config: { event: 'INSERT', schema: 'public', table: 'subscribers' },
      callback: newCallback,
    });

    cleanupAll();
    cleanupNew();
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(1, subscriptions[0].subscribedChannel);
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(2, subscriptions[1].subscribedChannel);
  });
});
