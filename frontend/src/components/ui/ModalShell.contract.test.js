import fs from 'fs';

describe('ModalShell chrome contract', () => {
  const source = () => fs.readFileSync('src/components/ui/ModalShell.jsx', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps shared modal chrome accessible, app-owned, and hardgated', () => {
    const modalShell = source();
    const hardgate = hardgateSource();

    expect(modalShell).toContain('role="dialog"');
    expect(modalShell).toContain('aria-modal="true"');
    expect(modalShell).toContain('aria-labelledby={title ? labelId : undefined}');
    expect(modalShell).toContain('data-modal-shell="true"');
    expect(modalShell).toContain('const modalBackdropTransition = { duration: 0.18');
    expect(modalShell).toContain('const modalShellTransition = { duration: 0.22');
    expect(modalShell).toContain('if (!isOpen) return null;');
    expect(modalShell).toContain('key="modal-shell-backdrop"');
    expect(modalShell).toContain('key="modal-shell-surface"');
    expect(modalShell).toContain('transition={modalBackdropTransition}');
    expect(modalShell).toContain('transition={modalShellTransition}');
    expect(modalShell).toContain('data-modal-chrome="true"], #dynamic-bottom-bar');
    expect(modalShell).toContain("node.setAttribute('aria-hidden', 'true')");
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
});
