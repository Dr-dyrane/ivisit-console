import fs from 'fs';
import path from 'path';
import { readIslandNavigationImplementation } from '../../test/sourceEstates';

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Island navigation module ownership', () => {
  const productionFiles = [
    'src/components/common/IslandNavigation.jsx',
    'src/components/common/island-navigation/IslandNavigationFooter.jsx',
    'src/components/common/island-navigation/IslandNavigationGroup.jsx',
    'src/components/common/island-navigation/IslandNavigationHeader.jsx',
    'src/components/common/island-navigation/IslandNavigationItem.jsx',
    'src/components/common/island-navigation/IslandNavigationView.jsx',
    'src/components/common/island-navigation/SidebarLayoutDialog.jsx',
    'src/components/common/island-navigation/islandNavigationModel.js',
    'src/components/common/island-navigation/useIslandNavigationController.js',
  ];

  it('keeps every production owner below the modularization threshold', () => {
    productionFiles.forEach((file) => {
      expect({ file, lines: read(file).split(/\r?\n/).length }).toEqual({
        file,
        lines: expect.any(Number),
      });
      expect(read(file).split(/\r?\n/).length).toBeLessThan(500);
    });
    expect(read(productionFiles[0]).split(/\r?\n/).length).toBeLessThan(50);
  });

  it('preserves the public shell export behind a controller and view facade', () => {
    const facade = read(productionFiles[0]);
    const estate = readIslandNavigationImplementation();

    expect(facade).toContain('export const IslandNavigation = () =>');
    expect(facade).toContain('useIslandNavigationController()');
    expect(facade).toContain('<IslandNavigationView {...controller} />');
    expect(estate).toContain('getAccessibleNav(profile, can)');
    expect(estate).toContain('data-desktop-nav-shell="true"');
    expect(estate).toContain("aria-current={isActive ? 'page' : undefined}");
    expect(estate).toContain("data-state={isActive ? 'active' : 'idle'}");
  });

  it('keeps route and RBAC orchestration out of leaf renderers', () => {
    const controller = read('src/components/common/island-navigation/useIslandNavigationController.js');
    const renderers = productionFiles
      .filter((file) => file.endsWith('.jsx') && !file.endsWith('IslandNavigation.jsx'))
      .map(read)
      .join('\n');

    expect(controller).toContain("import { getAccessibleNav } from '../../../config/navigation';");
    expect(controller).toContain("import { useAuth } from '../../../contexts/AuthContext';");
    expect(controller).toContain('getActiveNavigationGroup(accessibleNav, location.pathname)');
    expect(renderers).not.toContain('useAuth(');
    expect(renderers).not.toContain('useLocation(');
    expect(renderers).not.toContain('getAccessibleNav(');
    expect(readIslandNavigationImplementation()).not.toContain('supabase');
  });
});
