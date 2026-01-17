import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(error, errorInfo);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

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
    });
  };

  handleReload = () => {
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
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-warning/5 rounded-full blur-[100px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="squircle-2xl glass-strong shadow-2xl p-8 border-0 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50" />
              
              {/* Copy Button - Top Right */}
              {process.env.NODE_ENV !== 'production' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={this.handleCopyError}
                  className="absolute top-4 right-4 w-8 h-8 squircle-md bg-muted/50 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center group"
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
                  className="w-24 h-24 squircle-xl bg-destructive/10 flex items-center justify-center shadow-inner"
                >
                  <AlertTriangle className="w-12 h-12 text-destructive" />
                </motion.div>

                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-foreground mb-3">
                    Something Went Wrong
                  </h1>
                  <p className="text-lg text-muted-foreground font-medium">
                    We apologize for the inconvenience. An unexpected error has occurred.
                  </p>
                </div>

                {process.env.NODE_ENV !== 'production' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full bg-muted/30 squircle-lg p-4 border border-destructive/30 max-h-64 overflow-y-auto"
                  >
                    <div className="text-left space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                          Error Message
                        </p>
                        <p className="text-sm text-destructive font-mono break-words">
                          {this.state.error?.toString()}
                        </p>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
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
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 text-xs font-bold">
                    {this.state.errorCount}
                  </span>
                  <span>Error{this.state.errorCount > 1 ? 's' : ''} occurred</span>
                </div>

                <div className="flex gap-3 w-full pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={this.handleReset}
                    className="flex-1 h-12 squircle-lg bg-muted/50 hover:bg-muted text-foreground font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={this.handleReload}
                    className="flex-1 h-12 squircle-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow transition-all flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
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
