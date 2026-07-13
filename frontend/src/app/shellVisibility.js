import { APP_ROUTE_METADATA } from './appRouteMetadata';

export const PUBLIC_SHELL_ROUTES = Object.freeze(
  APP_ROUTE_METADATA
    .filter((route) => route.public && route.path !== '*')
    .map((route) => route.path),
);

export const AUTHENTICATED_SHELL_ROUTES = Object.freeze(
  APP_ROUTE_METADATA
    .filter((route) => !route.public)
    .map((route) => route.path),
);

export const normalizeShellPath = (pathname) => {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
};

export const shouldHideShellChrome = (pathname) => {
  const currentPath = normalizeShellPath(pathname);
  return PUBLIC_SHELL_ROUTES.includes(currentPath)
    || !AUTHENTICATED_SHELL_ROUTES.includes(currentPath);
};
