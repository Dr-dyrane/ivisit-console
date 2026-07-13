import { clearCache, getCachedOrFetch } from './cache';

describe('analytics cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('shares a fresh result by key', async () => {
    const fetchValue = jest.fn().mockResolvedValue({ requests: 3 });

    await expect(getCachedOrFetch('summary', fetchValue)).resolves.toEqual({ requests: 3 });
    await expect(getCachedOrFetch('summary', fetchValue)).resolves.toEqual({ requests: 3 });

    expect(fetchValue).toHaveBeenCalledTimes(1);
  });

  it('forces the next acquisition after clearCache', async () => {
    const fetchValue = jest.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await expect(getCachedOrFetch('summary', fetchValue)).resolves.toBe('first');
    clearCache();
    await expect(getCachedOrFetch('summary', fetchValue)).resolves.toBe('second');

    expect(fetchValue).toHaveBeenCalledTimes(2);
  });
});
