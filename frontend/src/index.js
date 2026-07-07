import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import "@/index.css";
import App from "@/App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const STALE_ASSET_RELOAD_KEY = 'ivisit-console:stale-asset-reload';
const STALE_ASSET_RELOAD_COOLDOWN_MS = 60000;
const STALE_ASSET_OVERLAY_SUPPRESS_MS = 5000;

const isHtmlAssetParseFailureMessage = (message) => (
  /Unexpected token ['"]?</i.test(message) ||
  /Unexpected token .*?</i.test(message) ||
  /expected expression, got ['"]?</i.test(message) ||
  /<!doctype html/i.test(message)
);

const isStaleAssetFailure = (errorLike) => {
  const name = String(errorLike?.name || '');
  const message = String(errorLike?.message || errorLike || '');

  return (
    name === 'ChunkLoadError' ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk .+ failed/i.test(message) ||
    /Loading hot update chunk .+ failed/i.test(message) ||
    /dynamically imported module/i.test(message) ||
    /hot-update/i.test(message) ||
    isHtmlAssetParseFailureMessage(message)
  );
};

const isStaleAssetStack = (errorLike) => {
  const stack = String(errorLike?.stack || '');

  return (
    stack.includes('/static/js/') ||
    /\.chunk\.js/i.test(stack) ||
    /\.hot-update\.js/i.test(stack) ||
    /webpackChunk/i.test(stack)
  );
};

const markStaleAssetOverlaySuppressed = () => {
  if (typeof window === 'undefined') return;
  window.__ivisitConsoleStaleAssetSuppressUntil = Date.now() + STALE_ASSET_OVERLAY_SUPPRESS_MS;
};

const isStaleAssetRecoveryActive = () => {
  if (typeof window === 'undefined') return false;

  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('__asset_refresh')) return true;

    const key = `${STALE_ASSET_RELOAD_KEY}:${window.location.pathname}`;
    const previousReloadAt = Number(window.sessionStorage.getItem(key) || 0);

    return Boolean(
      previousReloadAt && Date.now() - previousReloadAt < STALE_ASSET_RELOAD_COOLDOWN_MS,
    );
  } catch {
    return false;
  }
};

const shouldSuppressRuntimeOverlay = (errorLike) => {
  if (typeof window === 'undefined') return false;

  const suppressUntil = Number(window.__ivisitConsoleStaleAssetSuppressUntil || 0);
  const isMarkedStaleAsset = suppressUntil && Date.now() < suppressUntil;
  const isKnownStaleAsset = isStaleAssetFailure(errorLike);

  if (isKnownStaleAsset) return true;

  return (
    (isMarkedStaleAsset || isStaleAssetRecoveryActive()) &&
    isStaleAssetStack(errorLike)
  );
};

const isAppAssetUrl = (value) => {
  if (!value || typeof window === 'undefined') return false;

  try {
    const url = new URL(String(value), window.location.href);
    const { pathname } = url;

    return (
      url.origin === window.location.origin &&
      (
        pathname.includes('/static/js/') ||
        /\.chunk\.js$/.test(pathname) ||
        /\.hot-update\.js$/.test(pathname) ||
        /\.(?:jsx|mjs)$/.test(pathname) ||
        /\/(?:bundle|main|runtime~main)(?:\.[^/]+)?\.js$/.test(pathname)
      )
    );
  } catch {
    return false;
  }
};

const isConsoleRuntimeCacheName = (name) => (
  /ivisit|workbox|precache|webpack|runtime|static/i.test(String(name || ''))
);

const clearConsoleRuntimeCaches = async () => {
  if (typeof window === 'undefined' || !window.caches?.keys) return;

  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter(isConsoleRuntimeCacheName)
        .map((key) => window.caches.delete(key)),
    );
  } catch {
    // Cache cleanup is a recovery helper; never let it mask the refresh path.
  }
};

const isSupabaseAuthLockAbort = (errorLike) => {
  const name = String(errorLike?.name || '');
  const message = String(errorLike?.message || errorLike || '');

  return (
    /AbortError/i.test(`${name} ${message}`) &&
    /signal is aborted without reason/i.test(message)
  );
};

const getStaleAssetReloadUrl = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('__asset_refresh', String(Date.now()));
    return url.toString();
  } catch {
    return window.location.href;
  }
};

