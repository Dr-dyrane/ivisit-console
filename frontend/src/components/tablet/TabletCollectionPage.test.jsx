import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TabletCheckbox, TabletKpiStrip, TabletCollectionPage } from './TabletCollectionPage';
import { TabletPageShell } from './TabletPageShell';

// Mutable viewport/layout so tests can flip between a wide tablet (split) and
// a narrow tablet (stacked master-detail) without remocking modules.
const mockViewport = { isWideTablet: true, width: 1194, usesCompactNavigation: false };
const mockLayout = { sidebarWidth: 72 };

jest.mock('../../contexts/NavigationContext', () => ({
  useNavigation: () => ({ ...mockViewport }),
}));
jest.mock('../../contexts/LayoutContext', () => ({
  useLayout: () => ({ ...mockLayout }),
}));

// Wide tablet, collapsed rail: effective 1194 - 92 = 1102 >= 896 -> split.
const setWideTablet = () => {
  Object.assign(mockViewport, { isWideTablet: true, width: 1194, usesCompactNavigation: false });
  mockLayout.sidebarWidth = 72;
};
// Portrait tablet, compact navigation: effective 810 < 896 -> stacked.
const setNarrowTablet = () => {
  Object.assign(mockViewport, { isWideTablet: false, width: 810, usesCompactNavigation: true });
  mockLayout.sidebarWidth = 72;
};

describe('TabletCheckbox', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderCheckbox = (checked, onCheckedChange = jest.fn(), onSelectClick = jest.fn()) => {
    act(() => {
      root.render(
        <TabletCheckbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          onSelectClick={onSelectClick}
          label="Select request"
        />,
      );
    });
    return { button: container.querySelector('[role="checkbox"]'), onCheckedChange, onSelectClick };
  };

  it('reports stable boolean and mixed states without a presence layer', () => {
    const unchecked = renderCheckbox(false);
    expect(unchecked.button.getAttribute('aria-checked')).toBe('false');
    act(() => unchecked.button.click());
    expect(unchecked.onCheckedChange).toHaveBeenCalledWith(true);

    const checked = renderCheckbox(true);
    expect(checked.button.getAttribute('aria-checked')).toBe('true');
    act(() => checked.button.click());
    expect(checked.onCheckedChange).toHaveBeenCalledWith(false);

    const mixed = renderCheckbox('indeterminate');
    expect(mixed.button.getAttribute('aria-checked')).toBe('mixed');
    act(() => mixed.button.click());
    expect(mixed.onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('forwards the mouse event (shiftKey) through onSelectClick before toggling', () => {
    const { button, onCheckedChange, onSelectClick } = renderCheckbox(false);
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
    });
    expect(onSelectClick).toHaveBeenCalledTimes(1);
    expect(onSelectClick.mock.calls[0][0].shiftKey).toBe(true);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // Order matters: useRowSelection stashes shiftKey in the click handler
    // BEFORE the toggle reads it.
    expect(onSelectClick.mock.invocationCallOrder[0])
      .toBeLessThan(onCheckedChange.mock.invocationCallOrder[0]);
  });

  it('meets the 44px target with a hit-slop pseudo-element around the 16px visual box', () => {
    const { button } = renderCheckbox(false);
    expect(button.className).toContain('h-4 w-4');
    // 16px box + 14px inset on every side = 44px tap target.
    expect(button.className).toContain('before:-inset-3.5');
    expect(button.className).toContain('focus-visible:ring-2');
  });
});

describe('TabletKpiStrip', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const OPTIONS = [
    { id: 'all', label: 'All', value: 5 },
    { id: 'pending', label: 'Pending', value: 0 },
    { id: 'active', label: 'Active', value: 2 },
    { id: 'completed', label: 'Completed', value: 9 },
  ];

  const renderStrip = (props = {}) => {
    const onChange = jest.fn();
    act(() => {
      root.render(
        <TabletKpiStrip
          options={OPTIONS}
          activeId="all"
          onChange={onChange}
          pinnedIds={['pending', 'active']}
          importance={{ all: 0, pending: 1, active: 2, completed: 3 }}
          {...props}
        />,
      );
    });
    return { onChange };
  };

  it('selects chips via the shared selectPrimaryKpis, not a naive first-3 slice', () => {
    renderStrip();
    const labels = Array.from(container.querySelectorAll('button')).map(
      (chip) => chip.querySelector('span').textContent,
    );
    // pending is pinned but count 0 so it loses its slot; completed wins by
    // count. A slice(0, 3) would render All/Pending/Active instead.
    expect(labels).toEqual(['All', 'Active', 'Completed']);
  });

  it('re-tapping the active non-All chip returns the scope to All', () => {
    const { onChange } = renderStrip({ activeId: 'active' });
    const chips = Array.from(container.querySelectorAll('button'));
    const activeChip = chips.find((chip) => chip.getAttribute('aria-pressed') === 'true');
    act(() => activeChip.click());
    expect(onChange).toHaveBeenCalledWith('all');

    onChange.mockClear();
    // Tapping an INACTIVE non-All chip selects it (no toggle).
    const completedChip = chips.find((chip) => chip.textContent.includes('Completed'));
    act(() => completedChip.click());
    expect(onChange).toHaveBeenCalledWith('completed');
  });
});

