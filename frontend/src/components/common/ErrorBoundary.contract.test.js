import fs from 'fs';

describe('ErrorBoundary chunk-load recovery contract', () => {
  const source = () => fs.readFileSync('src/components/common/ErrorBoundary.jsx', 'utf8');

  it('refreshes the current route once for stale lazy chunk failures', () => {
    const errorBoundary = source();

    expect(errorBoundary).toContain("const CHUNK_RELOAD_STORAGE_KEY = 'ivisit-console:chunk-load-reload';");
    expect(errorBoundary).toContain("name === 'ChunkLoadError'");
    expect(errorBoundary).toContain('/Loading chunk .+ failed/i.test(message)');
    expect(errorBoundary).toContain('/Loading hot update chunk .+ failed/i.test(message)');
    expect(errorBoundary).toContain('/dynamically imported module/i.test(message)');
    expect(errorBoundary).toContain('/hot-update/i.test(message)');
    expect(errorBoundary).toContain('const isHtmlAssetParseFailureMessage = (message) => (');
    expect(errorBoundary).toContain("/Unexpected token ['\"]?</i.test(message)");
    expect(errorBoundary).toContain("/Unexpected token .*?</i.test(message)");
    expect(errorBoundary).toContain("/expected expression, got ['\"]?</i.test(message)");
    expect(errorBoundary).toContain('/<!doctype html/i.test(message)');
    expect(errorBoundary).toContain('isHtmlAssetParseFailureMessage(message)');
    expect(errorBoundary).toContain('const clearChunkRuntimeCaches = async () => {');
    expect(errorBoundary).toContain('window.caches.keys()');
    expect(errorBoundary).toContain('window.caches.delete(key)');
    expect(errorBoundary).toContain('shouldAutoReloadChunk = () => {');
    expect(errorBoundary).toContain('window.sessionStorage.setItem(key, String(now));');
    expect(errorBoundary).toContain("url.searchParams.set('__asset_refresh', String(Date.now()))");
    expect(errorBoundary).toContain('clearChunkRuntimeCaches().finally');
    expect(errorBoundary).toContain('window.location.replace(getChunkReloadUrl())');
    expect(errorBoundary).toContain('const title = this.state.isChunkLoadError ?');
    expect(errorBoundary).toContain("'Refresh Needed'");
    expect(errorBoundary).toContain("'Refresh Page'");
    expect(errorBoundary).toContain('window.location.replace(getChunkReloadUrl());');
    expect(errorBoundary).toContain('handleGoHome = () => {');
  });
});
