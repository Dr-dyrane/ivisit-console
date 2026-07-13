import fs from 'fs';
import path from 'path';
import * as facade from './healthNewsService';
import { getHealthNewsAnalytics } from './health-news/analytics';
import {
  bulkImportHealthNews,
  createHealthNews,
  deleteHealthNews,
  toggleHealthNewsPublish,
  updateHealthNews,
} from './health-news/commands';
import {
  getHealthNewsPage,
  getHealthNewsPageStats,
} from './health-news/pageQueries';
import {
  getHealthNews,
  getHealthNewsItem,
  getLatestHealthNews,
  getNewsByCategory,
} from './health-news/queries';
import { subscribeToHealthNews } from './health-news/realtime';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/utils', () => ({ isValidUUID: jest.fn() }));
jest.mock('./authService', () => ({ getCurrentUser: jest.fn() }));

const expectedFacade = {
  bulkImportHealthNews,
  createHealthNews,
  deleteHealthNews,
  getHealthNews,
  getHealthNewsAnalytics,
  getHealthNewsItem,
  getHealthNewsPage,
  getHealthNewsPageStats,
  getLatestHealthNews,
  getNewsByCategory,
  subscribeToHealthNews,
  toggleHealthNewsPublish,
  updateHealthNews,
};

const facadePath = 'src/services/healthNewsService.js';
const modulesDirectory = 'src/services/health-news';
const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (source) => source.split(/\r?\n/).length;
const productionModulePaths = () => fs
  .readdirSync(modulesDirectory)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join(modulesDirectory, name));

describe('Health News service modular boundary', () => {
  it('preserves the complete facade export surface and direct binding identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the facade thin and every production module within the size target', () => {
    const modulePaths = productionModulePaths();

    expect(lineCount(read(facadePath))).toBeLessThanOrEqual(40);
    expect(modulePaths).toHaveLength(8);
    modulePaths.forEach((modulePath) => {
      expect(lineCount(read(modulePath))).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase ownership out of the facade and UI ownership out of modules', () => {
    const facadeSource = read(facadePath);
    const implementation = productionModulePaths().map(read).join('\n');

    expect(facadeSource).not.toContain("from '../lib/supabase'");
    expect(facadeSource).not.toContain('.from(');
    expect(facadeSource).not.toContain('.channel(');
    expect(facadeSource).not.toContain('.rpc(');
    expect(facadeSource).toContain("from './health-news/");
    expect(implementation).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });

  it('keeps published scope, exact counts, search, and pagination in the page read owner', () => {
    const pageQueries = read(path.join(modulesDirectory, 'pageQueries.js'));
    const queryFilters = read(path.join(modulesDirectory, 'queryFilters.js'));

    expect(pageQueries).toContain("select('id', { count: 'exact', head: true })");
    expect(pageQueries).toContain("select('*', { count: 'exact' })");
    expect(pageQueries).toContain('.range(offset, offset + limit - 1)');
    expect(queryFilters).toContain("return query.eq('published', true)");
    expect(queryFilters).toContain('title.ilike.%${search}%');
    expect(queryFilters).toContain('source.ilike.%${search}%');
    expect(queryFilters).toContain('category.ilike.%${search}%');
  });

  it('keeps UUID reads and dormant commands on their existing table receiver', () => {
    const commands = read(path.join(modulesDirectory, 'commands.js'));
    const queries = read(path.join(modulesDirectory, 'queries.js'));

    expect(queries).toContain('if (!isValidUUID(newsId)) return null;');
    expect(queries).toContain(".eq('id', newsId)");
    expect(queries).not.toContain('display_id');
    expect(commands.match(/\.from\(TABLE_NAME\)/g)).toHaveLength(5);
    expect(commands.match(/\.eq\('id', newsId\)/g)).toHaveLength(3);
    expect(commands).not.toContain('display_id');
    expect(commands).not.toContain('.rpc(');
    expect(commands).not.toContain('.functions.invoke(');
    expect(commands).not.toContain('.storage');
    expect(commands).not.toContain('.upload(');
  });

  it('keeps realtime ownership and cleanup isolated from reads and commands', () => {
    const realtime = read(path.join(modulesDirectory, 'realtime.js'));
    const nonRealtime = productionModulePaths()
      .filter((modulePath) => !modulePath.endsWith(`${path.sep}realtime.js`))
      .map(read)
      .join('\n');

    expect(realtime).toContain(".channel('health_news_all')");
    expect(realtime).toContain("table: TABLE_NAME");
    expect(realtime).toContain('return () => supabase.removeChannel(channel);');
    expect(nonRealtime).not.toContain('.channel(');
    expect(nonRealtime).not.toContain('removeChannel(');
  });
});
