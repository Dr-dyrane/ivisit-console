import fs from 'fs';
import path from 'path';
import * as facade from './insuranceService';
import {
  getInsuranceBillingOutcomes,
  getInsuranceBillingOutcomeStats,
} from './insurance/billingProjection';
import { normalizeInsuranceBillingOutcome } from './insurance/billingNormalization';
import {
  EMPTY_INSURANCE_BILLING_REFERENCES,
  resolveInsuranceBillingReferences,
} from './insurance/billingReferenceResolution';
import { getInsurancePage, getInsurancePageStats } from './insurance/policyProjection';
import { normalizeInsurancePolicy } from './insurance/policyNormalization';
import {
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from './insurance/realtime';
import {
  buildInsuranceWritePayload,
  createInsurancePolicy,
  deleteInsurancePolicy,
  getInsuranceAnalytics,
  getInsurancePolicies,
  getInsurancePolicy,
  updateInsurancePolicy,
  updatePolicyStatus,
  uploadInsuranceCardImage,
  verifyInsurancePolicy,
} from './insurance/unsupportedOperations';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('./authService', () => ({ getCurrentUser: jest.fn() }));

const expectedFacade = {
  buildInsuranceWritePayload,
  createInsurancePolicy,
  deleteInsurancePolicy,
  EMPTY_INSURANCE_BILLING_REFERENCES,
  getInsuranceAnalytics,
  getInsuranceBillingOutcomes,
  getInsuranceBillingOutcomeStats,
  getInsurancePage,
  getInsurancePageStats,
  getInsurancePolicies,
  getInsurancePolicy,
  normalizeInsuranceBillingOutcome,
  normalizeInsurancePolicy,
  resolveInsuranceBillingReferences,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
  updateInsurancePolicy,
  updatePolicyStatus,
  uploadInsuranceCardImage,
  verifyInsurancePolicy,
};

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('insurance service modular facade', () => {
  it('preserves the complete named export surface and direct function identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the facade thin and production modules within the service limit', () => {
    const facadeSource = read('insuranceService.js');
    const modulesDirectory = path.join(__dirname, 'insurance');
    const modulePaths = fs.readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(facadeSource.split(/\r?\n/).length).toBeLessThanOrEqual(60);
    expect(modulePaths.length).toBeGreaterThanOrEqual(8);
    modulePaths.forEach((modulePath) => {
      const source = fs.readFileSync(modulePath, 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase ownership and implementation wrappers out of the facade', () => {
    const source = read('insuranceService.js');

    expect(source).not.toContain("from '../lib/supabase'");
    expect(source).not.toMatch(/export\s+(?:async\s+)?function/);
    expect(source).not.toMatch(/export\s+default/);
    expect(source).toContain("from './insurance/");
  });
});
