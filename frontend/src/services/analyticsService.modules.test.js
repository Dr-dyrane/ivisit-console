import fs from 'fs';
import path from 'path';
import * as analyticsService from './analyticsService';
import { readAnalyticsServiceImplementation } from '../test/sourceEstates';

const productionFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(target);
    if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) return [];
    if (/\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(entry.name)) return [];
    return [target];
  });

describe('analytics service module contract', () => {
  it('preserves the complete public compatibility surface', () => {
    expect(Object.keys(analyticsService).sort()).toEqual([
      'DEFAULT_ANALYTICS_SUBSCRIPTION_STATS',
      'clearCache',
      'getAnalyticsData',
      'getAnalyticsIntakePage',
      'getAnalyticsSummary',
      'getPerformanceMetrics',
      'getTimeSeriesData',
    ]);
  });

  it('keeps every hand-maintained production owner below 500 lines', () => {
    const files = [
      'src/services/analyticsService.js',
      ...productionFiles('src/services/analytics'),
    ];

    files.forEach((file) => {
      const lineCount = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
      expect({ file, lineCount }).toEqual(expect.objectContaining({
        lineCount: expect.any(Number),
      }));
      expect(lineCount).toBeLessThan(500);
    });
  });

  it('keeps completeness and provenance evidence in the readable service estate', () => {
    const source = readAnalyticsServiceImplementation();

    expect(source).toContain("'provider_type'");
    expect(source).toContain("'provider_source'");
    expect(source).toContain("'place_id'");
    expect(source).toContain('countStable && rowsComplete && !hasDuplicateRows');
    expect(source).toContain("reason: 'capacity_sample_incomplete'");
    expect(source).toContain('requestTotalCount <= (requestsRes.data || []).length');
  });
});
