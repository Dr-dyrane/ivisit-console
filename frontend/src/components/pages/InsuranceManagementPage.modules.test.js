jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileInsurance } from '../mobile/MobileInsurance';
import { MobileInsuranceAtlasLayer } from '../mobile/insurance/MobileInsuranceAtlasLayer';
import { MobileInsuranceDetailSheet } from '../mobile/insurance/MobileInsuranceDetailSheet';
import { MobileInsuranceRow } from '../mobile/insurance/MobileInsuranceRow';
import { useMobileInsuranceController } from '../mobile/insurance/useMobileInsuranceController';
import { InsuranceManagementPage } from './InsuranceManagementPage';
import { InsuranceDesktopWorkspace } from './insurance/InsuranceDesktopWorkspace';
import { InsuranceDetailRail } from './insurance/InsuranceDetailRail';
import { InsurancePageView } from './insurance/InsurancePageView';
import { useInsurancePageData } from './insurance/useInsurancePageData';
import { useInsuranceRouteBridge } from './insurance/useInsuranceRouteBridge';

describe('Insurance module compatibility exports', () => {
  it.each([
    ['InsuranceManagementPage', InsuranceManagementPage],
    ['InsurancePageView', InsurancePageView],
    ['InsuranceDesktopWorkspace', InsuranceDesktopWorkspace],
    ['InsuranceDetailRail', InsuranceDetailRail],
    ['useInsurancePageData', useInsurancePageData],
    ['useInsuranceRouteBridge', useInsuranceRouteBridge],
    ['MobileInsurance', MobileInsurance],
    ['MobileInsuranceAtlasLayer', MobileInsuranceAtlasLayer],
    ['MobileInsuranceDetailSheet', MobileInsuranceDetailSheet],
    ['MobileInsuranceRow', MobileInsuranceRow],
    ['useMobileInsuranceController', useMobileInsuranceController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
