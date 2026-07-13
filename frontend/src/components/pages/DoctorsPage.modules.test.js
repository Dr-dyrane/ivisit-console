jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileDoctors } from '../mobile/MobileDoctors';
import { MobileDoctorsView } from '../mobile/doctors/MobileDoctorsView';
import { useMobileDoctorsController } from '../mobile/doctors/useMobileDoctorsController';
import { DoctorsPage } from './DoctorsPage';
import { DoctorsPageView } from './doctors/DoctorsPageView';
import { StaffDesktopWorkspace, StaffDetailRail } from './doctors/StaffDesktopWorkspace';
import { useDoctorsPageChrome } from './doctors/useDoctorsPageChrome';
import { useDoctorsPageController } from './doctors/useDoctorsPageController';
import { useDoctorsRouteBridge } from './doctors/useDoctorsRouteBridge';

describe('Doctors module compatibility exports', () => {
  it.each([
    ['DoctorsPage', DoctorsPage],
    ['DoctorsPageView', DoctorsPageView],
    ['StaffDesktopWorkspace', StaffDesktopWorkspace],
    ['StaffDetailRail', StaffDetailRail],
    ['useDoctorsPageController', useDoctorsPageController],
    ['useDoctorsPageChrome', useDoctorsPageChrome],
    ['useDoctorsRouteBridge', useDoctorsRouteBridge],
    ['MobileDoctors', MobileDoctors],
    ['MobileDoctorsView', MobileDoctorsView],
    ['useMobileDoctorsController', useMobileDoctorsController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
