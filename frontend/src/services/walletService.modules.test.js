import fs from 'fs';
import path from 'path';
import * as facade from './walletService';
import {
  getFinanceAnalytics,
  getProjectedRevenue,
  getWalletSummary,
} from './wallet/analytics';
import {
  checkCashEligibility,
  processCashPayment,
  topUpWallet,
  withdrawFunds,
} from './wallet/commands';
import {
  buildLoadedLedgerCsv,
  getWalletLedgerMetrics,
} from './wallet/ledger';
import {
  getWalletContextData,
  getWalletPageData,
  getWalletPayments,
} from './wallet/pageData';
import {
  createSetupIntent,
  deletePaymentMethod,
  getOrgStripeStatus,
  listPaymentMethods,
  setPayoutMethod,
} from './wallet/paymentMethods';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('./supabaseHelpers', () => ({
  withAudit: jest.fn(),
  withRetry: jest.fn(),
}));

const expectedFacade = {
  buildLoadedLedgerCsv,
  checkCashEligibility,
  createSetupIntent,
  deletePaymentMethod,
  getFinanceAnalytics,
  getOrgStripeStatus,
  getProjectedRevenue,
  getWalletContextData,
  getWalletLedgerMetrics,
  getWalletPageData,
  getWalletPayments,
  getWalletSummary,
  listPaymentMethods,
  processCashPayment,
  setPayoutMethod,
  topUpWallet,
  withdrawFunds,
};

describe('wallet service modular facade', () => {
  const facadePath = 'src/services/walletService.js';
  const modulesDirectory = 'src/services/wallet';

  it('preserves the complete named export surface and direct implementation identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the facade thin and every production module within the service limit', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const modulePaths = fs.readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(facadeSource.split(/\r?\n/).length).toBeLessThanOrEqual(40);
    expect(modulePaths).toHaveLength(6);
    modulePaths.forEach((modulePath) => {
      const source = fs.readFileSync(modulePath, 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps the compatibility facade free of implementation wrappers and Supabase ownership', () => {
    const source = fs.readFileSync(facadePath, 'utf8');

    expect(source).not.toContain("from '../lib/supabase'");
    expect(source).not.toMatch(/export\s+const/);
    expect(source).not.toMatch(/export\s+default/);
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('.rpc(');
    expect(source).toContain("from './wallet/");
  });
});
