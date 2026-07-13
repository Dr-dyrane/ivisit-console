import fs from 'fs';
import * as facade from './hospitalsService';
import { buildHospitalPayload } from './hospitals/payload';
import { getHospitalVisibleStats } from './hospitals/stats';
import {
  getHospital,
  getHospitalOptions,
  getHospitals,
  getHospitalsBySpecialty,
  getVerifiedHospitals,
} from './hospitals/queries';
import { getHospitalPageStats, getHospitalsPageData } from './hospitals/pageQueries';
import {
  createHospital,
  deleteHospital,
  updateHospital,
  updateHospitalBedCount,
  updateHospitalStatus,
} from './hospitals/commands';
import { subscribeToHospital } from './hospitals/realtime';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(),
  withRetry: jest.fn(),
}));

const expectedFacade = {
  buildHospitalPayload,
  createHospital,
  deleteHospital,
  getHospital,
  getHospitalOptions,
  getHospitalPageStats,
  getHospitalVisibleStats,
  getHospitals,
  getHospitalsBySpecialty,
  getHospitalsPageData,
  getVerifiedHospitals,
  subscribeToHospital,
  updateHospital,
  updateHospitalBedCount,
  updateHospitalStatus,
};

const implementationFiles = [
  ['src/services/hospitalsService.js', 40],
  ['src/services/hospitals/commands.js', 160],
  ['src/services/hospitals/constants.js', 160],
  ['src/services/hospitals/filters.js', 160],
  ['src/services/hospitals/pageQueries.js', 160],
  ['src/services/hospitals/payload.js', 160],
  ['src/services/hospitals/queries.js', 160],
  ['src/services/hospitals/realtime.js', 160],
  ['src/services/hospitals/stats.js', 160],
];

describe('hospitals service modular facade', () => {
  it('preserves the complete named export surface and direct function identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it.each(implementationFiles)('%s stays within its module-size boundary', (file, maximumLines) => {
    const source = fs.readFileSync(file, 'utf8');
    const lineCount = source.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(maximumLines);
  });

  it('keeps Supabase ownership out of the compatibility facade', () => {
    const source = fs.readFileSync('src/services/hospitalsService.js', 'utf8');

    expect(source).not.toContain("from '../lib/supabase'");
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('.rpc(');
    expect(source).toContain("from './hospitals/");
  });
});
