import fs from 'fs';

describe('SmartHeader shell chrome contract', () => {
  const source = () => fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps the mobile account sheet as the canonical menu trigger', () => {
    const header = source();

    expect(header).toContain('data-modal-chrome="true"');
    expect(header).toContain("window.addEventListener('closeMobileMenu', handleClose)");
    expect(header).toContain("window.addEventListener('openMobileMenu', handleOpen)");
    expect(header).toContain('aria-label="Open account menu"');
    expect(header).toContain('aria-expanded={menuOpen}');
    expect(header).toContain('aria-haspopup="dialog"');
    expect(header).toContain('<Sheet open={menuOpen} onOpenChange={setMenuOpen}>');
    expect(header).toContain('<SheetTitle className="sr-only">Navigation</SheetTitle>');
    expect(header).toContain('<SheetDescription className="sr-only">');
    expect(header).toContain('MobileNavMenu onClose={() => setMenuOpen(false)}');
    expect(header).not.toContain("import { Search, Menu");
    expect(header).not.toContain('bottomMenuButton');
  });

  it('keeps shared header actions stateful, quiet, and in the active hardgate', () => {
    const header = source();
    const hardgate = hardgateSource();

    expect(header).toContain('const HeaderDivider = () => (');
    expect((header.match(/<HeaderDivider \/>/g) || []).length).toBe(3);
    expect((header.match(/aria-expanded={searchOpen}/g) || []).length).toBe(2);
    expect(header).toContain('aria-expanded={isContextPanelOpen}');
    expect(header).toContain('aria-controls="quick-actions-panel"');
    expect(header).toContain("data-state={isContextPanelOpen ? 'open' : 'closed'}");
    expect(header).toContain('<TooltipProvider delayDuration={300}>');
    expect(header).toContain('<TooltipContent side="bottom">');
    expect(header).toContain('{isContextPanelOpen ? "Close quick actions panel" : "Quick Actions"}');
    expect(header).toContain("if (pathname.startsWith('/emergencies')) return 'Requests';");
    expect(header).toContain("if (pathname.startsWith('/doctors')) return 'Staff';");
    expect(header).toContain("if (pathname.startsWith('/verification')) return 'Approvals';");
    expect(header).not.toContain("if (pathname.startsWith('/verification')) return 'Verification';");
    expect(header).toContain("if (pathname.startsWith('/wallet')) return 'Payments';");
    expect(header).not.toContain('w-px');
    expect(header).not.toContain('h-px');
    expect(header).not.toContain('border-0');
    expect(header).not.toContain('bg-border');
    expect(header).not.toContain('glass-card');
    expect(header).not.toContain('hover-glow');
    expect(hardgate).toContain('src/components/navigation/SmartHeader.jsx');
  });
});
