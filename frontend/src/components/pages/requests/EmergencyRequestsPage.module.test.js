import { MobileEmergency } from '../../mobile/MobileEmergency';
import { MobileEmergencyDetailSheet } from '../../mobile/requests/MobileEmergencyDetailSheet';
import { MobileEmergencyList } from '../../mobile/requests/MobileEmergencyList';
import { useMobileEmergencyController } from '../../mobile/requests/useMobileEmergencyController';
import { EmergencyRequestsPage } from '../EmergencyRequestsPage';
import { RequestDetailRail } from './RequestDetailRail';
import { RequestsDesktopList } from './RequestsDesktopList';
import { RequestsDesktopWorkspace } from './RequestsDesktopWorkspace';
import { useEmergencyRequestCommands } from './useEmergencyRequestCommands';
import { useEmergencyRequestsChrome } from './useEmergencyRequestsChrome';
import { useEmergencyRequestsController } from './useEmergencyRequestsController';
import { useEmergencyRequestsQueryState } from './useEmergencyRequestsQueryState';
import { useEmergencyRequestsRealtime } from './useEmergencyRequestsRealtime';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

describe('Requests module boundaries', () => {
  it('keeps compatibility entries and extracted page-owned modules importable', () => {
    expect(EmergencyRequestsPage).toEqual(expect.any(Function));
    expect(RequestDetailRail).toEqual(expect.any(Function));
    expect(RequestsDesktopList).toEqual(expect.any(Function));
    expect(RequestsDesktopWorkspace).toEqual(expect.any(Function));
    expect(useEmergencyRequestCommands).toEqual(expect.any(Function));
    expect(useEmergencyRequestsChrome).toEqual(expect.any(Function));
    expect(useEmergencyRequestsController).toEqual(expect.any(Function));
    expect(useEmergencyRequestsQueryState).toEqual(expect.any(Function));
    expect(useEmergencyRequestsRealtime).toEqual(expect.any(Function));
    expect(MobileEmergency).toEqual(expect.any(Function));
    expect(MobileEmergencyList).toEqual(expect.any(Function));
    expect(MobileEmergencyDetailSheet).toEqual(expect.any(Function));
    expect(useMobileEmergencyController).toEqual(expect.any(Function));
  });
});
