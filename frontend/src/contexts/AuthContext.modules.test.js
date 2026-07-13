import fs from 'fs';
import path from 'path';

const lineCount = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).length;

describe('AUTH-01 module boundaries', () => {
  it('keeps the public context facade small and every auth owner below 500 lines', () => {
    expect(lineCount('src/contexts/AuthContext.jsx')).toBeLessThanOrEqual(250);

    const modules = fs.readdirSync('src/contexts/auth', { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:js|jsx)$/.test(entry.name))
      .map((entry) => path.join('src/contexts/auth', entry.name));

    expect(modules.length).toBeGreaterThanOrEqual(7);
    modules.forEach((file) => expect({ file, lines: lineCount(file) }).toEqual({
      file,
      lines: expect.any(Number),
    }));
    modules.forEach((file) => expect(lineCount(file)).toBeLessThan(500));
  });
});
