import fs from 'fs';

jest.mock('@/lib/utils', () => ({
  cn: (...values) => values.filter(Boolean).join(' '),
}), { virtual: true });

import { MobileSettings } from '../mobile/MobileSettings';
import { MobileSettingsContent } from '../mobile/settings/MobileSettingsContent';
import {
  SettingsActionRow,
  SettingsInfoRow,
  SettingsSection,
} from '../mobile/settings/MobileSettingsPrimitives';
import { MobileSettingsSkeleton } from '../mobile/settings/MobileSettingsSkeleton';
import { SettingsPage } from './SettingsPage';
import { SettingsSheet } from './settings/SettingsAccountSheet';
import { SettingsDesktopWorkspace } from './settings/SettingsDesktopWorkspace';
import { SettingsDetailRail } from './settings/SettingsDetailRail';
import { SettingsHeaderAction } from './settings/SettingsHeaderAction';
import { SettingsModalStack } from './settings/SettingsModalStack';
import { SettingsPageView } from './settings/SettingsPageView';
import { useSettingsPageController } from './settings/useSettingsPageController';
import { useSettingsPageChrome } from './settings/useSettingsPageChrome';
import {
  useSettingsActionBridge,
  useSettingsDisplayId,
  useSettingsRouteContextPublisher,
} from './settings/useSettingsRouteBridge';

const SETTINGS_PRODUCTION_MODULES = [
  'src/components/pages/SettingsPage.jsx',
  'src/components/pages/settings/SettingsAccountSheet.jsx',
  'src/components/pages/settings/SettingsDesktopWorkspace.jsx',
  'src/components/pages/settings/SettingsDetailRail.jsx',
  'src/components/pages/settings/SettingsHeaderAction.jsx',
  'src/components/pages/settings/SettingsModalStack.jsx',
  'src/components/pages/settings/SettingsPageView.jsx',
  'src/components/pages/settings/settingsDesktopModel.js',
  'src/components/pages/settings/settingsPageModel.js',
  'src/components/pages/settings/useSettingsPageChrome.jsx',
  'src/components/pages/settings/useSettingsPageController.js',
  'src/components/pages/settings/useSettingsRouteBridge.js',
  'src/components/mobile/MobileSettings.jsx',
  'src/components/mobile/settings/MobileSettingsContent.jsx',
  'src/components/mobile/settings/MobileSettingsPrimitives.jsx',
  'src/components/mobile/settings/MobileSettingsSkeleton.jsx',
  'src/components/mobile/settings/MobileSettingsView.jsx',
  'src/components/mobile/settings/mobileSettingsModel.js',
];

describe('Settings module compatibility exports', () => {
  it.each([
    ['SettingsPage', SettingsPage],
    ['SettingsPageView', SettingsPageView],
    ['SettingsDesktopWorkspace', SettingsDesktopWorkspace],
    ['SettingsSheet', SettingsSheet],
    ['SettingsDetailRail', SettingsDetailRail],
    ['SettingsHeaderAction', SettingsHeaderAction],
    ['SettingsModalStack', SettingsModalStack],
    ['useSettingsPageController', useSettingsPageController],
    ['useSettingsPageChrome', useSettingsPageChrome],
    ['useSettingsActionBridge', useSettingsActionBridge],
    ['useSettingsDisplayId', useSettingsDisplayId],
    ['useSettingsRouteContextPublisher', useSettingsRouteContextPublisher],
    ['MobileSettings', MobileSettings],
    ['MobileSettingsContent', MobileSettingsContent],
    ['MobileSettingsSkeleton', MobileSettingsSkeleton],
    ['SettingsSection', SettingsSection],
    ['SettingsActionRow', SettingsActionRow],
    ['SettingsInfoRow', SettingsInfoRow],
  ])('loads %s', (_name, moduleExport) => {
    expect(typeof moduleExport).toBe('function');
  });

  it.each(SETTINGS_PRODUCTION_MODULES)('%s stays a real boundary under 500 lines', (path) => {
    const source = fs.readFileSync(path, 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThan(500);
    expect(source).not.toMatch(/legacy page contracts still inspect|inert marker/i);
  });
});
