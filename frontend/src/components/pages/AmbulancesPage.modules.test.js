jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileAmbulances } from '../mobile/MobileAmbulances';
import { MobileAmbulancesAtlasLayer } from '../mobile/ambulances/MobileAmbulancesAtlasLayer';
import { MobileAmbulanceDetailSheet } from '../mobile/ambulances/MobileAmbulanceDetailSheet';
import { MobileAmbulanceRow } from '../mobile/ambulances/MobileAmbulanceRow';
import { useMobileAmbulancesController } from '../mobile/ambulances/useMobileAmbulancesController';
import { AmbulancesPage } from './AmbulancesPage';
import { AmbulanceDetailRail } from './ambulances/AmbulanceDetailRail';
import { AmbulanceAvatar, AmbulanceListHeader, AmbulanceRow } from './ambulances/AmbulanceList';
import { AmbulancesDesktopWorkspace } from './ambulances/AmbulancesDesktopWorkspace';
import { AmbulancesPageView } from './ambulances/AmbulancesPageView';
import { useAmbulancesPageChrome } from './ambulances/useAmbulancesPageChrome';
import { useAmbulancesPageController } from './ambulances/useAmbulancesPageController';

describe('Ambulances module compatibility exports', () => {
  it.each([
    ['AmbulancesPage', AmbulancesPage],
    ['AmbulancesPageView', AmbulancesPageView],
    ['AmbulancesDesktopWorkspace', AmbulancesDesktopWorkspace],
    ['AmbulanceDetailRail', AmbulanceDetailRail],
    ['AmbulanceAvatar', AmbulanceAvatar],
    ['AmbulanceListHeader', AmbulanceListHeader],
    ['AmbulanceRow', AmbulanceRow],
    ['useAmbulancesPageController', useAmbulancesPageController],
    ['useAmbulancesPageChrome', useAmbulancesPageChrome],
    ['MobileAmbulances', MobileAmbulances],
    ['MobileAmbulancesAtlasLayer', MobileAmbulancesAtlasLayer],
    ['MobileAmbulanceDetailSheet', MobileAmbulanceDetailSheet],
    ['MobileAmbulanceRow', MobileAmbulanceRow],
    ['useMobileAmbulancesController', useMobileAmbulancesController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
