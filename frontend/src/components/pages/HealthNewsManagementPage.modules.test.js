jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileHealthNews } from '../mobile/MobileHealthNews';
import { MobileHealthNewsAtlasLayer } from '../mobile/health-news/MobileHealthNewsAtlasLayer';
import { MobileHealthNewsDetailSheet } from '../mobile/health-news/MobileHealthNewsDetailSheet';
import { MobileHealthNewsList } from '../mobile/health-news/MobileHealthNewsList';
import { useMobileHealthNewsController } from '../mobile/health-news/useMobileHealthNewsController';
import { HealthNewsManagementPage } from './HealthNewsManagementPage';
import { HealthNewsDesktopWorkspace } from './health-news/HealthNewsDesktopWorkspace';
import { HealthNewsDetailRail } from './health-news/HealthNewsDetailRail';
import { HealthNewsPageView } from './health-news/HealthNewsPageView';
import { HealthNewsProjectionStatsNotice } from './health-news/HealthNewsProjectionStatsNotice';
import { useHealthNewsPageChrome } from './health-news/useHealthNewsPageChrome';
import { useHealthNewsPageController } from './health-news/useHealthNewsPageController';

describe('Health News module boundaries', () => {
  it.each([
    ['HealthNewsManagementPage', HealthNewsManagementPage],
    ['HealthNewsPageView', HealthNewsPageView],
    ['HealthNewsDesktopWorkspace', HealthNewsDesktopWorkspace],
    ['HealthNewsDetailRail', HealthNewsDetailRail],
    ['HealthNewsProjectionStatsNotice', HealthNewsProjectionStatsNotice],
    ['useHealthNewsPageChrome', useHealthNewsPageChrome],
    ['useHealthNewsPageController', useHealthNewsPageController],
    ['MobileHealthNews', MobileHealthNews],
    ['MobileHealthNewsAtlasLayer', MobileHealthNewsAtlasLayer],
    ['MobileHealthNewsDetailSheet', MobileHealthNewsDetailSheet],
    ['MobileHealthNewsList', MobileHealthNewsList],
    ['useMobileHealthNewsController', useMobileHealthNewsController],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });
});
