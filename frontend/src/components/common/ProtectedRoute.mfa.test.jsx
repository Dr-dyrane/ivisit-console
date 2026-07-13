import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ASSURANCE_STATUS, AuthProvider, classifyAssuranceLevel } from '../../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockGetAssuranceLevel = jest.fn();
const mockListFactors = jest.fn();
const mockChallenge = jest.fn();
const mockVerify = jest.fn();
const mockSignOut = jest.fn();
const mockRpc = jest.fn();
const mockProtectedRender = jest.fn();
const mockClearPrincipalScopedQueryCache = jest.fn();
let authStateCallback;

jest.mock('react-router-dom', () => {
  const ActualReact = require('react');
  const RouterContext = ActualReact.createContext(null);

  const parseLocation = (target, state = null) => {
    const [pathAndSearch, hashPart] = String(target || '/').split('#');
    const [pathname, searchPart] = pathAndSearch.split('?');
    return {
      pathname: pathname || '/',
      search: searchPart ? `?${searchPart}` : '',
      hash: hashPart ? `#${hashPart}` : '',
      state,
    };
  };

  const MemoryRouter = ({ children, initialEntries = ['/'] }) => {
    const initialEntry = initialEntries[0];
    const [location, setLocation] = ActualReact.useState(() => (
      typeof initialEntry === 'string'
        ? parseLocation(initialEntry)
        : { search: '', hash: '', state: null, ...initialEntry }
    ));
    const navigate = ActualReact.useCallback((target, options = {}) => {
      if (typeof target !== 'string') return;
      setLocation(parseLocation(target, options.state || null));
    }, []);

    return ActualReact.createElement(
      RouterContext.Provider,
      { value: { location, navigate } },
      children
    );
  };

  const useLocation = () => ActualReact.useContext(RouterContext).location;
  const useNavigate = () => ActualReact.useContext(RouterContext).navigate;

  const Navigate = ({ state, to }) => {
    const navigate = useNavigate();
    ActualReact.useEffect(() => navigate(to, { state }), [navigate, state, to]);
    return null;
  };

  const Route = () => null;
  const Routes = ({ children }) => {
    const location = useLocation();
    const route = ActualReact.Children.toArray(children)
      .find((child) => child.props.path === location.pathname);
    return route?.props.element || null;
  };

  const Link = ({ children, onClick, to, ...props }) => {
    const navigate = useNavigate();
    const handleClick = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      navigate(to);
    };
    return ActualReact.createElement('a', {
      ...props,
      href: to,
      onClick: handleClick,
    }, children);
  };

  return {
    Link,
    MemoryRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
  };
}, { virtual: true });

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: (...args) => mockSignOut(...args),
      resetPasswordForEmail: jest.fn(),
      signInWithOAuth: jest.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args) => mockGetAssuranceLevel(...args),
        listFactors: (...args) => mockListFactors(...args),
        challenge: (...args) => mockChallenge(...args),
        verify: (...args) => mockVerify(...args),
      },
    },
    rpc: (...args) => mockRpc(...args),
  },
}));

jest.mock('../../lib/queryClient', () => ({
  clearPrincipalScopedQueryCache: (...args) => mockClearPrincipalScopedQueryCache(...args),
}));

