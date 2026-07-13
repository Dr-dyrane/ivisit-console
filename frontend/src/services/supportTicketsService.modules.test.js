import fs from 'fs';
import path from 'path';
import * as facade from './supportTicketsService';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_CREATE_FIELDS,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_UPDATE_FIELDS,
} from './support-tickets/constants';
import {
  getSupportTicketsPage,
  getSupportTicketsPageStats,
} from './support-tickets/pageQueries';
import {
  getOpenTicketsCount,
  getSupportTicket,
  getSupportTickets,
  getUserSupportTickets,
} from './support-tickets/queries';
import { getSupportTicketsAnalytics } from './support-tickets/analytics';
import {
  assignTicket,
  createSupportTicket,
  deleteSupportTicket,
  updateSupportTicket,
  updateTicketStatus,
} from './support-tickets/commands';
import { subscribeToSupportTickets } from './support-tickets/realtime';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/utils', () => ({ isValidUUID: jest.fn() }));
jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn(),
  getCurrentUser: jest.fn(),
}));
jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(),
  withRetry: jest.fn(),
}));

const expectedFacade = {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  assignTicket,
  createSupportTicket,
  deleteSupportTicket,
  getOpenTicketsCount,
  getSupportTicket,
  getSupportTickets,
  getSupportTicketsAnalytics,
  getSupportTicketsPage,
  getSupportTicketsPageStats,
  getUserSupportTickets,
  subscribeToSupportTickets,
  updateSupportTicket,
  updateTicketStatus,
};

const facadePath = 'src/services/supportTicketsService.js';
const modulesDirectory = 'src/services/support-tickets';
const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (source) => source.split(/\r?\n/).length;
const productionModulePaths = () => fs
  .readdirSync(modulesDirectory)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join(modulesDirectory, name));

describe('support tickets service modular boundary', () => {
  it('preserves the complete facade export surface and direct binding identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the facade thin and every production module at or below 300 lines', () => {
    const modulePaths = productionModulePaths();

    expect(lineCount(read(facadePath))).toBeLessThanOrEqual(50);
    expect(modulePaths).toHaveLength(8);
    modulePaths.forEach((modulePath) => {
      expect(lineCount(read(modulePath))).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase ownership out of the compatibility facade', () => {
    const source = read(facadePath);

    expect(source).not.toContain("from '../lib/supabase'");
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('.channel(');
    expect(source).not.toContain('.rpc(');
    expect(source).toContain("from './support-tickets/");
  });

  it('keeps production modules independent from UI, hooks, and contexts', () => {
    const implementation = productionModulePaths().map(read).join('\n');

    expect(implementation).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });

  it('preserves authenticated identity and excludes authority and attachment fields', () => {
    expect(SUPPORT_TICKET_CREATE_FIELDS).toEqual([
      'subject',
      'message',
      'category',
      'priority',
    ]);
    expect(SUPPORT_TICKET_UPDATE_FIELDS).toEqual([
      'subject',
      'message',
      'category',
      'priority',
    ]);

    const allowLists = [SUPPORT_TICKET_CREATE_FIELDS, SUPPORT_TICKET_UPDATE_FIELDS].flat();
    expect(allowLists).not.toEqual(expect.arrayContaining([
      'assigned_to',
      'attachment',
      'attachment_url',
      'organization_id',
      'status',
      'user_id',
    ]));
  });

  it('keeps proved commands on audited table receivers without RPC, Edge, or Storage drift', () => {
    const commands = read(path.join(modulesDirectory, 'commands.js'));

    expect(commands.match(/\.from\(TABLE_NAME\)/g)).toHaveLength(5);
    expect(commands.match(/\.eq\('id', ticketId\)/g)).toHaveLength(4);
    expect(commands.match(/await withAudit\(/g)).toHaveLength(5);
    expect(commands).not.toContain('.rpc(');
    expect(commands).not.toContain('.functions.invoke(');
    expect(commands).not.toContain('.storage');
    expect(commands).not.toContain('.upload(');
    expect(commands).not.toContain('attachment');
  });

  it('keeps exact page counts, cancellation, UUID keys, and realtime cleanup in their owners', () => {
    const pageQueries = read(path.join(modulesDirectory, 'pageQueries.js'));
    const queries = read(path.join(modulesDirectory, 'queries.js'));
    const realtime = read(path.join(modulesDirectory, 'realtime.js'));

    expect(pageQueries).toContain("select('id', { count: 'exact', head: true })");
    expect(pageQueries).toContain('applyQueryAbortSignal');
    expect(pageQueries).toContain('throwIfQueryAborted');
    expect(pageQueries).toContain('.range(offset, offset + limit - 1)');
    expect(queries).toContain(".eq('id', ticketId)");
    expect(queries).toContain(".eq('user_id', userId)");
    expect(queries).not.toContain('display_id');
    expect(realtime).toContain(".channel('support_tickets_changes')");
    expect(realtime).toContain('return () => supabase.removeChannel(channel);');
  });
});
