import {
  VISIT_MUTATION_UNAVAILABLE_REASON,
  cancelVisit,
  completeVisit,
  createVisit,
  deleteVisit,
  markVisitAsNoShow,
  updateVisit,
} from './visitsService';

describe('visitsService mutation authority', () => {
  it.each([
    ['create', () => createVisit({})],
    ['update', () => updateVisit('visit-1', {})],
    ['delete', () => deleteVisit('visit-1')],
    ['complete', () => completeVisit('visit-1', 'summary', [])],
    ['cancel', () => cancelVisit('visit-1', 'reason')],
    ['no-show', () => markVisitAsNoShow('visit-1')],
  ])('fails closed for %s without an admitted workflow receiver', async (_name, command) => {
    await expect(command()).rejects.toThrow(VISIT_MUTATION_UNAVAILABLE_REASON);
  });
});
