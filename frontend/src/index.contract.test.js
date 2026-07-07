import fs from 'fs';

describe('app bootstrap diagnostics contract', () => {
  it('only suppresses known Supabase auth refresh and stale asset rejections', () => {
    const source = fs.readFileSync('src/index.js', 'utf8');

    expect(source).toContain("window.addEventListener('unhandledrejection'");
    expect(source).toContain('isSupabaseAuthRefreshFailure');
    expect(source).toContain('/Failed to fetch/i.test(message)');
    expect(source).toContain('/SupabaseAuthClient\\._getUser|GoTrueClient\\._getUser/i.test(stack)');
    expect(source).toContain('isSupabaseAuthLockAbort(reason)');
    expect(source).toContain('/AbortError/i.test(`${name} ${message}`)');
    expect(source).toContain('/signal is aborted without reason/i.test(message)');
    expect(source).toContain('isStaleAssetFailure(reason)');
    expect(source).toContain('const STALE_ASSET_OVERLAY_SUPPRESS_MS = 5000;');
    expect(source).toContain('const isStaleAssetStack = (errorLike) => {');
    expect(source).toContain('const markStaleAssetOverlaySuppressed = () => {');
    expect(source).toContain('window.__ivisitConsoleStaleAssetSuppressUntil');
    expect(source).toContain('const isStaleAssetRecoveryActive = () => {');
    expect(source).toContain("url.searchParams.has('__asset_refresh')");
    expect(source).toContain('Date.now() - previousReloadAt < STALE_ASSET_RELOAD_COOLDOWN_MS');
    expect(source).toContain('const shouldSuppressRuntimeOverlay = (errorLike) => {');
    expect(source).toContain('const isKnownStaleAsset = isStaleAssetFailure(errorLike);');
    expect(source).toContain('if (isKnownStaleAsset) return true;');
    expect(source).toContain('(isMarkedStaleAsset || isStaleAssetRecoveryActive())');
    expect(source).toContain('isStaleAssetStack(errorLike)');
    expect(source).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay = shouldSuppressRuntimeOverlay;');
    expect(source).toContain('const recoverFromStaleAssetFailure = () => {');
    expect(source).toContain('window.__ivisitConsoleHandleStaleAssetFailure = recoverFromStaleAssetFailure;');
    expect(source).toContain('const installWindowOnErrorStaleAssetHandler = () => {');
    expect(source).toContain('const previousWindowOnError = window.onerror;');
    expect(source).toContain('window.onerror = (message, source, lineno, colno, error) => {');
    expect(source).toContain('isAppAssetUrl(source) || isStaleAssetFailure(error || message)');
    expect(source).toContain('recoverFromStaleAssetFailure();');
    expect(source).toContain("previousWindowOnError.call(window, message, source, lineno, colno, error)");
    expect(source).toContain('installWindowOnErrorStaleAssetHandler();');
    expect(source).toContain('const clearConsoleRuntimeCaches = async () => {');
    expect(source).toContain('window.caches.keys()');
    expect(source).toContain('window.caches.delete(key)');
    expect(source).toContain('const isHtmlAssetParseFailureMessage = (message) => (');
    expect(source).toContain('/Loading hot update chunk .+ failed/i.test(message)');
    expect(source).toContain('/hot-update/i.test(message)');
    expect(source).toContain("/Unexpected token ['\"]?</i.test(message)");
    expect(source).toContain("/Unexpected token .*?</i.test(message)");
    expect(source).toContain('/<!doctype html/i.test(message)');
    expect(source).toContain('isHtmlAssetParseFailureMessage(message)');
    expect(source).toContain("url.searchParams.set('__asset_refresh', String(Date.now()))");
    expect(source).toContain('clearConsoleRuntimeCaches().finally');
    expect(source).toContain('window.location.replace(getStaleAssetReloadUrl())');
    expect(source).toContain('showStaleAssetFallback();');
    expect(source).toContain('handleStaleAssetFailure(event)');
    expect(source).toContain("window.addEventListener('error'");
    expect(source).toContain('const isAppAssetUrl = (value) => {');
    expect(source).toContain("pathname.includes('/static/js/')");
    expect(source).toContain('/\\.chunk\\.js$/.test(pathname)');
    expect(source).toContain('/\\.hot-update\\.js$/.test(pathname)');
    expect(source).toContain('/\\.(?:jsx|mjs)$/.test(pathname)');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain("}, true);");
  });

  it('unregisters service workers in local development to avoid stale chunk cache', () => {
    const source = fs.readFileSync('src/index.js', 'utf8');
    const serviceWorkerSource = fs.readFileSync('src/serviceWorkerRegistration.js', 'utf8');
    const htmlShellSource = fs.readFileSync('public/index.html', 'utf8');

    expect(source).toContain("if (process.env.NODE_ENV !== 'production') {");
    expect(source).toContain('serviceWorkerRegistration.unregister();');
    expect(source).toContain("if (process.env.NODE_ENV === 'production') {");
    expect(source).toContain('serviceWorkerRegistration.register();');
    expect(source).not.toContain('\nserviceWorkerRegistration.register();\n');
    expect(serviceWorkerSource).toContain('navigator.serviceWorker.getRegistrations');
    expect(serviceWorkerSource).toContain('registrations.map((registration) => registration.unregister())');
    expect(htmlShellSource).toContain('ivisit-console:localhost-service-worker-cleanup');
    expect(htmlShellSource).toContain('window.location.hostname === "localhost"');
    expect(htmlShellSource).toContain('navigator.serviceWorker.getRegistrations()');
    expect(htmlShellSource).toContain('function clearConsoleCaches()');
    expect(htmlShellSource).toContain('window.caches.keys()');
    expect(htmlShellSource).toContain('window.caches.delete(key)');
  });

  it('installs an early HTML stale-asset guard before the framework overlay can render', () => {
    const htmlShellSource = fs.readFileSync('public/index.html', 'utf8');

    expect(htmlShellSource).toContain('var staleAssetReloadKey = "ivisit-console:stale-asset-reload";');
    expect(htmlShellSource).toContain('var staleAssetOverlaySuppressMs = 5000;');
    expect(htmlShellSource).toContain('function isStaleAssetMessage(value)');
    expect(htmlShellSource).toContain('function isStaleAssetStack(value)');
    expect(htmlShellSource).toContain('function markStaleAssetOverlaySuppressed()');
    expect(htmlShellSource).toContain('window.__ivisitConsoleStaleAssetSuppressUntil');
    expect(htmlShellSource).toContain('function isStaleAssetRecoveryActive()');
    expect(htmlShellSource).toContain('url.searchParams.has("__asset_refresh")');
    expect(htmlShellSource).toContain('Date.now() - previousReloadAt < staleAssetCooldownMs');
    expect(htmlShellSource).toContain('function shouldSuppressRuntimeOverlay(value)');
    expect(htmlShellSource).toContain('var isKnownStaleAsset = isStaleAssetMessage(value);');
    expect(htmlShellSource).toContain('if (isKnownStaleAsset) return true;');
    expect(htmlShellSource).toContain('(isMarkedStaleAsset || isStaleAssetRecoveryActive())');
    expect(htmlShellSource).toContain('isStaleAssetStack(value)');
    expect(htmlShellSource).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay = shouldSuppressRuntimeOverlay;');
    expect(htmlShellSource).toContain('function handleStaleAssetFailure()');
    expect(htmlShellSource).toContain('window.__ivisitConsoleHandleStaleAssetFailure = handleStaleAssetFailure;');
    expect(htmlShellSource).toContain('var previousWindowOnError = window.onerror;');
    expect(htmlShellSource).toContain('window.onerror = function (message, source, lineno, colno, error)');
    expect(htmlShellSource).toContain('isAppAssetUrl(source) || isStaleAssetMessage(error || message)');
    expect(htmlShellSource).toContain('return previousWindowOnError.apply(window, arguments);');
    expect(htmlShellSource).toContain('function isAppAssetUrl(value)');
    expect(htmlShellSource).toContain('/\\.hot-update\\.js$/.test(pathname)');
    expect(htmlShellSource).toContain('/\\.(?:jsx|mjs)$/.test(pathname)');
    expect(htmlShellSource).toContain('function isHtmlAssetParseFailureMessage(message)');
    expect(htmlShellSource).toContain('function isSupabaseAuthLockAbort(value)');
    expect(htmlShellSource).toContain('/signal is aborted without reason/i.test(message)');
    expect(htmlShellSource).toContain("/Unexpected token ['\"]?</i.test(message)");
    expect(htmlShellSource).toContain("/Unexpected token .*?</i.test(message)");
    expect(htmlShellSource).toContain('/<!doctype html/i.test(message)');
    expect(htmlShellSource).toContain('isHtmlAssetParseFailureMessage(message)');
    expect(htmlShellSource).toContain('url.searchParams.set("__asset_refresh", String(Date.now()))');
    expect(htmlShellSource).toContain('clearConsoleCaches().then(function ()');
    expect(htmlShellSource).toContain('function showStaleAssetFallback()');
    expect(htmlShellSource).toContain('id="ivisit-stale-asset-refresh"');
    expect(htmlShellSource).toContain('window.location.replace(getStaleAssetReloadUrl())');
    expect(htmlShellSource).toContain('var isAppScript = isAppAssetUrl(scriptSrc || filename);');
    expect(htmlShellSource).toContain('window.addEventListener("error", function (event)');
    expect(htmlShellSource).toContain('window.addEventListener("unhandledrejection", function (event)');
    expect(htmlShellSource).toContain('event.stopImmediatePropagation');
    expect(htmlShellSource).toContain('}, true);');
  });

  it('keeps third-party analytics scripts out of localhost proof runs', () => {
    const htmlShellSource = fs.readFileSync('public/index.html', 'utf8');

    expect(htmlShellSource).toContain('window.location.hostname === "localhost"');
    expect(htmlShellSource).toContain('window.location.hostname === "127.0.0.1"');
    expect(htmlShellSource).toContain('window.location.hostname === "::1"');
    expect(htmlShellSource).toContain('if (isLocalhost) return;');
    expect(htmlShellSource).toContain('posthog.init(');
    expect(htmlShellSource.indexOf('if (isLocalhost) return;')).toBeLessThan(
      htmlShellSource.indexOf('posthog.init(')
    );
  });

  it('keeps the dev server from serving the app shell to missing runtime assets', () => {
    const cracoConfig = fs.readFileSync('craco.config.js', 'utf8');

    expect(cracoConfig).toContain('const htmlFallbackAcceptHeaders = ["text/html", "application/xhtml+xml"];');
    expect(cracoConfig).toContain("const devNoStoreHeaders = {");
    expect(cracoConfig).toContain("'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'");
    expect(cracoConfig).toContain("Pragma: 'no-cache'");
    expect(cracoConfig).toContain("Expires: '0'");
    expect(cracoConfig).toContain('const createDevNoStoreMiddleware = () => (req, res, next) => {');
    expect(cracoConfig).toContain("res.setHeader(header, value);");
    expect(cracoConfig).toContain('const configureDevNoStoreMiddleware = (devServerConfig) => {');
    expect(cracoConfig).toContain("name: 'ivisit-dev-no-store'");
    expect(cracoConfig).toContain('const staticAssetFallbackRewrite = {');
    expect(cracoConfig).toContain('.*\\.(?:css|gif|ico|jpeg|jpg|js|jsx|json|map|mjs|png|svg|txt|wasm|webp)');
    expect(cracoConfig).toContain('disableDotRule: false');
    expect(cracoConfig).toContain('configureHtmlOnlyHistoryFallback(devServerConfig)');
    expect(cracoConfig).toContain('const createMissingRuntimeAssetMiddleware = () => (req, res, next) => {');
    expect(cracoConfig).toContain("name: 'ivisit-missing-runtime-asset-404'");
    expect(cracoConfig).toContain('const javascriptAssetRequestPattern = /(?:^\\/static\\/js\\/.*\\.(?:js|jsx|mjs)$|\\/[^/]+\\.(?:chunk|hot-update)\\.js$|\\/(?:bundle|main|runtime~main)(?:\\.[^/]+)?\\.js$)/;');
    expect(cracoConfig).toContain('const jsonRuntimeAssetRequestPattern = /(?:^\\/static\\/js\\/.*\\.json$|\\/[^/]+\\.hot-update\\.json$)/;');
    expect(cracoConfig).toContain("middleware?.name === 'connect-history-api-fallback'");
    expect(cracoConfig).toContain("res.type(isJsonRuntimeAsset ? 'application/json' : 'application/javascript');");
    expect(cracoConfig).toContain("res.send('{}');");
    expect(cracoConfig).toContain('devServerConfig.historyApiFallback = {');
    expect(cracoConfig).toContain('htmlAcceptHeaders: htmlFallbackAcceptHeaders');
    expect(cracoConfig).toContain('rewrites: [staticAssetFallbackRewrite, ...fallbackRewrites]');
    expect(cracoConfig).toContain('configureDevNoStoreMiddleware(devServerConfig)');
    expect(cracoConfig).toContain('configureMissingRuntimeAssetMiddleware(devServerConfig)');
    expect(cracoConfig).toContain('const configureRuntimeErrorOverlayFilter = (devServerConfig) => {');
    expect(cracoConfig).toContain('runtimeErrors: function ivisitConsoleRuntimeErrorOverlayFilter(error)');
    expect(cracoConfig).toContain('function isStaleAssetRuntimeError(value)');
    expect(cracoConfig).toContain('function recoverStaleAssetWithoutShellHook()');
    expect(cracoConfig).toContain("var key = 'ivisit-console:stale-asset-reload:' + window.location.pathname;");
    expect(cracoConfig).toContain("url.searchParams.set('__asset_refresh', String(now));");
    expect(cracoConfig).toContain("((isStaleAssetRecoveryActive() || /SyntaxError/i.test(name)) && isStaleAssetStack(value))");
    expect(cracoConfig).toContain('window.__ivisitConsoleShouldSuppressRuntimeOverlay');
    expect(cracoConfig).toContain('var recover = window.__ivisitConsoleHandleStaleAssetFailure;');
    expect(cracoConfig).toContain("if (typeof recover === 'function') {");
    expect(cracoConfig).toContain('recover();');
    expect(cracoConfig).toContain('recoverStaleAssetWithoutShellHook();');
    expect(cracoConfig).toContain('return false;');
    expect(cracoConfig).toContain('configureRuntimeErrorOverlayFilter(devServerConfig)');
  });
});
