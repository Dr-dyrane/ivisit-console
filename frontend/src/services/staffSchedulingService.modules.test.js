import fs from 'fs';
import path from 'path';
import * as facade from './staffSchedulingService';
import {
  createStaffSchedule,
  deleteStaffSchedule,
  updateStaffSchedule,
} from './staff-scheduling/commands';
import { checkScheduleConflicts } from './staff-scheduling/conflicts';
import {
  getStaffScheduleById,
  getStaffSchedules,
} from './staff-scheduling/reads';
import { subscribeToScheduleUpdates } from './staff-scheduling/realtime';
import { getAvailableStaff } from './staff-scheduling/rosterReads';
import { getScheduleStats } from './staff-scheduling/stats';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn(),
  getCurrentUser: jest.fn(),
}));

const expectedFacade = {
  checkScheduleConflicts,
  createStaffSchedule,
  deleteStaffSchedule,
  getAvailableStaff,
  getScheduleStats,
  getStaffScheduleById,
  getStaffSchedules,
  subscribeToScheduleUpdates,
  updateStaffSchedule,
};

describe('staff scheduling service module boundary', () => {
  const facadePath = 'src/services/staffSchedulingService.js';
  const modulesDirectory = 'src/services/staff-scheduling';

  it('preserves every named export as the direct implementation reference', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the compatibility facade thin and production modules bounded', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const modulePaths = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(facadeSource.split(/\r?\n/).length).toBeLessThanOrEqual(40);
    expect(modulePaths).toHaveLength(6);
    modulePaths.forEach((modulePath) => {
      const lineCount = fs.readFileSync(modulePath, 'utf8').split(/\r?\n/).length;
      expect(lineCount).toBeLessThanOrEqual(240);
    });
  });

  it('keeps Supabase ownership out of the facade and UI ownership out of modules', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const implementationSource = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => fs.readFileSync(path.join(modulesDirectory, name), 'utf8'))
      .join('\n');

    expect(facadeSource).not.toContain("from '../lib/supabase'");
    expect(facadeSource).not.toContain('.from(');
    expect(facadeSource).not.toContain('.channel(');
    expect(facadeSource).toContain("from './staff-scheduling/");
    expect(implementationSource).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });
});