const showStaleAssetFallback = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    rootElement.innerHTML = [
      '<main role="alert" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0f;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:24px;">',
      '<section style="width:min(420px,100%);border-radius:24px;background:rgba(255,255,255,0.08);padding:24px;box-shadow:0 24px 80px rgba(0,0,0,0.28);">',
      '<p style="margin:0 0 8px;font-size:13px;color:#a7f3d0;">Refresh needed</p>',
      '<h1 style="margin:0 0 10px;font-size:24px;line-height:1.15;">The console updated.</h1>',
      '<p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.45;">Refresh to continue with the latest files.</p>',
      '<button id="ivisit-stale-asset-refresh" type="button" style="width:100%;border:0;border-radius:16px;background:#f8fafc;color:#0b0b0f;font-weight:700;font-size:15px;padding:13px 16px;cursor:pointer;">Refresh</button>',
      '</section>',
      '</main>',
    ].join('');

    document
      .getElementById('ivisit-stale-asset-refresh')
      ?.addEventListener('click', () => window.location.replace(getStaleAssetReloadUrl()));
  } catch {
    // Last-resort stale asset recovery should not create another runtime error.
  }
};

const reloadOnceForStaleAsset = () => {
  if (typeof window === 'undefined') return false;

  try {
    const key = `${STALE_ASSET_RELOAD_KEY}:${window.location.pathname}`;
    const previousReloadAt = Number(window.sessionStorage.getItem(key) || 0);
    const now = Date.now();

    if (previousReloadAt && now - previousReloadAt < STALE_ASSET_RELOAD_COOLDOWN_MS) {
      return false;
    }

    window.sessionStorage.setItem(key, String(now));
    window.setTimeout(() => {
      void clearConsoleRuntimeCaches().finally(() => {
        window.location.replace(getStaleAssetReloadUrl());
      });
    }, 0);
    return true;
  } catch {
    return false;
  }
};

const recoverFromStaleAssetFailure = () => {
  markStaleAssetOverlaySuppressed();

  if (!reloadOnceForStaleAsset()) {
    showStaleAssetFallback();
  }
};

const handleStaleAssetFailure = (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  recoverFromStaleAssetFailure();
};

const installWindowOnErrorStaleAssetHandler = () => {
  const previousWindowOnError = window.onerror;

  window.onerror = (message, source, lineno, colno, error) => {
    if (isSupabaseAuthLockAbort(error || message)) {
      return true;
    }

    if (isAppAssetUrl(source) || isStaleAssetFailure(error || message)) {
      recoverFromStaleAssetFailure();
      return true;
    }

    if (typeof previousWindowOnError === 'function') {
      return previousWindowOnError.call(window, message, source, lineno, colno, error);
    }

    return false;
  };
};

if (typeof window !== 'undefined') {
  window.__ivisitConsoleShouldSuppressRuntimeOverlay = shouldSuppressRuntimeOverlay;
  window.__ivisitConsoleHandleStaleAssetFailure = recoverFromStaleAssetFailure;
  installWindowOnErrorStaleAssetHandler();

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = String(reason?.message || reason || '');
    const stack = String(reason?.stack || '');
    const isSupabaseAuthRefreshFailure =
      /Failed to fetch/i.test(message) &&
      /SupabaseAuthClient\._getUser|GoTrueClient\._getUser/i.test(stack);

    if (isSupabaseAuthRefreshFailure) {
      event.preventDefault();
    }

    if (isSupabaseAuthLockAbort(reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (isStaleAssetFailure(reason)) {
      handleStaleAssetFailure(event);
    }
  }, true);

  window.addEventListener('error', (event) => {
    const target = event.target;
    const scriptSrc = target?.tagName === 'SCRIPT' ? String(target.src || '') : '';
    const filename = String(event.filename || '');
    const staleScriptLoad = isAppAssetUrl(scriptSrc || filename);

    if (isSupabaseAuthLockAbort(event.error || event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (staleScriptLoad || isStaleAssetFailure(event.error || event.message)) {
      handleStaleAssetFailure(event);
    }
  }, true);
}

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  const NOISY_CONSOLE_PATTERNS = [
    /Canvas2D:\s*Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true/i,
  ];

  const shouldSuppressConsoleNoise = (args) => {
    const text = args
      .map((arg) => (typeof arg === 'string' ? arg : ''))
      .join(' ');
    return NOISY_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
  };

  const originalWarn = console.warn.bind(console);
  console.warn = (...args) => {
    if (shouldSuppressConsoleNoise(args)) return;
    originalWarn(...args);
  };

  const originalError = console.error.bind(console);
  console.error = (...args) => {
    if (shouldSuppressConsoleNoise(args)) return;
    originalError(...args);
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));

if (process.env.NODE_ENV !== 'production') {
  serviceWorkerRegistration.unregister();
}

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
}
