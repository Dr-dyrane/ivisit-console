import fs from 'fs';
import path from 'path';

import { readAnalyticsModalImplementation } from '../../test/sourceEstates';
import { AnalyticsModal } from './AnalyticsModal';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const lineCount = (filePath) => read(filePath).split(/\r?\n/).length;

describe('AnalyticsModal module boundary', () => {
  const facade = 'src/components/modals/AnalyticsModal.jsx';
  const modulesDirectory = 'src/components/modals/analytics';
  const productionModules = fs.readdirSync(modulesDirectory)
    .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.includes('.test.'))
    .map((name) => path.join(modulesDirectory, name));

  it('keeps the named compatibility entry point and public props stable', () => {
    const source = read(facade);

    expect(AnalyticsModal).toEqual(expect.any(Function));
    expect(source).toContain("export const AnalyticsModal = ({ open, onClose, analytics, type = 'news' }) =>");
    expect(source).toContain('useAnalyticsModalController({ onClose, type })');
    expect(source).toContain('if (!analytics) return null;');
    expect(source).toContain('<AnalyticsModalView');
  });

  it('keeps the facade and every extracted production owner below the pack ceiling', () => {
    expect(lineCount(facade)).toBeLessThanOrEqual(60);
    expect(productionModules.length).toBeGreaterThanOrEqual(8);

    productionModules.forEach((filePath) => {
      expect({ filePath, lines: lineCount(filePath) }).toEqual({
        filePath,
        lines: expect.any(Number),
      });
      expect(lineCount(filePath)).toBeLessThanOrEqual(350);
    });
  });

  it('isolates route-owned data projection, phase state, and shell presentation', () => {
    const estate = readAnalyticsModalImplementation();
    const controller = read(path.join(modulesDirectory, 'useAnalyticsModalController.js'));
    const model = read(path.join(modulesDirectory, 'analyticsModalModel.js'));
    const view = read(path.join(modulesDirectory, 'AnalyticsModalView.jsx'));

    expect(controller).toContain('const [phase, setPhase] = useState(0);');
    expect(controller).toContain('setPhase(0);');
    expect(controller).toContain('onClose();');
    expect(model).toContain("{ id: 'lifecycle', label: 'Payment lifecycle' }");
    expect(model).toContain("['visible_page', 'loaded_preview'].includes(analytics.distributionScope)");
    expect(view).toContain("import { ModalShell } from '../../ui/ModalShell';");
    expect(view).toContain('title="Statistics"');
    expect(view).toContain('subtitle={displayType}');
    expect(view).toContain('footer={footer}');
    expect(estate).not.toContain('services/');
    expect(estate).not.toContain('supabase');
    expect(estate).not.toContain('useAuth');
  });
});
