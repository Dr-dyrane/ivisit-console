import {
  bulkImportHealthNews,
  createHealthNews,
  deleteHealthNews,
  getHealthNews,
  getHealthNewsAnalytics,
  getHealthNewsItem,
  getHealthNewsPage,
  getLatestHealthNews,
  getNewsByCategory,
  subscribeToHealthNews,
  toggleHealthNewsPublish,
  updateHealthNews,
} from './healthNewsService';
import { supabase } from '../lib/supabase';
import { isValidUUID } from '../lib/utils';
import { getCurrentUser } from './authService';

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
  getCurrentUser: jest.fn(),
}));

const USER_UUID = '11111111-1111-4111-8111-111111111111';
const NEWS_UUID = '22222222-2222-4222-8222-222222222222';

function installReceivers(results) {
  const builders = [];

  supabase.from.mockImplementation((table) => {
    const result = results[builders.length] || { data: null, error: null };
    const builder = { table };
    const chainMethods = [
      'delete',
      'eq',
      'gt',
      'gte',
      'insert',
      'limit',
      'lte',
      'or',
      'order',
      'range',
      'select',
      'update',
    ];

    chainMethods.forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.single = jest.fn().mockResolvedValue(result);
    builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    builders.push(builder);
    return builder;
  });

  return builders;
}

const emptyAnalytics = {
  total: 0,
  published: 0,
  bySource: {},
  byCategory: {},
  recent: 0,
};

