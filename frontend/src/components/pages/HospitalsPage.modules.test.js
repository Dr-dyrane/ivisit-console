jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileHospitals } from '../mobile/MobileHospitals';
import { MobileHospitalDetailSheet } from '../mobile/hospitals/MobileHospitalDetailSheet';
import { MobileHospitalRow } from '../mobile/hospitals/MobileHospitalRow';
import { MobileHospitalsAtlasLayer } from '../mobile/hospitals/MobileHospitalsAtlasLayer';
import { useMobileHospitalsController } from '../mobile/hospitals/useMobileHospitalsController';
import { HospitalsPage } from './HospitalsPage';
import { HospitalAvatar } from './hospitals/HospitalAvatar';
import { HospitalDetailRail } from './hospitals/HospitalDetailRail';
import { HospitalsDesktopWorkspace } from './hospitals/HospitalsDesktopWorkspace';
import { HospitalsPageView } from './hospitals/HospitalsPageView';
import { useHospitalsPageChrome } from './hospitals/useHospitalsPageChrome';
import { useHospitalsPageController } from './hospitals/useHospitalsPageController';

describe('Hospitals module compatibility exports', () => {
  it.each([
    ['HospitalsPage', HospitalsPage],
    ['HospitalsPageView', HospitalsPageView],
    ['HospitalsDesktopWorkspace', HospitalsDesktopWorkspace],
    ['HospitalDetailRail', HospitalDetailRail],
    ['HospitalAvatar', HospitalAvatar],
    ['useHospitalsPageController', useHospitalsPageController],
    ['useHospitalsPageChrome', useHospitalsPageChrome],
    ['MobileHospitals', MobileHospitals],
    ['MobileHospitalDetailSheet', MobileHospitalDetailSheet],
    ['MobileHospitalRow', MobileHospitalRow],
    ['MobileHospitalsAtlasLayer', MobileHospitalsAtlasLayer],
    ['useMobileHospitalsController', useMobileHospitalsController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
