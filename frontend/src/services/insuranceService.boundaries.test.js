import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase';
import {
  buildInsuranceWritePayload,
  createInsurancePolicy,
  deleteInsurancePolicy,
  getInsuranceAnalytics,
  getInsurancePolicies,
  getInsurancePolicy,
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
  updateInsurancePolicy,
  updatePolicyStatus,
  uploadInsuranceCardImage,
  verifyInsurancePolicy,
} from './insuranceService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('./authService', () => ({ getCurrentUser: jest.fn() }));

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('insurance service authority boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps policy and trigger-created billing reads in separate modules with no write receiver', () => {
    const policySource = [
      read('insurance/policyFilters.js'),
      read('insurance/policyNormalization.js'),
      read('insurance/policyProjection.js'),
    ].join('\n');
    const billingSource = [
      read('insurance/billingFilters.js'),
      read('insurance/billingNormalization.js'),
      read('insurance/billingProjection.js'),
    ].join('\n');
    const projectionSource = `${policySource}\n${billingSource}`;
    const unsupportedSource = read('insurance/unsupportedOperations.js');

    expect(policySource).toContain("const TABLE_NAME = 'insurance_policies';");
    expect(policySource).not.toContain('insurance_billing');
    expect(billingSource).toContain("const BILLING_TABLE_NAME = 'insurance_billing';");
    expect(billingSource).not.toContain("'insurance_policies'");
    expect(projectionSource).not.toMatch(/\.(?:insert|update|upsert|delete|rpc)\s*\(/);
    expect(unsupportedSource).not.toContain('supabase');
  });

  it('keeps payload construction synchronously unavailable without touching Supabase', () => {
    expect(() => buildInsuranceWritePayload({ user_id: 'patient-1' })).toThrow(
      'Insurance write payload construction is unavailable until admin policy authority is verified.'
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it.each([
    ['legacy list read', getInsurancePolicies, 'Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.'],
    ['legacy detail read', getInsurancePolicy, 'Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.'],
    ['create', createInsurancePolicy, 'Insurance policy create is unavailable until admin policy authority is verified.'],
    ['update', updateInsurancePolicy, 'Insurance policy update is unavailable until admin policy authority is verified.'],
    ['delete', deleteInsurancePolicy, 'Insurance policy delete is unavailable until admin policy authority is verified.'],
    ['status update', updatePolicyStatus, 'Insurance policy status update is unavailable until admin policy authority is verified.'],
    ['verification', verifyInsurancePolicy, 'Insurance policy verification is unavailable until admin policy authority is verified.'],
    ['analytics', getInsuranceAnalytics, 'Insurance analytics export is unavailable until route-wide distribution scope is verified.'],
    ['card upload', uploadInsuranceCardImage, 'Insurance card upload is unavailable until private storage ownership is verified.'],
  ])('keeps %s fail closed without a receiver call', async (_label, operation, message) => {
    await expect(operation('ignored-id', { ignored: true })).rejects.toThrow(message);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('preserves policy and billing channels, callback identity, and cleanup', () => {
    const makeChannel = () => {
      const channel = {};
      channel.on = jest.fn(() => channel);
      channel.subscribe = jest.fn(() => channel);
      return channel;
    };
    const policyChannel = makeChannel();
    const billingChannel = makeChannel();
    const policyCallback = jest.fn();
    const billingCallback = jest.fn();
    supabase.channel
      .mockReturnValueOnce(policyChannel)
      .mockReturnValueOnce(billingChannel);

    const cleanupPolicy = subscribeToInsurancePolicies(policyCallback);
    const cleanupBilling = subscribeToInsuranceBillingOutcomes(billingCallback, 'billing-route');

    expect(supabase.channel).toHaveBeenNthCalledWith(1, 'insurance_policies_changes');
    expect(policyChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'insurance_policies' },
      policyCallback
    );
    expect(supabase.channel).toHaveBeenNthCalledWith(2, 'billing-route');
    expect(billingChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'insurance_billing' },
      billingCallback
    );

    cleanupPolicy();
    cleanupBilling();
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(1, policyChannel);
    expect(supabase.removeChannel).toHaveBeenNthCalledWith(2, billingChannel);
  });
});
