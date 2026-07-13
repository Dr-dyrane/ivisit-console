import fs from 'fs';
import path from 'path';

const EXPECTED_FACADE_EXPORTS = [
  'createProfile',
  'discardUnpersistedProfileAvatar',
  'getEmergencyPatientOptions',
  'getProfile',
  'getProfileByEmail',
  'getProfiles',
  'getProfilesByRole',
  'getProvidersByType',
  'getUsersPage',
  'getUserStatistics',
  'searchUsers',
  'subscribeToProfile',
  'updateProfile',
  'updateProfileAvatar',
  'uploadProfileAvatar',
  'verifyProfileBVN',
].sort();

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (source) => source.split(/\r?\n/).length;

function readFacadeExports(source) {
  const functionExports = [...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(
    (match) => match[1]
  );
  const reExports = [...source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*['"]/g)].flatMap(
    (match) =>
      match[1]
        .split(',')
        .map((name) => name.trim().split(/\s+as\s+/).pop())
        .filter(Boolean)
  );

  return [...functionExports, ...reExports].sort();
}

describe('profilesService module boundary', () => {
  const facadePath = 'src/services/profilesService.js';
  const modulesDirectory = 'src/services/profiles';

  it('preserves the complete compatibility export surface', () => {
    const facade = read(facadePath);

    expect(readFacadeExports(facade)).toEqual(EXPECTED_FACADE_EXPORTS);
    expect(facade).not.toMatch(/export\s+default/);
  });

  it('keeps the facade thin and every cohesive implementation module below the service target', () => {
    const modulePaths = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => path.join(modulesDirectory, name));

    expect(lineCount(read(facadePath))).toBeLessThanOrEqual(100);
    expect(modulePaths.length).toBeGreaterThanOrEqual(7);
    modulePaths.forEach((modulePath) => {
      expect(lineCount(read(modulePath))).toBeLessThanOrEqual(300);
    });
  });

  it('keeps service modules independent from contexts, hooks, pages, and modals', () => {
    const implementation = fs
      .readdirSync(modulesDirectory)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .map((name) => read(path.join(modulesDirectory, name)))
      .join('\n');

    expect(implementation).not.toMatch(/from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/);
  });
});
