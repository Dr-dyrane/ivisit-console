import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

const CHUNK_RELOAD_STORAGE_KEY = 'ivisit-console:chunk-load-reload';
const CHUNK_RELOAD_COOLDOWN_MS = 60000;
const CHUNK_RELOAD_MARKER_TTL_MS = 30000;

const isHtmlAssetParseFailureMessage = (message) => (
  /Unexpected token ['"]?</i.test(message) ||
  /Unexpected token .*?</i.test(message) ||
  /expected expression, got ['"]?</i.test(message) ||
  /<!doctype html/i.test(message)
);

const isChunkLoadError = (error) => {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');

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

const isConsoleRuntimeCacheName = (name) => (
  /ivisit|workbox|precache|webpack|runtime|static/i.test(String(name || ''))
);

const clearChunkRuntimeCaches = async () => {
  if (typeof window === 'undefined' || !window.caches?.keys) return;

  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter(isConsoleRuntimeCacheName)
        .map((key) => window.caches.delete(key)),
    );
  } catch {
    // Stale chunk recovery should still offer refresh if cache cleanup fails.
  }
};

const getChunkReloadKey = () => {
  if (typeof window === 'undefined') return CHUNK_RELOAD_STORAGE_KEY;
  return `${CHUNK_RELOAD_STORAGE_KEY}:${window.location.pathname}`;
};

const getChunkReloadUrl = () => {
  if (typeof window === 'undefined') return '/';

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('__asset_refresh', String(Date.now()));
    return url.toString();
  } catch {
    return window.location.href;
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      copied: false,
      isChunkLoadError: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidMount() {
    if (typeof window === 'undefined') return;

    this.clearChunkReloadTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(getChunkReloadKey());
      } catch {
        // Ignore private-mode or storage-denied browsers.
      }
    }, CHUNK_RELOAD_MARKER_TTL_MS);
  }

  componentWillUnmount() {
    if (this.clearChunkReloadTimer) {
      clearTimeout(this.clearChunkReloadTimer);
    }
  }

  componentDidCatch(error, errorInfo) {
    const chunkLoadError = isChunkLoadError(error);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
      isChunkLoadError: chunkLoadError,
    }));

    if (chunkLoadError && this.shouldAutoReloadChunk()) {
      window.setTimeout(() => {
        void clearChunkRuntimeCaches().finally(() => {
          window.location.replace(getChunkReloadUrl());
        });
      }, 0);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(error, errorInfo);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  shouldAutoReloadChunk = () => {
    if (typeof window === 'undefined') return false;

    try {
      const key = getChunkReloadKey();
      const previousReloadAt = Number(window.sessionStorage.getItem(key) || 0);
      const now = Date.now();

      if (previousReloadAt && now - previousReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
        return false;
      }

      window.sessionStorage.setItem(key, String(now));
      return true;
    } catch {
      return false;
    }
  };

  sendErrorToMonitoring = (error, errorInfo) => {
    try {
      const errorData = {
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      console.error('Production error:', errorData);
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
    });
  };

  handleReload = () => {
    void clearChunkRuntimeCaches().finally(() => {
      window.location.replace(getChunkReloadUrl());
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = async () => {
    const errorData = {
      message: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorCount: this.state.errorCount,
    };

    const errorText = `
Error Details:
==============
Message: ${errorData.message}

Component Stack:
${errorData.componentStack || 'N/A'}

Stack Trace:
${errorData.stack || 'N/A'}

Metadata:
- Timestamp: ${errorData.timestamp}
- URL: ${errorData.url}
- Error Count: ${errorData.errorCount}
- User Agent: ${errorData.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  render() {
    if (this.state.hasError) {
      const title = this.state.isChunkLoadError ? 'Refresh Needed' : 'Something Went Wrong';
      const description = this.state.isChunkLoadError
        ? 'The app updated while this page was loading. Refresh this page to continue.'
        : 'We apologize for the inconvenience. An unexpected error has occurred.';
      const PrimaryIcon = this.state.isChunkLoadError ? RefreshCw : Home;
      const primaryLabel = this.state.isChunkLoadError ? 'Refresh Page' : 'Go Home';
      const primaryAction = this.state.isChunkLoadError ? this.handleReload : this.handleGoHome;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-2 md:p-4 overflow-auto">
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 rounded-pill blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-warning/5 rounded-pill blur-[100px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="rounded-card bg-background/50 backdrop-blur-xs shadow-2xl p-2 md:p-8 overflow-auto max-h-[85vh] relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50" />

              {/* Copy Button - Top Right */}
              {process.env.NODE_ENV !== 'production' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={this.handleCopyError}
                  className="absolute top-4 right-4 w-8 h-8 rounded-icon bg-muted/50 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center group"
                  title="Copy error details"
                >
                  <motion.div
                    animate={{
                      rotate: this.state.copied ? 360 : 0,
                      scale: this.state.copied ? [1, 0.8, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {this.state.copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                  </motion.div>
                </motion.button>
              )}

              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 rounded-inner bg-destructive/10 flex items-center justify-center shadow-inner"
                >
                  <AlertTriangle className="w-12 h-12 text-destructive" />
                </motion.div>

                <div>
                  <h1 className="text-4xl font-bold tracking-tighter text-foreground mb-3">
                    {title}
                  </h1>
                  <p className="text-lg text-muted-foreground font-normal">
                    {description}
                  </p>
                </div>

                {process.env.NODE_ENV !== 'production' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full bg-muted/30 rounded-inner p-4 max-h-64 overflow-y-auto"
                  >
                    <div className="text-left space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                          Error Message
                        </p>
                        <p className="text-sm text-destructive font-mono break-words">
                          {this.state.error?.toString()}
                        </p>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                            Component Stack
                          </p>
                          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-pill bg-muted/50 text-xs font-semibold">
                    {this.state.errorCount}
                  </span>
                  <span>Error{this.state.errorCount > 1 ? 's' : ''} occurred</span>
                </div>

                <div className="flex gap-3 w-full pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={this.handleReset}
                    className="flex-1 h-12 rounded-button bg-muted/50 hover:bg-muted text-foreground font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={primaryAction}
                    className="flex-1 h-12 rounded-button bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow transition-all flex items-center justify-center gap-2"
                  >
                    <PrimaryIcon className="w-4 h-4" />
                    {primaryLabel}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
