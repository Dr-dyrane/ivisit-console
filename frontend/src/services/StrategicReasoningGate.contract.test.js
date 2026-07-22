import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('strategic reasoning gate', () => {
  it('keeps business completeness separate from bounded implementation proof', () => {
    const agents = read('../AGENTS.md');
    const qa = read('docs/testing/QA_PROTOCOL.md');

    expect(agents).toContain('## Strategic Outcome Gate');
    expect(agents).toContain('whether the bounded implementation works');
    expect(agents).toContain('whether the requested business outcome is complete');
    expect(agents).toContain('data proves only the warm path.');
    expect(qa).toContain('## Strategic Completeness Matrix');

    for (const state of [
      'Cold start',
      'Warm/mature',
      'Partial',
      'Degraded',
      'Retry/replay',
      'Cross-surface',
      'Negative gate',
      'Residue/rollback',
    ]) {
      expect(`${agents}\n${qa}`).toContain(state);
    }
  });
});
