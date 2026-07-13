// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
  enableVisualEdits: isDevServer, // Only enable during dev server
};

const htmlFallbackAcceptHeaders = ["text/html", "application/xhtml+xml"];
const devNoStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};
const staticAssetFallbackRewrite = {
  from: /^\/(?:(?:static\/)|asset-manifest\.json|manifest\.json|favicon\.ico|icon\.png|icons\/|og-image\.png|.*\.(?:css|gif|ico|jpeg|jpg|js|jsx|json|map|mjs|png|svg|txt|wasm|webp))$/,
  to: (context) => context.parsedUrl.pathname,
};

const javascriptAssetRequestPattern = /(?:^\/static\/js\/.*\.(?:js|jsx|mjs)$|\/[^/]+\.(?:chunk|hot-update)\.js$|\/(?:bundle|main|runtime~main)(?:\.[^/]+)?\.js$)/;
const jsonRuntimeAssetRequestPattern = /(?:^\/static\/js\/.*\.json$|\/[^/]+\.hot-update\.json$)/;

const createDevNoStoreMiddleware = () => (req, res, next) => {
  Object.entries(devNoStoreHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  next();
};

const createMissingRuntimeAssetMiddleware = () => (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const pathname = req.path || req.url || '';
  const isJavaScriptAsset = javascriptAssetRequestPattern.test(pathname);
  const isJsonRuntimeAsset = jsonRuntimeAssetRequestPattern.test(pathname);

  if (!['GET', 'HEAD'].includes(method) || (!isJavaScriptAsset && !isJsonRuntimeAsset)) {
    next();
    return;
  }

  res.status(404);
  res.type(isJsonRuntimeAsset ? 'application/json' : 'application/javascript');

  if (method === 'HEAD') {
    res.end();
    return;
  }

  if (isJsonRuntimeAsset) {
    res.send('{}');
    return;
  }

  res.send([
    '/* iVisit Console dev server: missing JavaScript asset.',
    '   The browser should treat this as a stale asset failure, not HTML. */',
  ].join('\n'));
};

const configureHtmlOnlyHistoryFallback = (devServerConfig) => {
  const existingFallback = devServerConfig.historyApiFallback;
  const fallbackConfig =
    existingFallback && existingFallback !== true ? existingFallback : {};
  const fallbackRewrites = Array.isArray(fallbackConfig.rewrites)
    ? fallbackConfig.rewrites
    : [];

  devServerConfig.historyApiFallback = {
    ...fallbackConfig,
    disableDotRule: false,
    htmlAcceptHeaders: htmlFallbackAcceptHeaders,
    rewrites: [staticAssetFallbackRewrite, ...fallbackRewrites],
  };

  return devServerConfig;
};

const configureDevNoStoreMiddleware = (devServerConfig) => {
  const existingSetupMiddlewares = devServerConfig.setupMiddlewares;

  devServerConfig.setupMiddlewares = (middlewares, devServer) => {
    let configuredMiddlewares = Array.isArray(middlewares) ? middlewares : [];

    if (existingSetupMiddlewares) {
      configuredMiddlewares = existingSetupMiddlewares(configuredMiddlewares, devServer);
    }

    configuredMiddlewares.unshift({
      name: 'ivisit-dev-no-store',
      middleware: createDevNoStoreMiddleware(),
    });

    return configuredMiddlewares;
  };

  return devServerConfig;
};

const configureMissingRuntimeAssetMiddleware = (devServerConfig) => {
  const existingSetupMiddlewares = devServerConfig.setupMiddlewares;

  devServerConfig.setupMiddlewares = (middlewares, devServer) => {
    let configuredMiddlewares = Array.isArray(middlewares) ? middlewares : [];

    if (existingSetupMiddlewares) {
      configuredMiddlewares = existingSetupMiddlewares(configuredMiddlewares, devServer);
    }

    const missingAssetMiddleware = {
      name: 'ivisit-missing-runtime-asset-404',
      middleware: createMissingRuntimeAssetMiddleware(),
    };
    const fallbackIndex = configuredMiddlewares.findIndex(
      (middleware) => middleware?.name === 'connect-history-api-fallback'
    );

    if (fallbackIndex >= 0) {
      configuredMiddlewares.splice(fallbackIndex, 0, missingAssetMiddleware);
    } else {
      configuredMiddlewares.push(missingAssetMiddleware);
    }

    return configuredMiddlewares;
  };

  return devServerConfig;
};

const configureRuntimeErrorOverlayFilter = (devServerConfig) => {
  const existingClient =
    devServerConfig.client && typeof devServerConfig.client === 'object'
      ? devServerConfig.client
      : {};
  const existingOverlay =
    existingClient.overlay && typeof existingClient.overlay === 'object'
      ? existingClient.overlay
      : {};

  devServerConfig.client = {
    ...existingClient,
    overlay: {
      errors: true,
      warnings: false,
      ...existingOverlay,
      runtimeErrors: function ivisitConsoleRuntimeErrorOverlayFilter(error) {
        if (typeof window === 'undefined') return true;

        function isStaleAssetRecoveryActive() {
          try {
            var url = new URL(window.location.href);
            if (url.searchParams.has('__asset_refresh')) return true;

            var key = 'ivisit-console:stale-asset-reload:' + window.location.pathname;
            var previousReloadAt = Number(window.sessionStorage.getItem(key) || 0);

            return Boolean(previousReloadAt && Date.now() - previousReloadAt < 60000);
          } catch (_error) {
            return false;
          }
        }

        function isStaleAssetStack(value) {
          var stack = String(value && value.stack || '');

          return (
            stack.indexOf('/static/js/') !== -1 ||
            /\.chunk\.js/i.test(stack) ||
            /\.hot-update\.js/i.test(stack) ||
            /webpackChunk/i.test(stack)
          );
        }

        function isStaleAssetRuntimeError(value) {
          var name = String(value && value.name || '');
          var message = String(value && value.message || value || '');

          function isHtmlAssetParseFailureMessage(message) {
            return (
              /Unexpected token ['"]?</i.test(message) ||
              /Unexpected token .*?</i.test(message) ||
              /expected expression, got ['"]?</i.test(message) ||
              /<!doctype html/i.test(message)
            );
          }

          return (
            name === 'ChunkLoadError' ||
            /ChunkLoadError/i.test(message) ||
            /Loading chunk .+ failed/i.test(message) ||
            /Loading hot update chunk .+ failed/i.test(message) ||
            /dynamically imported module/i.test(message) ||
            /hot-update/i.test(message) ||
            isHtmlAssetParseFailureMessage(message) ||
            ((isStaleAssetRecoveryActive() || /SyntaxError/i.test(name)) && isStaleAssetStack(value))
          );
        }

        function clearConsoleCaches() {
          try {
            if (!window.caches || !window.caches.keys) return Promise.resolve();

            return window.caches.keys()
              .then(function (keys) {
                return Promise.all(keys
                  .filter(function (key) {
                    return /ivisit|workbox|precache|webpack|runtime|static/i.test(String(key || ''));
                  })
                  .map(function (key) {
                    return window.caches.delete(key);
                  }));
              })
              .catch(function () {});
          } catch (_error) {
            return Promise.resolve();
          }
        }

        function recoverStaleAssetWithoutShellHook() {
          try {
            window.__ivisitConsoleStaleAssetSuppressUntil = Date.now() + 5000;

            var key = 'ivisit-console:stale-asset-reload:' + window.location.pathname;
            var previousReloadAt = Number(window.sessionStorage.getItem(key) || 0);
            var now = Date.now();

            if (previousReloadAt && now - previousReloadAt < 60000) return;

            window.sessionStorage.setItem(key, String(now));

            var url = new URL(window.location.href);
            url.searchParams.set('__asset_refresh', String(now));

            clearConsoleCaches().then(function () {
              window.location.replace(url.toString());
            });
          } catch (_error) {}
        }

        var shouldSuppress = window.__ivisitConsoleShouldSuppressRuntimeOverlay;
        var shouldSuppressStaleAsset =
          typeof shouldSuppress === 'function'
            ? shouldSuppress(error)
            : isStaleAssetRuntimeError(error);

        if (shouldSuppressStaleAsset) {
          var recover = window.__ivisitConsoleHandleStaleAssetFailure;
          if (typeof recover === 'function') {
            recover();
          } else {
            recoverStaleAssetWithoutShellHook();
          }
          return false;
        }

        return true;
      },
    },
  };

  return devServerConfig;
};

// Conditionally load visual edits modules only in dev mode
let setupDevServer;
let babelMetadataPlugin;

if (config.enableVisualEdits) {
  setupDevServer = require("./plugins/visual-edits/dev-server-setup");
  babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

const webpackConfig = {
  eslint: {
    enable: false,
  },
  jest: {
    configure: (jestConfig) => ({
      ...jestConfig,
      setupFiles: [
        ...(jestConfig.setupFiles || []),
        path.resolve(__dirname, 'src/test/route-contract/jestSetup.js'),
      ],
      moduleNameMapper: {
        ...jestConfig.moduleNameMapper,
        '^react-router-dom$': path.resolve(
          __dirname,
          'node_modules/react-router-dom/dist/index.js'
        ),
        '^react-router/dom$': path.resolve(
          __dirname,
          'node_modules/react-router/dist/development/dom-export.js'
        ),
      },
    }),
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Add ignored patterns to reduce watched directories
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      // Add Workbox plugin for PWA support (only in production)
      if (!isDevServer) {
        const { GenerateSW } = require('workbox-webpack-plugin');
        webpackConfig.plugins.push(
          new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
          })
        );
      }

      return webpackConfig;
    },
  },
};

// Only add babel metadata plugin during dev server
if (config.enableVisualEdits && babelMetadataPlugin) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

webpackConfig.devServer = (devServerConfig) => {
  devServerConfig = configureHtmlOnlyHistoryFallback(devServerConfig);

  // Apply visual edits dev server setup only if enabled
  if (config.enableVisualEdits && setupDevServer) {
    devServerConfig = setupDevServer(devServerConfig);
    devServerConfig = configureHtmlOnlyHistoryFallback(devServerConfig);
  }

  devServerConfig = configureDevNoStoreMiddleware(devServerConfig);
  devServerConfig = configureMissingRuntimeAssetMiddleware(devServerConfig);
  devServerConfig = configureRuntimeErrorOverlayFilter(devServerConfig);

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
