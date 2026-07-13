import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => fs.readFileSync(
  path.resolve(__dirname, relativePath),
  'utf8'
);

describe('identity and settings low-risk closures', () => {
  test('mobile professional profile exposes loading, available, and unavailable states', () => {
    const mobileSource = readSource('../mobile/MobileSettings.jsx');
    const settingsSource = readSource('../pages/SettingsPage.jsx');

    expect(mobileSource).toContain('hasDoctorProfile = false');
    expect(mobileSource).toContain('doctorProfileLoading = false');
    expect(mobileSource).toContain("'No professional profile is available'");
    expect(mobileSource).toContain('disabled={!doctorProfileLoading && !hasDoctorProfile}');
    expect(settingsSource).toContain('hasDoctorProfile={Boolean(doctorProfile)}');
    expect(settingsSource).toContain('if (!doctorProfile)');
    expect(settingsSource).toContain("toast.info('No professional profile is available for this account.')");
  });

  test('missing or unavailable profiles cannot loop back to Today', () => {
    const source = readSource('../common/ProtectedRoute.jsx');

    expect(source).toContain('const canOpenToday = Boolean(profile)');
    expect(source).toContain('&& !missingProfile');
  });

  test('Users context panel matches the org_admin route authority', () => {
    const source = readSource('./context-panel/contextPanelAccess.js');

    expect(source).toContain("['/users', management]");
  });
});
