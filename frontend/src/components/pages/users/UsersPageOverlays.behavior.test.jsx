import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { UsersPageDialogs } from './UsersPageOverlays';

jest.mock('../../modals/ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

jest.mock('../../modals/InviteUserModal', () => ({
  InviteUserModal: () => null,
}));

jest.mock('../../modals/UserModal', () => ({
  UserModal: () => null,
}));

jest.mock('../../common/FilterSheet', () => ({
  FilterSheet: () => null,
}));

jest.mock('../../common/BulkActionBar', () => ({
  BulkActionBar: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, variant: _variant, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock('../../ui/ModalShell', () => ({
  ModalShell: ({ children, footer, icon: _icon, isOpen, onClose, subtitle, title }) => (
    isOpen ? (
      <section data-testid="modal-shell">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <button type="button" onClick={onClose}>Dismiss shell</button>
        {children}
        <footer>{footer}</footer>
      </section>
    ) : null
  ),
}));

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  const MotionDiv = ActualReact.forwardRef(({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    whileTap: _whileTap,
    ...props
  }, ref) => ActualReact.createElement('div', { ...props, ref }));

  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: MotionDiv },
  };
});

const noop = () => {};

// The exact shape usersPageRead.getUserPageStats returns.
const PAGE_READ_STATS = { total: 12, provider: 4, org_admin: 2, patient: 6, verified: 8 };

const renderDialogs = async (root, statistics) => {
  await act(async () => {
    root.render(
      <UsersPageDialogs
        isMobile={false}
        modalMode={null}
        selectedUser={null}
        onClose={noop}
        onSave={noop}
        onInvited={noop}
        filterSheetOpen={false}
        setFilterSheetOpen={noop}
        filterSchema={[]}
        filters={{}}
        setFilters={noop}
        analyticsModalOpen
        setAnalyticsModalOpen={noop}
        statistics={statistics}
        confirmationModal={{ isOpen: false }}
        setConfirmationModal={noop}
      />
    );
  });
};

const statValue = (container, label) => {
  const eyebrow = Array.from(container.querySelectorAll('span.eyebrow'))
    .find((node) => node.textContent === label);
  return eyebrow?.nextElementSibling?.textContent;
};

const findButton = (container, label) => Array.from(container.querySelectorAll('button'))
  .find((button) => button.textContent === label);

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

describe('UsersPageDialogs analytics binding', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders the exact usersPageRead counts inside the analytics summary', async () => {
    await renderDialogs(root, PAGE_READ_STATS);

    expect(statValue(container, 'Users')).toBe('12');
    expect(statValue(container, 'Verified')).toBe('8');
    expect(statValue(container, 'Profiles')).toBe('12');
    // Verified share of the exact directory total: 8 of 12.
    expect(container.textContent).toContain('67%');
  });

  it('renders the exact role counts as the roles distribution', async () => {
    await renderDialogs(root, PAGE_READ_STATS);
    await click(findButton(container, 'Next'));

    expect(container.textContent).toContain('provider');
    expect(container.textContent).toContain('org admin');
    expect(container.textContent).toContain('patient');
    expect(container.textContent).toContain('50%');
    expect(container.textContent).toContain('33%');
    expect(container.textContent).toContain('17%');
    // Exact scoped counts, not a page sample: the visible-page caption must not render.
    expect(container.textContent).not.toContain('Visible page only');
  });

  it('does not mount the analytics shell when totals are unavailable', async () => {
    await renderDialogs(root, null);

    expect(container.querySelector('[data-testid="modal-shell"]')).toBeNull();
  });
});
