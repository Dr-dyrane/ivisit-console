import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TabletCheckbox } from './TabletCollectionPage';

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

  const renderCheckbox = (checked, onCheckedChange = jest.fn()) => {
    act(() => {
      root.render(
        <TabletCheckbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          label="Select request"
        />,
      );
    });
    return { button: container.querySelector('[role="checkbox"]'), onCheckedChange };
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
});