jest.mock('../../services/authService', () => ({
  clearCurrentUserCache: jest.fn(),
  primeCurrentUserCache: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('../../services/profilesService', () => ({
  discardUnpersistedProfileAvatar: jest.fn(),
  updateProfile: jest.fn(),
  uploadProfileAvatar: jest.fn(),
}));

jest.mock('../ui/skeleton', () => ({
  DynamicAuthSkeleton: () => <div role="status">Loading account</div>,
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));

jest.mock('../ui/theme-toggle', () => ({
  __esModule: true,
  default: () => <button type="button">Theme</button>,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  const motionComponent = (tagName) => ActualReact.forwardRef(({
    animate: _animate,
    custom: _custom,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    variants: _variants,
    ...props
  }, ref) => ActualReact.createElement(tagName, { ...props, ref }));

  return {
    AnimatePresence: ({ children }) => children,
    motion: {
      div: motionComponent('div'),
      p: motionComponent('p'),
    },
  };
});

const sessionUser = {
  id: 'user-1',
  email: 'operator@ivisit.test',
};

const profileProjection = {
  profile: {
    id: sessionUser.id,
    email: sessionUser.email,
    role: 'viewer',
    onboarding_status: 'complete',
    organization_id: null,
  },
  organizationScope: {
    state: 'missing_org',
    organizationId: null,
    facilityIds: [],
  },
};

const assurance = (currentLevel, nextLevel) => ({
  data: { currentLevel, nextLevel },
  error: null,
});

const ProtectedSettings = () => {
  mockProtectedRender();
  return <div>Protected settings content</div>;
};

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitFor = async (assertion) => {
  let lastError;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flush();
    }
  }

  throw lastError;
};

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

const setInputValue = async (input, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;

  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('ProtectedRoute MFA assurance boundary', () => {
  let container;
  let root;
  let unsubscribe;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    unsubscribe = jest.fn();

    jest.resetAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
      error: null,
    });
    authStateCallback = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    mockListFactors.mockResolvedValue({
      data: {
        totp: [{ id: 'factor-1', status: 'verified', factorType: 'totp' }],
      },
      error: null,
    });
    mockChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mockVerify.mockResolvedValue({ data: {}, error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: profileProjection, error: null });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  const renderProtectedFlow = async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/settings"
                element={(
                  <ProtectedRoute>
                    <ProtectedSettings />
                  </ProtectedRoute>
                )}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
    });
  };

  it('classifies only equal valid assurance levels as satisfied', () => {
    expect(classifyAssuranceLevel({ currentLevel: 'aal1', nextLevel: 'aal1' }))
      .toBe(ASSURANCE_STATUS.SATISFIED);
    expect(classifyAssuranceLevel({ currentLevel: 'aal2', nextLevel: 'aal2' }))
      .toBe(ASSURANCE_STATUS.SATISFIED);
    expect(classifyAssuranceLevel({ currentLevel: 'aal1', nextLevel: 'aal2' }))
      .toBe(ASSURANCE_STATUS.MFA_REQUIRED);
    expect(classifyAssuranceLevel({ currentLevel: 'aal2', nextLevel: 'aal1' }))
      .toBe(ASSURANCE_STATUS.ERROR);
  });

  it('never renders protected content for AAL1 and proceeds only after MFA verification', async () => {
    mockGetAssuranceLevel
      .mockResolvedValueOnce(assurance('aal1', 'aal2'))
      .mockResolvedValueOnce(assurance('aal2', 'aal2'));

    await renderProtectedFlow();

    await waitFor(() => {
      expect(container.textContent).toContain('Enter the code from your authenticator app.');
      expect(container.textContent).not.toContain('Protected settings content');
      expect(mockChallenge).toHaveBeenCalledTimes(1);
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockProtectedRender).not.toHaveBeenCalled();
    });

    const codeInput = container.querySelector('#mfa-code');
    expect(codeInput).not.toBeNull();
    await setInputValue(codeInput, '123456');

    await act(async () => {
      codeInput.closest('form').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
    });

    await waitFor(() => {
      expect(mockVerify).toHaveBeenCalledWith({
        factorId: 'factor-1',
        challengeId: 'challenge-1',
        code: '123456',
      });
      expect(container.textContent).toContain('Protected settings content');
    });

    expect(mockGetAssuranceLevel).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockProtectedRender).toHaveBeenCalledTimes(1);
  });

  it('allows an AAL1 account with no required factor through the normal profile path', async () => {
    mockGetAssuranceLevel.mockResolvedValue(assurance('aal1', 'aal1'));

    await renderProtectedFlow();

    await waitFor(() => {
      expect(container.textContent).toContain('Protected settings content');
    });

    expect(mockListFactors).not.toHaveBeenCalled();
    expect(mockChallenge).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockClearPrincipalScopedQueryCache).not.toHaveBeenCalled();
  });

  it('retains cache for same-principal refresh and clears it for a principal replacement', async () => {
    const nextUser = { id: 'user-2', email: 'second@ivisit.test' };
    mockGetAssuranceLevel.mockResolvedValue(assurance('aal1', 'aal1'));
    mockRpc
      .mockResolvedValueOnce({ data: profileProjection, error: null })
      .mockResolvedValueOnce({
        data: {
          ...profileProjection,
          profile: { ...profileProjection.profile, id: nextUser.id, email: nextUser.email },
        },
        error: null,
      });

    await renderProtectedFlow();
    await waitFor(() => expect(container.textContent).toContain('Protected settings content'));
    expect(mockClearPrincipalScopedQueryCache).not.toHaveBeenCalled();

    await act(async () => {
      authStateCallback('TOKEN_REFRESHED', { user: sessionUser });
    });
    await waitFor(() => expect(mockGetAssuranceLevel).toHaveBeenCalledTimes(2));
    expect(mockClearPrincipalScopedQueryCache).not.toHaveBeenCalled();

    await act(async () => {
      authStateCallback('SIGNED_IN', { user: nextUser });
    });
    await waitFor(() => expect(mockClearPrincipalScopedQueryCache).toHaveBeenCalledTimes(1));
  });

  it('fails closed with retry and sign-out actions when assurance lookup fails', async () => {
    mockGetAssuranceLevel
      .mockResolvedValueOnce({ data: null, error: new Error('network unavailable') })
      .mockResolvedValueOnce(assurance('aal1', 'aal1'));

    await renderProtectedFlow();

    await waitFor(() => {
      expect(container.textContent).toContain('Security check unavailable');
      expect(container.textContent).toContain('Retry security check');
      expect(container.textContent).toContain('Use another account');
      expect(container.textContent).not.toContain('Protected settings content');
      expect(mockProtectedRender).not.toHaveBeenCalled();
    });

    const retryButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Retry security check'));
    expect(retryButton).toBeDefined();
    await click(retryButton);

    await waitFor(() => {
      expect(container.textContent).toContain('Protected settings content');
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('lets a user safely sign out when assurance cannot be confirmed', async () => {
    mockGetAssuranceLevel.mockResolvedValue({
      data: null,
      error: new Error('network unavailable'),
    });

    await renderProtectedFlow();

    await waitFor(() => {
      expect(container.textContent).toContain('Use another account');
      expect(mockProtectedRender).not.toHaveBeenCalled();
    });

    const signOutButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Use another account'));
    expect(signOutButton).toBeDefined();
    await click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockClearPrincipalScopedQueryCache).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain('Use your organization email to continue.');
      expect(container.textContent).not.toContain('Protected settings content');
    });
  });
});
