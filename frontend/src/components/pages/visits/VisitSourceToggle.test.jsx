import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { VisitSourceToggle } from './VisitSourceToggle';

describe('VisitSourceToggle', () => {
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

  const renderToggle = (viewMode) => {
    const onChange = jest.fn();
    act(() => {
      root.render(<VisitSourceToggle viewMode={viewMode} onChange={onChange} />);
    });
    return { button: container.querySelector('button'), onChange };
  };

  it('enters scheduled visits from the history lane', () => {
    const { button, onChange } = renderToggle('all');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    act(() => button.click());
    expect(onChange).toHaveBeenCalledWith('scheduled');
  });

  it('returns to visit history from the scheduled lane', () => {
    const { button, onChange } = renderToggle('scheduled');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-state')).toBe('active');
    act(() => button.click());
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
