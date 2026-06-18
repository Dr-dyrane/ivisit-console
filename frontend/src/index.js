import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import "@/index.css";
import App from "@/App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

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
serviceWorkerRegistration.register();
