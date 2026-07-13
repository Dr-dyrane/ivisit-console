import fs from 'fs';
import path from 'path';
import { groupNotificationsByDay } from './notification-center/notificationPresentation';

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('NotificationCenter module ownership', () => {
  const facade = 'src/components/common/NotificationCenter.jsx';
  const modulesDirectory = 'src/components/common/notification-center';
  const productionModules = fs.readdirSync(modulesDirectory)
    .filter((name) => /\.(js|jsx)$/.test(name) && !name.includes('.test.'))
    .map((name) => path.join(modulesDirectory, name));

  it('keeps the shell entry point and extracted owners focused', () => {
    expect(lineCount(facade)).toBeLessThanOrEqual(40);
    expect(productionModules.length).toBeGreaterThanOrEqual(5);
    productionModules.forEach((filePath) => {
      expect(lineCount(filePath)).toBeLessThanOrEqual(300);
    });
  });

  it('separates shell composition, acquisition, and presentation', () => {
    const facadeSource = read(facade);
    const controllerSource = read(path.join(modulesDirectory, 'useNotificationCenterController.js'));
    const viewSource = read(path.join(modulesDirectory, 'NotificationCenterView.jsx'));
    const dataSource = read(path.join(modulesDirectory, 'notificationData.js'));

    expect(facadeSource).toContain('export const NotificationCenter = () =>');
    expect(facadeSource).toContain('<NotificationCenterView controller={controller} />');
    expect(facadeSource).not.toContain('services/');
    expect(controllerSource).toContain('subscribeToNotifications(user.id');
    expect(controllerSource).toContain('markNotificationAsRead(id)');
    expect(viewSource).toContain('<MobileNotificationSheet controller={controller} />');
    expect(viewSource).toContain('<DesktopNotificationDropdown controller={controller} />');
    expect(viewSource).not.toContain('services/');
    expect(dataSource).toContain('getNotifications(userId, 30, null, { quiet: true })');
  });

  it('groups and sorts notification rows by local calendar day', () => {
    const groups = groupNotificationsByDay([
      { id: 'older', created_at: '2026-07-12T08:00:00-07:00' },
      { id: 'newer', timestamp: '2026-07-13T11:00:00-07:00' },
      { id: 'newest', created_at: '2026-07-13T13:00:00-07:00' },
      { id: 'unknown', created_at: 'not-a-date' },
    ], new Date('2026-07-13T15:00:00-07:00'));

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', 'Earlier']);
    expect(groups[0].items.map((item) => item.id)).toEqual(['newest', 'newer']);
    expect(groups[2].items.map((item) => item.id)).toEqual(['unknown']);
  });
});
