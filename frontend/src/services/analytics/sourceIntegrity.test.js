import {
  getAnalyticsSourceErrorKind,
  getAnalyticsSourceIssue,
  resolveAnalyticsSource,
  toExactCount,
} from './sourceIntegrity';

describe('analytics source integrity', () => {
  it.each([
    [{ code: '42501' }, 'denied'],
    [{ status: 403 }, 'denied'],
    [{ message: 'row-level security policy denied access' }, 'denied'],
    [{ message: 'connection reset' }, 'failed'],
  ])('classifies source failures without exposing backend details', (error, expected) => {
    expect(getAnalyticsSourceErrorKind(error)).toBe(expected);
  });

  it('normalizes rejected reads into explicit source results', async () => {
    const error = new Error('network unavailable');

    await expect(resolveAnalyticsSource(Promise.reject(error))).resolves.toEqual({
      data: null,
      count: 0,
      error,
    });
    expect(getAnalyticsSourceIssue('hospitals', { error })).toEqual({
      source: 'hospitals',
      kind: 'failed',
    });
    expect(getAnalyticsSourceIssue('hospitals', { error: null })).toBeNull();
  });

  it('accepts only finite exact counts', () => {
    expect(toExactCount('12')).toBe(12);
    expect(toExactCount(0)).toBe(0);
    expect(toExactCount(null)).toBeNull();
    expect(toExactCount('not-a-count')).toBeNull();
  });
});
