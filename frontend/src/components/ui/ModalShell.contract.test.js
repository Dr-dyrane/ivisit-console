import fs from 'fs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useModalChromeSuppression } from '../../hooks/useModalChromeSuppression';

const ModalChromeHarness = ({ isOpen }) => {
  useModalChromeSuppression(isOpen);
  return null;
};

describe('ModalShell chrome contract', () => {
  const source = () => fs.readFileSync('src/components/ui/ModalShell.jsx', 'utf8');
  const chromeSuppressionSource = () => fs.readFileSync('src/hooks/useModalChromeSuppression.js', 'utf8');
  const filterSheetSource = () => fs.readFileSync('src/components/common/FilterSheet.jsx', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps shared modal chrome accessible, app-owned, and hardgated', () => {
    const modalShell = source();
    const chromeSuppression = chromeSuppressionSource();
    const filterSheet = filterSheetSource();
    const hardgate = hardgateSource();

    expect(modalShell).toContain('role="dialog"');
    expect(modalShell).toContain('aria-modal="true"');
    expect(modalShell).toContain('aria-labelledby={title ? labelId : undefined}');
    // Titleless dialogs (e.g. MobileDetailSheet draws its own header) still get an accessible name.
    expect(modalShell).toContain('aria-label={!title && ariaLabel ? ariaLabel : undefined}');
    expect(modalShell).toContain('data-modal-shell="true"');
    expect(modalShell).toContain("import { useModalChromeSuppression } from '../../hooks/useModalChromeSuppression';");
    expect(modalShell).toContain("import { createPortal } from 'react-dom';");
    expect(modalShell).toContain('useModalChromeSuppression(isOpen);');
    expect(modalShell).toContain('return createPortal(');
    expect(modalShell).toContain('document.body,');
    expect(modalShell).toContain('const modalBackdropTransition = { duration: 0.18');
    expect(modalShell).toContain('const modalShellTransition = { duration: 0.22');
    expect(modalShell).toContain('if (!isOpen) return null;');
    expect(modalShell).toContain('key="modal-shell-backdrop"');
    expect(modalShell).toContain('key="modal-shell-surface"');
    expect(modalShell).toContain('transition={modalBackdropTransition}');
    expect(modalShell).toContain('transition={modalShellTransition}');
    expect(chromeSuppression).toContain('data-modal-chrome="true"], #dynamic-bottom-bar');
    expect(chromeSuppression).toContain("window.dispatchEvent(new Event('modal-opened'))");
    expect(filterSheet).toContain("window.dispatchEvent(new Event('modal-opened'))");
    expect(filterSheet).toContain('const isTabletSheet = Boolean(isMobile && isTablet);');
    expect(filterSheet).toContain('const usesSheetPresentation = Boolean(isMobile && usesCompactNavigation);');
    expect(filterSheet).toContain('grid max-h-[58dvh] grid-cols-2 items-start gap-5');
    expect(chromeSuppression).toContain("node.setAttribute('aria-hidden', 'true')");
    expect(modalShell).toContain('onClick={() => onClose()}');
    expect(modalShell).toContain('aria-label="Close"');
    expect(modalShell).toContain('maxHeight: \'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)\'');
    expect(modalShell).toContain('text-xs leading-snug text-muted-foreground whitespace-normal md:text-sm md:truncate');
    // Footer blends with the sheet surface (no bg band / inset-shadow seam) — matches the app mock.
    expect(modalShell).not.toContain('bg-foreground/[0.035]');
    expect(modalShell).not.toContain('shadow-[inset_0_18px_32px_-30px_rgb(0_0_0/0.30)]');
    expect(modalShell).not.toContain('border-t');
    expect(modalShell).not.toContain('border-border');
    expect(modalShell).not.toContain('fixed inset-0 z-50');
    expect(modalShell).not.toContain('AnimatePresence');
    expect(modalShell).not.toContain('exit={{');
    expect(modalShell).not.toContain("type: 'spring'");
    expect(hardgate).toContain('src/components/ui/ModalShell.jsx');
  });

  it('suppresses and restores the mobile bottom bar while a modal owns focus', () => {
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const bottomBar = document.createElement('nav');
    bottomBar.id = 'dynamic-bottom-bar';
    bottomBar.style.opacity = '0.85';
    bottomBar.style.pointerEvents = 'auto';
    document.body.appendChild(bottomBar);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ModalChromeHarness isOpen />);
    });

    expect(bottomBar.style.opacity).toBe('0');
    expect(bottomBar.style.pointerEvents).toBe('none');
    expect(bottomBar.style.visibility).toBe('hidden');
    expect(bottomBar.getAttribute('aria-hidden')).toBe('true');

    act(() => {
      root.render(<ModalChromeHarness isOpen={false} />);
    });

    expect(bottomBar.style.opacity).toBe('0.85');
    expect(bottomBar.style.pointerEvents).toBe('auto');
    expect(bottomBar.style.visibility).toBe('');
    expect(bottomBar.hasAttribute('aria-hidden')).toBe(false);

    act(() => {
      root.unmount();
    });
    container.remove();
    bottomBar.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
});
