import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

export const ROUTE_CONTRACT_VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1194 },
  tabletLandscape: { width: 1194, height: 834 },
  desktop: { width: 1280, height: 720 },
};

const asElement = (ui) => (React.isValidElement(ui) ? ui : React.createElement(ui));

const withProviders = (children, providers) => providers.reduceRight((tree, entry) => {
  const Provider = typeof entry === 'function' ? entry : entry.Provider;
  const props = typeof entry === 'function' ? {} : entry.props || {};
  return <Provider {...props}>{tree}</Provider>;
}, children);

const LocationObserver = ({ onLocation, children }) => {
  const location = useLocation();

  useEffect(() => {
    onLocation?.(location);
  }, [location, onLocation]);

  return children;
};

const installViewport = ({ width, height }) => {
  const previous = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    matchMedia: window.matchMedia,
  };

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.matchMedia = (query) => {
    const minWidth = query.match(/min-width\s*:\s*(\d+)px/i)?.[1];
    const maxWidth = query.match(/max-width\s*:\s*(\d+)px/i)?.[1];
    const matches = (minWidth === undefined || width >= Number(minWidth))
      && (maxWidth === undefined || width <= Number(maxWidth));

    return ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  };
  window.dispatchEvent(new Event('resize'));

  return () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: previous.innerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: previous.innerHeight,
    });
    window.matchMedia = previous.matchMedia;
    window.dispatchEvent(new Event('resize'));
  };
};

export const createActionReceiverSpy = (implementation) => {
  const calls = [];
  const handler = (...args) => {
    calls.push(args);
    return implementation?.(...args);
  };

  return {
    handler,
    calls,
    get callCount() {
      return calls.length;
    },
    get lastCall() {
      return calls.at(-1) || null;
    },
    reset: () => calls.splice(0, calls.length),
  };
};

const collectText = (container, selectors) => Array.from(container.querySelectorAll(selectors))
  .map((element) => element.textContent.trim())
  .filter(Boolean);

export const captureRouteSurface = (container) => ({
  loading: collectText(
    container,
    '[aria-busy="true"], [data-route-state="loading"], [data-loading="true"]',
  ),
  errors: collectText(container, '[role="alert"], [data-route-state="error"]'),
  empty: collectText(container, '[data-empty-state="true"], [data-route-state="empty"]'),
  text: container.textContent.replace(/\s+/g, ' ').trim(),
});

export const renderRouteContract = async (ui, options = {}) => {
  const {
    initialEntry = '/',
    providers = [],
    routePath = '*',
    viewport = 'desktop',
  } = options;
  const dimensions = typeof viewport === 'string'
    ? ROUTE_CONTRACT_VIEWPORTS[viewport]
    : viewport;
  const restoreViewport = installViewport(dimensions || ROUTE_CONTRACT_VIEWPORTS.desktop);
  const container = document.createElement('div');
  const locations = [];
  const root = createRoot(container);
  document.body.appendChild(container);

  const routedTree = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationObserver onLocation={(location) => locations.push(location)}>
        <Routes>
          <Route path={routePath} element={asElement(ui)} />
        </Routes>
      </LocationObserver>
    </MemoryRouter>
  );

  await act(async () => {
    root.render(withProviders(routedTree, providers));
  });

  return {
    container,
    locations,
    root,
    capture: () => captureRouteSurface(container),
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
      restoreViewport();
    },
  };
};
