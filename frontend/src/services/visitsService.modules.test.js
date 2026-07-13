import fs from 'fs';
import path from 'path';
import * as facade from './visitsService';
import { VISIT_MUTATION_UNAVAILABLE_REASON } from './visits/constants';
import { getVisitsPageData } from './visits/pageQueries';
import {
  getVisit,
  getVisitByRequestId,
  getVisits,
} from './visits/queries';
import {
  getDoctorVisits,
  getHospitalVisits,
  getUserCompletedVisits,
  getUserUpcomingVisits,
  getUserVisits,
  getVisitStats,
} from './visits/scopedQueries';
import {
  cancelVisit,
  completeVisit,
  createVisit,
  deleteVisit,
  markVisitAsNoShow,
  updateVisit,
} from './visits/commands';
import {
  subscribeToAllVisits,
  subscribeToUserVisits,
  subscribeToVisit,
} from './visits/realtime';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/utils', () => ({ isValidUUID: jest.fn() }));
jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn(),
  getCurrentUser: jest.fn(),
}));
jest.mock('./supabaseHelpers', () => ({ withRetry: jest.fn() }));

const expectedFacade = {
  VISIT_MUTATION_UNAVAILABLE_REASON,
  cancelVisit,
  completeVisit,
  createVisit,
  deleteVisit,
  getDoctorVisits,
  getHospitalVisits,
  getUserCompletedVisits,
  getUserUpcomingVisits,
  getUserVisits,
  getVisit,
  getVisitByRequestId,
  getVisits,
  getVisitsPageData,
  getVisitStats,
  markVisitAsNoShow,
  subscribeToAllVisits,
  subscribeToUserVisits,
  subscribeToVisit,
  updateVisit,
};

const facadePath = 'src/services/visitsService.js';
const modulesDirectory = 'src/services/visits';
const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (source) => source.split(/\r?\n/).length;
const productionModulePaths = () => fs
  .readdirSync(modulesDirectory)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .map((name) => path.join(modulesDirectory, name));

describe('visits service modular boundary', () => {
  it('preserves the complete facade export surface and direct binding identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the compatibility facade thin and every production module under 300 lines', () => {
    const modulePaths = productionModulePaths();

    expect(lineCount(read(facadePath))).toBeLessThanOrEqual(75);
    expect(modulePaths).toHaveLength(9);
    modulePaths.forEach((modulePath) => {
      expect(lineCount(read(modulePath))).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase ownership out of the compatibility facade', () => {
    const source = read(facadePath);

    expect(source).not.toContain("from '../lib/supabase'");
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('.channel(');
    expect(source).toContain("from './visits/");
  });

  it('keeps production modules independent from contexts, hooks, pages, and modals', () => {
    const implementation = productionModulePaths().map(read).join('\n');

    expect(implementation).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });

  it('keeps every visit mutation fail-closed without a table, RPC, or Edge receiver', () => {
    const source = read(path.join(modulesDirectory, 'commands.js'));

    expect(source.match(/throw new Error\(VISIT_MUTATION_UNAVAILABLE_REASON\)/g)).toHaveLength(6);
    expect(source).not.toContain("from '../../lib/supabase'");
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('.rpc(');
    expect(source).not.toContain('.functions.invoke(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
  });
});