describe('TabletCollectionPage behavior', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Element.prototype.scrollTo = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    setWideTablet();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  const RECORDS = [
    { id: 'r1', title: 'Row one', source: { id: 'r1' } },
    { id: 'r2', title: 'Row two', source: { id: 'r2' } },
  ];

  const render = (props = {}) => {
    act(() => {
      root.render(<TabletCollectionPage records={RECORDS} {...props} />);
    });
  };

  const typeInSearch = (value) => {
    const input = container.querySelector('input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  it('debounces search commits by 300ms and commits the clear-x immediately', () => {
    jest.useFakeTimers();
    const onSearchCommit = jest.fn();
    render({ onSearchCommit });

    typeInSearch('amb');
    expect(onSearchCommit).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(299));
    expect(onSearchCommit).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onSearchCommit).toHaveBeenCalledWith('amb');

    onSearchCommit.mockClear();
    const clear = container.querySelector('[aria-label="Clear search"]');
    expect(clear).not.toBeNull();
    act(() => clear.click());
    expect(onSearchCommit).toHaveBeenCalledWith('');
  });

  it('shows a degraded banner with retry when an error arrives while rows exist', () => {
    const onRetry = jest.fn();
    render({ error: 'refresh failed', onRetry });
    const banner = container.querySelector('[data-tablet-degraded]');
    expect(banner).not.toBeNull();
    const retry = Array.from(banner.querySelectorAll('button'))
      .find((button) => button.textContent === 'Retry');
    act(() => retry.click());
    expect(onRetry).toHaveBeenCalled();
    // Rows stay visible under the banner.
    expect(container.querySelector('[data-tablet-record-row="r1"]')).not.toBeNull();
  });

  it('offers recovery actions on filtered-empty and searched-empty states', () => {
    const onOpenFilters = jest.fn();
    render({ records: [], filtersActive: true, onOpenFilters });
    const adjust = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Adjust filters');
    act(() => adjust.click());
    expect(onOpenFilters).toHaveBeenCalled();

    const onSearchCommit = jest.fn();
    render({ records: [], searchValue: 'zzz', onSearchCommit });
    const clear = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Clear search');
    act(() => clear.click());
    expect(onSearchCommit).toHaveBeenCalledWith('');
  });

  it('supports arrow-key navigation and Enter-to-open over the rows viewport', () => {
    const onFocus = jest.fn();
    const onOpen = jest.fn();
    render({ focusedId: 'r1', onFocus, onOpen });
    const region = container.querySelector('[role="region"]');
    act(() => {
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(onFocus).toHaveBeenCalledWith('r2');
    expect(document.activeElement).toBe(
      container.querySelector('[data-tablet-record-row="r2"] [data-tablet-row-trigger]'),
    );
    act(() => {
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onOpen).toHaveBeenCalledWith(RECORDS[0].source);

    act(() => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onFocus).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(region);
  });

  it('announces the refresh result through a polite live region', () => {
    render({ isFetching: true });
    const live = container.querySelector('[aria-live="polite"]');
    expect(live.textContent).toBe('');
    render({ isFetching: false });
    expect(live.textContent).toContain('List updated');
    expect(live.textContent).toContain('2 records');
  });

  it('exposes the three-state filter trigger with popup semantics', () => {
    render({ onOpenFilters: jest.fn(), filtersActive: true, filterSheetOpen: false });
    const trigger = container.querySelector('[aria-label="Filters"]');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('data-state')).toBe('filtered');

    render({ onOpenFilters: jest.fn(), filtersActive: true, filterSheetOpen: true });
    const openTrigger = container.querySelector('[aria-label="Filters"]');
    expect(openTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(openTrigger.getAttribute('data-state')).toBe('open');
  });
});

describe('TabletCollectionPage stacked master-detail (narrow tablet)', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Element.prototype.scrollTo = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    setNarrowTablet();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const RECORDS = [
    { id: 'r1', title: 'Row one', source: { id: 'r1' } },
    { id: 'r2', title: 'Row two', source: { id: 'r2' } },
  ];

  const render = (props = {}) => {
    act(() => {
      root.render(
        <TabletCollectionPage
          records={RECORDS}
          detail={<div data-testid="detail-body">Detail body</div>}
          onFocus={jest.fn()}
          {...props}
        />,
      );
    });
  };

  const rowTrigger = (id) => container.querySelector(`[data-tablet-record-row="${id}"] [data-tablet-row-trigger]`);
  const detailLayer = () => container.querySelector('[data-tablet-detail-layer]');
  const backButton = () => container.querySelector('[aria-label="Back to list"]');
  const pushRow = (id) => act(() => rowTrigger(id).click());

  it('does not auto-push the detail when a controller auto-focuses the first row', () => {
    // Wallet-style controllers focus activeItems[0] on load; a focusedId-derived
    // model would false-open the detail on every narrow-tablet mount.
    render({ focusedId: 'r1' });
    const shell = container.querySelector('[data-tablet-page-shell]');
    expect(shell.getAttribute('data-tablet-layout')).toBe('stacked');
    expect(shell.getAttribute('data-tablet-detail-open')).toBe('false');
    expect(detailLayer()).toBeNull();
    expect(container.querySelector('[data-testid="detail-body"]')).toBeNull();
  });

  it('pushes the detail on row activation and moves focus to the back affordance', () => {
    const onFocus = jest.fn();
    render({ onFocus });
    pushRow('r1');

    expect(onFocus).toHaveBeenCalledWith('r1');
    expect(detailLayer()).not.toBeNull();
    expect(container.querySelector('[data-testid="detail-body"]')).not.toBeNull();
    const shell = container.querySelector('[data-tablet-page-shell]');
    expect(shell.getAttribute('data-tablet-detail-open')).toBe('true');
    // The covered list is inert while pushed.
    expect(container.querySelector('[data-tablet-primary-pane]').hasAttribute('inert')).toBe(true);
    // AT entry point: focus lands on the labeled 44px back button.
    expect(document.activeElement).toBe(backButton());
  });

  it('returns focus to the activated row when the back affordance closes the detail', () => {
    render({});
    pushRow('r1');
    act(() => backButton().click());

    expect(detailLayer()).toBeNull();
    expect(container.querySelector('[data-tablet-primary-pane]').hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(rowTrigger('r1'));
  });

  it('closes on Escape inside the layer but yields to open dialogs', () => {
    render({});
    pushRow('r1');

    // An open dialog above the layer owns Escape -- the layer must stay.
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    act(() => {
      backButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(detailLayer()).not.toBeNull();
    dialog.remove();

    act(() => {
      backButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(detailLayer()).toBeNull();
    expect(document.activeElement).toBe(rowTrigger('r1'));
  });

  it('falls back to the rows viewport when the pushed row left the page before back', () => {
    render({});
    pushRow('r1');
    // The row disappears while the detail is pushed (filter/refetch/pagination).
    render({ records: [RECORDS[1]] });
    act(() => backButton().click());

    expect(detailLayer()).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[role="region"]'));
  });

  it('keeps the two-pane split with both surfaces and no back affordance on a wide tablet', () => {
    setWideTablet();
    render({ focusedId: 'r1' });

    const shell = container.querySelector('[data-tablet-page-shell]');
    expect(shell.getAttribute('data-tablet-layout')).toBe('split');
    expect(container.querySelector('[data-tablet-primary-pane]')).not.toBeNull();
    expect(container.querySelector('[data-tablet-detail-pane]')).not.toBeNull();
    expect(container.querySelector('[data-testid="detail-body"]')).not.toBeNull();
    expect(backButton()).toBeNull();
    expect(detailLayer()).toBeNull();
  });

  it('stacks uncontrolled shell callers into one column with both surfaces reachable', () => {
    // TabletSettings/TabletAnalytics shape: no detailOpen prop at all.
    act(() => {
      root.render(
        <TabletPageShell detail={<div data-testid="rail-body">Rail</div>}>
          <div data-testid="page-body">Page</div>
        </TabletPageShell>,
      );
    });

    const shell = container.querySelector('[data-tablet-page-shell]');
    expect(shell.getAttribute('data-tablet-layout')).toBe('stacked');
    expect(shell.hasAttribute('data-tablet-detail-open')).toBe(false);
    expect(container.querySelector('[data-testid="page-body"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="rail-body"]')).not.toBeNull();
    expect(backButton()).toBeNull();
  });
});
