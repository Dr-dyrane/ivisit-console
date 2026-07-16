import fs from 'fs';
import path from 'path';
import * as facade from './pricingService';
import {
  deleteRoomPricing,
  deleteServicePricing,
  saveRoomPricing,
  saveServicePricing,
} from './pricing/commands';
import { getPricingPageData } from './pricing/pageData';
import { getPricing } from './pricing/reads';

jest.mock('../lib/supabase', () => ({ supabase: {} }));

const expectedFacade = {
  deleteRoomPricing,
  deleteServicePricing,
  getPricing,
  getPricingPageData,
  saveRoomPricing,
  saveServicePricing,
};

describe('pricing service module boundary', () => {
  const facadePath = 'src/services/pricingService.js';
  const modulesDirectory = 'src/services/pricing';

  it('preserves every named export as the direct implementation reference', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the facade thin and every production module within the service limit', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const moduleNames = fs.readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .sort();

    expect(facadeSource.split(/\r?\n/).length).toBeLessThanOrEqual(30);
    expect(moduleNames).toEqual([
      'commands.js',
      'constants.js',
      'normalization.js',
      'pageData.js',
      'projectionQueries.js',
      'reads.js',
      'resolvedPrice.js',
    ]);
    moduleNames.forEach((moduleName) => {
      const source = fs.readFileSync(path.join(modulesDirectory, moduleName), 'utf8');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps data ownership out of the facade and UI/realtime ownership out of Pricing modules', () => {
    const facadeSource = fs.readFileSync(facadePath, 'utf8');
    const implementationSource = fs.readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => fs.readFileSync(path.join(modulesDirectory, name), 'utf8'))
      .join('\n');

    expect(facadeSource).not.toContain("from '../lib/supabase'");
    expect(facadeSource).not.toMatch(/export\s+const/);
    expect(facadeSource).not.toMatch(/export\s+default/);
    expect(facadeSource).not.toContain('.from(');
    expect(facadeSource).not.toContain('.rpc(');
    expect(facadeSource).toContain("from './pricing/");
    expect(implementationSource).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
    expect(implementationSource).not.toMatch(/\.(?:channel|removeChannel)\(/);
    expect(implementationSource).not.toContain('postgres_changes');
    expect(implementationSource).not.toMatch(/\.subscribe\(/);
    expect(implementationSource).not.toMatch(/\b(?:console|toast)\./);
  });
});
