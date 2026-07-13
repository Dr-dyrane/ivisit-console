import { CACHE_DURATION } from './constants';

const cache = new Map();

export const getCachedOrFetch = async (
  key,
  fetchFunction,
  duration = CACHE_DURATION,
) => {
  const cached = cache.get(key);

  if (cached && (Date.now() - cached.timestamp) < duration) {
    return cached.data;
  }

  const data = await fetchFunction();
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });

  return data;
};

export const clearCache = () => {
  cache.clear();
};
