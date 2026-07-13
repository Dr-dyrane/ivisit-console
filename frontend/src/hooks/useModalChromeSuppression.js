import { useEffect } from 'react';

export const useModalChromeSuppression = (isOpen) => {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    window.dispatchEvent(new Event('modal-opened'));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const chromeNodes = Array.from(document.querySelectorAll('[data-modal-chrome="true"], #dynamic-bottom-bar'));
    const previous = chromeNodes.map((node) => ({
      node,
      opacity: node.style.opacity,
      pointerEvents: node.style.pointerEvents,
      visibility: node.style.visibility,
      ariaHidden: node.getAttribute('aria-hidden'),
    }));

    chromeNodes.forEach((node) => {
      node.style.opacity = '0';
      node.style.pointerEvents = 'none';
      node.style.visibility = 'hidden';
      node.setAttribute('aria-hidden', 'true');
    });

    return () => {
      previous.forEach(({ node, opacity, pointerEvents, visibility, ariaHidden }) => {
        node.style.opacity = opacity;
        node.style.pointerEvents = pointerEvents;
        node.style.visibility = visibility;
        if (ariaHidden === null) {
          node.removeAttribute('aria-hidden');
        } else {
          node.setAttribute('aria-hidden', ariaHidden);
        }
      });
    };
  }, [isOpen]);
};

export default useModalChromeSuppression;
