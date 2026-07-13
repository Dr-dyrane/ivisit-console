import fs from 'fs';
import path from 'path';
import * as facade from './ambulancesService';
import {
  createAmbulance,
  deleteAmbulance,
  updateAmbulance,
} from './ambulances/commands';
import {
  getAvailableDrivers,
  getDrivers,
} from './ambulances/driverReads';
import {
  assignDriverToAmbulance,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
} from './ambulances/operationalCommands';
import { getAmbulancesPageData } from './ambulances/pageQueries';
import {
  getAmbulance,
  getAmbulances,
  getAvailableAmbulances,
  getDriverAmbulance,
  getHospitalAmbulances,
} from './ambulances/reads';
import {
  subscribeToAllAmbulances,
  subscribeToAmbulance,
} from './ambulances/realtime';
import {
  applyAmbulanceOrgAdminScope,
  assertAmbulanceWriteScope,
  filterAmbulanceStationOptions,
} from './ambulances/scope';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(),
  withRetry: jest.fn(),
}));

const expectedFacade = {
  applyAmbulanceOrgAdminScope,
  assertAmbulanceWriteScope,
  assignDriverToAmbulance,
  createAmbulance,
  deleteAmbulance,
  filterAmbulanceStationOptions,
  getAmbulance,
  getAmbulances,
  getAmbulancesPageData,
  getAvailableAmbulances,
  getAvailableDrivers,
  getDriverAmbulance,
  getDrivers,
  getHospitalAmbulances,
  subscribeToAllAmbulances,
  subscribeToAmbulance,
  updateAmbulance,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
};

describe('ambulances service module boundary', () => {
  const facadePath = 'src/services/ambulancesService.js';
  const modulesDirectory = 'src/services/ambulances';

  it('preserves every named export as the direct implementation reference', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the compatibility facade thin and production modules within the size target', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const modulePaths = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(facadeSource.split(/\r?\n/).length).toBeLessThanOrEqual(60);
    expect(modulePaths).toHaveLength(9);
    modulePaths.forEach((modulePath) => {
      const lineCount = fs.readFileSync(modulePath, 'utf8').split(/\r?\n/).length;
      expect(lineCount).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase ownership out of the facade and UI ownership out of service modules', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const implementationSource = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => fs.readFileSync(path.join(modulesDirectory, name), 'utf8'))
      .join('\n');

    expect(facadeSource).not.toContain("from '../lib/supabase'");
    expect(facadeSource).not.toContain('.from(');
    expect(facadeSource).not.toContain('.rpc(');
    expect(facadeSource).toContain("from './ambulances/");
    expect(implementationSource).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });
});