describe('Health News service behavior boundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: USER_UUID, role: 'org_admin' });
    isValidUUID.mockReturnValue(true);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('keeps the page read published, exact, searchable, paginated, and normalized', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    const rawRow = {
      id: NEWS_UUID,
      title: ' ',
      source: null,
      category: '',
      published: null,
      created_at: null,
      image_url: '  https://images.example/news.png  ',
      url: 'javascript:alert(1)',
      extra_field: 'preserved',
    };
    const builders = installReceivers([
      { count: 9, error: null },
      { count: 3, error: null },
      { count: 2, error: null },
      {
        data: [
          { category: 'medical' },
          { category: 'general' },
          { category: 'medical' },
          { category: null },
        ],
        error: null,
      },
      { data: [rawRow], count: 12, error: null },
    ]);

    const result = await getHealthNewsPage({
      category: 'general',
      created_at: { start: '2026-07-01', end: '2026-07-12' },
      kpiFilter: 'medical',
      limit: '10',
      offset: '20',
      published: 'false',
      quiet: true,
      search: ' %needle_, test% ',
      sortDirection: 'asc',
      sortKey: 'title',
      source: 'Feed Source',
      statsFilter: { source: 'Stats Source' },
    });

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    builders.slice(0, 3).forEach((builder) => {
      expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(builder.eq).toHaveBeenCalledWith('published', true);
      expect(builder.range).not.toHaveBeenCalled();
    });
    expect(builders[3].select).toHaveBeenCalledWith('category');
    expect(builders[3].eq).toHaveBeenCalledWith('published', true);
    expect(builders[4].select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(builders[4].eq.mock.calls).toEqual(expect.arrayContaining([
      ['published', true],
      ['category', 'medical'],
      ['published', false],
      ['category', 'general'],
      ['source', 'Feed Source'],
    ]));
    expect(builders[4].gte).toHaveBeenCalledWith(
      'created_at',
      new Date('2026-07-01T00:00:00').toISOString()
    );
    expect(builders[4].lte).toHaveBeenCalledWith(
      'created_at',
      new Date('2026-07-12T23:59:59').toISOString()
    );
    expect(builders[4].or).toHaveBeenCalledWith(
      'title.ilike.% needle test %,source.ilike.% needle test %,category.ilike.% needle test %'
    );
    expect(builders[4].order).toHaveBeenCalledWith('title', { ascending: true });
    expect(builders[4].range).toHaveBeenCalledWith(20, 29);

    expect(result).toEqual({
      data: [{
        ...rawRow,
        id: NEWS_UUID,
        title: 'Health update',
        source: 'Unknown source',
        category: 'general',
        published: true,
        created_at: null,
        image_url: 'https://images.example/news.png',
        raw_url: 'javascript:alert(1)',
        url: '',
        source_url_valid: false,
        source_host: '',
      }],
      count: 12,
      stats: {
        total: 9,
        published: 9,
        draft: 0,
        medical: 3,
        recent: 2,
        categories: 2,
        exactCounts: true,
        available: true,
        scope: 'published_feed',
        draftUnavailable: true,
      },
    });
  });

  it('preserves page quiet logging and rejects missing exact count truth', async () => {
    installReceivers([
      { count: 1, error: null },
      { count: 1, error: null },
      { count: 1, error: null },
      { data: [{ category: 'medical' }], error: null },
      { data: [], count: null, error: null },
    ]);

    await expect(getHealthNewsPage({ quiet: true })).rejects.toThrow(
      'Health news page count is unavailable.'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: USER_UUID, role: 'org_admin' });
    installReceivers([
      { count: 1, error: null },
      { count: 1, error: null },
      { count: 1, error: null },
      { data: [{ category: 'medical' }], error: null },
      { data: [], count: null, error: null },
    ]);

    await expect(getHealthNewsPage()).rejects.toThrow('Health news page count is unavailable.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching health news page:',
      expect.objectContaining({ message: 'Health news page count is unavailable.' })
    );
  });

  it('preserves legacy list RBAC, raw rows, filtering, pagination, and empty-on-error behavior', async () => {
    const rows = [{ id: NEWS_UUID, title: 'Raw row' }];
    const builders = installReceivers([{ data: rows, error: null }]);

    await expect(getHealthNews({
      category: 'medical',
      limit: 5,
      offset: 10,
      published: false,
      source: 'Hospital Desk',
    })).resolves.toBe(rows);

    expect(builders[0].eq.mock.calls).toEqual([
      ['published', true],
      ['category', 'medical'],
      ['source', 'Hospital Desk'],
      ['published', false],
    ]);
    expect(builders[0].order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builders[0].limit).toHaveBeenCalledWith(5);
    expect(builders[0].range).toHaveBeenCalledWith(10, 14);

    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: USER_UUID, role: 'admin' });
    const adminBuilders = installReceivers([{ data: rows, error: null }]);
    await expect(getHealthNews()).resolves.toBe(rows);
    expect(adminBuilders[0].eq).not.toHaveBeenCalled();

    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: USER_UUID, role: 'org_admin' });
    installReceivers([{ data: null, error: new Error('read denied') }]);
    await expect(getHealthNews()).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Health news query error:',
      expect.objectContaining({ message: 'read denied' })
    );
  });

  it('keeps UUID-native item reads plus latest and category query shapes', async () => {
    isValidUUID.mockReturnValue(false);
    await expect(getHealthNewsItem('NEWS-42')).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();

    isValidUUID.mockReturnValue(true);
    const item = { id: NEWS_UUID, title: 'Raw item' };
    const rows = [item];
    const builders = installReceivers([
      { data: item, error: null },
      { data: rows, error: null },
      { data: rows, error: null },
    ]);

    await expect(getHealthNewsItem(NEWS_UUID)).resolves.toBe(item);
    await expect(getLatestHealthNews(4)).resolves.toBe(rows);
    await expect(getNewsByCategory('medical')).resolves.toBe(rows);

    expect(builders[0].eq).toHaveBeenCalledWith('id', NEWS_UUID);
    expect(builders[0].single).toHaveBeenCalledTimes(1);
    expect(builders[1].order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builders[1].limit).toHaveBeenCalledWith(4);
    expect(builders[2].eq).toHaveBeenCalledWith('category', 'medical');
    expect(builders[2].order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('preserves dormant command payload allowlists, UUID keys, timestamps, and receiver shapes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    const created = { id: NEWS_UUID, title: 'Created' };
    const updated = { id: NEWS_UUID, title: 'Updated' };
    const toggled = { id: NEWS_UUID, published: false };
    const imported = [{ id: NEWS_UUID }];
    const builders = installReceivers([
      { data: created, error: null },
      { data: updated, error: null },
      { error: null },
      { data: toggled, error: null },
      { data: imported, error: null },
    ]);

    await expect(createHealthNews({
      content: 'discarded',
      description: 'discarded',
      image: '  https://images.example/create.png  ',
      source: '  Public Health Desk  ',
      title: '  New guidance  ',
      url: '  https://example.com/guidance  ',
    })).resolves.toBe(created);
    await expect(updateHealthNews(NEWS_UUID, {
      category: '  medical  ',
      icon: 'discarded',
      image_url: '  https://images.example/update.png  ',
      source: '  Updated Desk  ',
      title: '  Updated guidance  ',
    })).resolves.toBe(updated);
    await expect(deleteHealthNews(NEWS_UUID)).resolves.toBeUndefined();
    await expect(toggleHealthNewsPublish(NEWS_UUID, false)).resolves.toBe(toggled);
    await expect(bulkImportHealthNews([{
      title: 'Imported',
      source: 'Wire',
      url: 'https://example.com/imported',
    }])).resolves.toBe(imported);

    expect(builders[0].insert).toHaveBeenCalledWith([{
      image_url: 'https://images.example/create.png',
      source: 'Public Health Desk',
      title: 'New guidance',
      url: 'https://example.com/guidance',
      created_at: '2026-07-13T12:00:00.000Z',
      published: true,
    }]);
    expect(builders[1].update).toHaveBeenCalledWith({
      category: 'medical',
      image_url: 'https://images.example/update.png',
      source: 'Updated Desk',
      title: 'Updated guidance',
    });
    expect(builders[1].eq).toHaveBeenCalledWith('id', NEWS_UUID);
    expect(builders[2].delete).toHaveBeenCalledTimes(1);
    expect(builders[2].eq).toHaveBeenCalledWith('id', NEWS_UUID);
    expect(builders[3].update).toHaveBeenCalledWith({ published: false });
    expect(builders[3].eq).toHaveBeenCalledWith('id', NEWS_UUID);
    expect(builders[4].insert).toHaveBeenCalledWith([{
      title: 'Imported',
      source: 'Wire',
      url: 'https://example.com/imported',
      category: 'general',
      published: true,
      image_url: null,
      created_at: '2026-07-13T12:00:00.000Z',
    }]);
  });

  it('keeps command validation loud and prevents invalid payload receivers', async () => {
    await expect(createHealthNews({ title: ' ', source: 'Desk' })).rejects.toThrow(
      'health news title and source are required'
    );
    await expect(updateHealthNews(NEWS_UUID, { source: ' ' })).rejects.toThrow(
      'health news source cannot be empty'
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      1,
      'Error creating health news:',
      expect.objectContaining({ message: 'health news title and source are required' })
    );
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      2,
      `Error updating health news ${NEWS_UUID}:`,
      expect.objectContaining({ message: 'health news source cannot be empty' })
    );
  });

  it('preserves analytics calculations and quiet fallback data shape', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
    const builders = installReceivers([{
      data: [
        {
          source: 'Desk A',
          category: 'medical',
          published: true,
          created_at: '2026-07-12T12:00:00.000Z',
        },
        {
          source: 'Desk A',
          category: 'general',
          published: false,
          created_at: '2026-06-01T12:00:00.000Z',
        },
        {
          source: 'Desk B',
          category: 'medical',
          published: true,
          created_at: '2026-07-10T12:00:00.000Z',
        },
      ],
      error: null,
    }]);

    await expect(getHealthNewsAnalytics()).resolves.toEqual({
      total: 3,
      published: 2,
      bySource: { 'Desk A': 2, 'Desk B': 1 },
      byCategory: { medical: 2, general: 1 },
      recent: 2,
    });
    expect(builders[0].select).toHaveBeenCalledWith(
      'source, category, published, created_at'
    );

    jest.clearAllMocks();
    installReceivers([{ data: null, error: new Error('analytics denied') }]);
    await expect(getHealthNewsAnalytics()).resolves.toEqual(emptyAnalytics);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Analytics query error:',
      expect.objectContaining({ message: 'analytics denied' })
    );
  });

  it('subscribes to all Health News changes and removes the exact subscribed channel', () => {
    const callback = jest.fn();
    const subscribedChannel = { topic: 'health-news-channel' };
    const subscribe = jest.fn(() => subscribedChannel);
    const on = jest.fn(() => ({ subscribe }));
    supabase.channel.mockReturnValue({ on });

    const cleanup = subscribeToHealthNews(callback);

    expect(supabase.channel).toHaveBeenCalledWith('health_news_all');
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'health_news' },
      callback
    );
    expect(subscribe).toHaveBeenCalledTimes(1);

    cleanup();
    expect(supabase.removeChannel).toHaveBeenCalledWith(subscribedChannel);
  });
});
