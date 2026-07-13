import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getAccessibleFallbackPath,
  hasUsableBrowserHistory,
  UnauthorizedPage,
} from './ProtectedRoute';

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();
const mockToastError = jest.fn();
const mockLocation = {
  pathname: '/unauthorized',
  search: '',
  hash: '',
  state: null,
};

jest.mock('../../contexts/AuthContext', () => ({
  ASSURANCE_STATUS: {
    CHECKING: 'checking',
    ERROR: 'error',
    MFA_REQUIRED: 'mfa_required',
    SATISFIED: 'satisfied',
  },
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-router-dom', () => ({
  Navigate: () => null,
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('sonner', () => ({
  toast: {
    error: (...args) => mockToastError(...args),
  },
}));

jest.mock('../ui/skeleton', () => ({
  DynamicAuthSkeleton: () => <div role="status">Loading account</div>,
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  const MotionDiv = ActualReact.forwardRef(({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    ...props
  }, ref) => ActualReact.createElement('div', { ...props, ref }));

  return { motion: { div: MotionDiv } };
});

const viewerProfile = {
  id: 'viewer-1',
  email: 'viewer@ivisit.test',
  role: 'viewer',
};

const click = (element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

describe('UnauthorizedPage Go back recovery', () => {
  let container;
  let root;
  let signOut;
  let originalHistoryState;
  let originalHistoryUrl;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    jest.resetAllMocks();
    originalHistoryState = window.history.state;
    originalHistoryUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    signOut = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: { id: viewerProfile.id },
      profile: viewerProfile,
      signOut,
      can: jest.fn(() => true),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<UnauthorizedPage />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(originalHistoryState, '', originalHistoryUrl);
    jest.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  const getBackButton = () => Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('Go back') || button.textContent.includes('Opening previous page'));

  it('derives a deterministic fallback from canonical role navigation', () => {
    expect(getAccessibleFallbackPath(viewerProfile, jest.fn(() => true))).toBe('/');
    expect(getAccessibleFallbackPath({ ...viewerProfile, role: 'patient' }, jest.fn(() => true)))
      .toBeNull();
  });

  it('shows pending immediately and replaces a direct-entry route with the accessible fallback', () => {
    window.history.replaceState({ idx: 0 }, '', '/unauthorized');
    expect(hasUsableBrowserHistory()).toBe(false);

    const backButton = getBackButton();
    click(backButton);

    expect(backButton.disabled).toBe(true);
    expect(backButton.getAttribute('aria-busy')).toBe('true');
    expect(backButton.textContent).toBe('Opening previous page...');
    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(0));

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith(-1);
  });

  it('falls back when history navigation is available but remains a no-op', () => {
    window.history.replaceState({ idx: 1 }, '', '/unauthorized');
    expect(hasUsableBrowserHistory()).toBe(true);

    click(getBackButton());
    act(() => jest.advanceTimersByTime(0));
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    act(() => jest.advanceTimersByTime(450));
    expect(mockNavigate).toHaveBeenLastCalledWith('/', { replace: true });
  });

  it('signs out before falling back to Login when the role has no console route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'patient-1' },
      profile: { id: 'patient-1', email: 'patient@ivisit.test', role: 'patient' },
      signOut,
      can: jest.fn(() => false),
    });
    act(() => root.render(<UnauthorizedPage />));
    window.history.replaceState({ idx: 0 }, '', '/unauthorized');

    click(getBackButton());
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
