import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { execFileSync } from 'child_process';
import { routeOwnsStartupDomains } from '../../config/pageDataAccess';

const read = (path) => fs.readFileSync(path, 'utf8');
// Preservation baseline: the console revamp landed on top of f31f29f; checkpoint commits advanced HEAD past it, so old-behavior proofs read this baseline commit, not the moving HEAD ref. See docs/planning/PAGE_REVAMP_GATE.md "Preservation Baseline Re-Anchor - 2026-07-07".
const PRESERVATION_BASELINE = 'f31f29f';
const gitShowHead = (path) => execFileSync('git', ['-C', '..', 'show', `${PRESERVATION_BASELINE}:${path}`], { encoding: 'utf8' });

describe('Settings Page 16 intake contract', () => {
  it('keeps mobile Settings dialogs above and clear of the bottom navigation pill', () => {
    const page = read('src/components/pages/SettingsPage.jsx');
    const profileModal = read('src/components/modals/ProfileEditModal.jsx');
    const securityModal = read('src/components/modals/SecurityModal.jsx');
    const chromeSuppression = read('src/hooks/useModalChromeSuppression.js');

    expect(page).toContain("import { useModalChromeSuppression } from '../../hooks/useModalChromeSuppression';");
    expect(page).toContain('useModalChromeSuppression(isProfileModalOpen || isSecurityModalOpen);');
    expect(profileModal).toContain('fixed inset-0 z-[420]');
    expect(securityModal).toContain('fixed inset-0 z-[420]');
    expect(chromeSuppression).toContain('[data-modal-chrome="true"], #dynamic-bottom-bar');
    expect(chromeSuppression).toContain("node.style.visibility = 'hidden';");
    expect(chromeSuppression).toContain("node.setAttribute('aria-hidden', 'true');");
  });

  it('preserves Settings intake archaeology and admits the guarded active surfaces', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const mobileNavigation = read('src/config/mobileNavigation.js');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 16 Intake Audit - Settings');
    expect(gate).toContain('Settings at `/settings` is intake only and is not admitted under the Today/Requests canon.');
    expect(gate).toContain('No visual revamp, shared Requests pattern reuse, profile/security/support/billing enablement, provider self-service promotion, route-owned action promotion, or hardgate promotion is authorized yet.');
    expect(gate).toContain('Promotion rule: the first Settings visual pass must close this blocker map before adding Page 16 to the default hardgate.');
    expect(gate).toContain('`SettingsPage.jsx`, `MobileSettings.jsx`, and `SettingsPanel.jsx` have focused strict-radius proof for desktop shell/mobile shell/right-panel chrome');

    expect(app).toContain('<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/settings': {");
    expect(routes).toContain("minRole: 'viewer'");
    expect(routes).toContain("resource: 'settings'");
    expect(navigation).toContain("{ id: 'settings', path: '/settings', icon: Settings, label: 'Settings', resource: 'settings', minRole: 'viewer' }");
    expect(mobileNavigation).toContain("overflowOwner: 'avatar'");
    expect(mobileNavigation).toContain('bottomMenuButton: false');
    expect(mobileNavigation).toContain("{ id: 'settings', path: '/settings', label: 'Settings' }");

    [
      'src/components/pages/SettingsPage.jsx',
      'src/components/pages/settings/SettingsDesktopWorkspace.jsx',
      'src/components/mobile/MobileSettings.jsx',
      'src/components/context/SettingsPanel.jsx',
      'src/components/modals/SecurityModal.jsx',
      'src/components/modals/ProfileEditModal.jsx',
    ].forEach((file) => {
      expect(hardgate).toContain(file);
    });

    [
      'src/components/modals/SupportModal.jsx',
      'src/components/views/DoctorProfileCard.jsx',
      'src/hooks/useDoctorProfile.js',
    ].forEach((file) => {
      expect(hardgate).not.toContain(file);
    });
  });

  it('preserves the old Settings behavior inventory as evidence, not canon', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const oldPage = gitShowHead('frontend/src/components/pages/SettingsPage.jsx');
    const oldMobile = gitShowHead('frontend/src/components/mobile/MobileSettings.jsx');
    const oldPanel = gitShowHead('frontend/src/components/context/SettingsPanel.jsx');
    const oldSecurityModal = gitShowHead('frontend/src/components/modals/SecurityModal.jsx');
    const oldProfileModal = gitShowHead('frontend/src/components/modals/ProfileEditModal.jsx');
    const oldSupportModal = gitShowHead('frontend/src/components/modals/SupportModal.jsx');
    const oldDoctorCard = gitShowHead('frontend/src/components/views/DoctorProfileCard.jsx');
    const oldDoctorHook = gitShowHead('frontend/src/hooks/useDoctorProfile.js');

    const page = read('src/components/pages/SettingsPage.jsx');
    const workspace = read('src/components/pages/settings/SettingsDesktopWorkspace.jsx');
    const desktop = `${page}\n${workspace}`;
    const mobile = read('src/components/mobile/MobileSettings.jsx');
    const panel = read('src/components/context/SettingsPanel.jsx');
    const securityModal = read('src/components/modals/SecurityModal.jsx');
    const profileModal = read('src/components/modals/ProfileEditModal.jsx');
    const supportModal = read('src/components/modals/SupportModal.jsx');
    const doctorCard = read('src/components/views/DoctorProfileCard.jsx');
    const doctorHook = read('src/hooks/useDoctorProfile.js');

    expect(gate).toContain('HEAD snapshot evidence for this ledger: `git show HEAD:frontend/src/components/pages/SettingsPage.jsx`');
    expect(gate).toContain('`usePageHeader("Account Settings")`, `openProfileModal`, `openSecurityModal`, `openSupportModal`, `openDoctorModal`, `?quick=true`');
    expect(gate).toContain('DOM-only dark-mode toggle, hard-coded `Free Tier`, avatar load/failure browser logs');
    expect(gate).toContain('mobile Account/Preferences/Security rows, `SettingsPanel` quick actions for Edit Profile/Security/Billing/Help');
    expect(gate).toContain('direct Supabase Auth MFA/password actions, profile/avatar update, old Settings-owned support ticket creation, and provider doctor updates through `doctorsService.updateDoctor()`.');

    expect(oldPage).toContain('Free Tier');
    expect(desktop).not.toContain('Free Tier');
    expect(desktop).not.toContain('Current Plan');
    expect(workspace).toContain('Plan unavailable');
    expect(workspace).toContain('Billing details are not available for this account yet.');
    expect(workspace).not.toContain('Billing source not verified');
    expect(oldPage).toContain('<SupportModal');
    expect(page).not.toContain("import { SupportModal }");
    expect(page).not.toContain('<SupportModal');
    expect(page).toContain('const handleOpenSupport = useCallback(() => {');
    expect(page).toContain("toast.info('Support is unavailable for this role')");
    expect(page).toContain("navigate('/support-tickets?add=true&from=settings')");
    expect(page).toContain('onOpenSupport={handleOpenSupport}');
    expect(workspace).toContain('onClick={onOpenSupport}');

    expect(oldPage).toContain('usePageHeader("Account Settings")');
    expect(page).toContain("usePageHeader('Settings', headerActions)");
    for (const source of [oldPage, page]) {
      expect(source).toContain("window.addEventListener('openProfileModal', handleOpenProfile)");
      expect(source).toContain("window.addEventListener('openSecurityModal', handleOpenSecurity)");
      expect(source).toContain("window.addEventListener('openSupportModal', handleOpenSupport)");
      expect(source).toContain("window.addEventListener('openDoctorModal', handleOpenDoctor)");
      expect(source).toContain("params.get('quick') === 'true'");
      expect(source).toContain("window.history.replaceState({}, '', '/settings')");
      expect(source).toContain('getDisplayId(profile.id)');
      expect(source).toContain("toast.success('Signed out successfully')");
      expect(source).toContain('<MobileSettings');
      expect(source).toContain('<ProfileEditModal');
      expect(source).toContain('<SecurityModal');
    }
    expect(oldPage).toContain('<DoctorProfileCard');
    expect(page).not.toContain('DoctorProfileCard');
    expect(workspace).not.toContain('DoctorProfileCard');
    expect((page.match(/useDoctorProfile\(\)/g) || [])).toHaveLength(1);
    expect(page).toContain('const { doctorProfile, loading: doctorProfileLoading } = useDoctorProfile();');
    expect(page).toContain('mode="view"');
    expect(oldPage).toContain("document.documentElement.classList.toggle('dark', newMode)");
    expect(page).not.toContain("document.documentElement.classList.toggle('dark', newMode)");
    expect(page).toContain("import { useTheme } from '../../contexts/ThemeContext';");
    expect(page).toContain('const { theme, toggleTheme } = useTheme();');
    expect(page).toContain("const darkMode = theme === 'dark';");
    expect(page).toContain('toggleTheme();');
    expect(oldPage).toContain("console.error('Avatar image failed to load:', e)");
    expect(oldPage).toContain("console.error('Failed src:', avatarUrl)");
    expect(oldPage).toContain("console.log('Avatar image loaded successfully:', avatarUrl)");
    expect(page).not.toContain("console.error('Avatar image failed to load:', e)");
    expect(page).not.toContain("console.error('Failed src:', avatarUrl)");
    expect(page).not.toContain("console.log('Avatar image loaded successfully:', avatarUrl)");
    expect(page).toContain('const [isSigningOut, setIsSigningOut] = useState(false);');
    expect(page).toContain('if (isSigningOut) return;');
    expect(page).toContain('setIsSigningOut(true);');
    expect(page).toContain('setIsSigningOut(false);');
    expect(page).toContain('isSigningOut={isSigningOut}');
    expect(workspace).toContain('disabled={isSigningOut}');
    expect(workspace).toContain("aria-busy={isSigningOut ? 'true' : undefined}");
    expect(workspace).toContain("data-state={isSigningOut ? 'pending' : 'ready'}");
    expect(workspace).toContain("title={isSigningOut ? 'Signing out...' : 'Sign out'}");
    expect(gate).toContain('First Settings session-action feedback cleanup on 2026-07-06 added a local sign-out pending guard, desktop `data-state="pending"` / `aria-busy` feedback, duplicate-tap blocking, and a mobile `Signing out...` row state while preserving the same `signOut()` receiver and `/login` redirect.');
    expect(gate).toContain('Settings desktop-shell squircle cleanup on 2026-07-06 converted `SettingsPage.jsx` away from legacy `Card` wrappers, decorative blur/orb background chrome, hover-glow layers, legacy `squircle-*` size aliases, generic radius utilities, decorative border/ring chrome, and all-caps/tracking labels.');
    expect(gate).toContain('This gives the desktop Settings shell focused strict-radius source proof only; it does not admit Settings, prove own-user profile/security/preferences/provider receivers, or add Page 16 to the default hardgate.');
    expect(desktop).not.toContain("from '../ui/card'");
    expect(desktop).not.toContain('<Card');
    expect(desktop).not.toContain('hover-glow');
    expect(desktop).not.toContain('blur-3xl');
    expect(workspace).toContain('rounded-card');
    expect(workspace).toContain('rounded-inner');
    expect(workspace).toContain('rounded-icon');
    expect(workspace).toContain('rounded-button');
    expect(desktop).toContain('rounded-pill');
    expect(workspace).toContain('<Avatar className="h-16 w-16 shrink-0 rounded-icon');
    expect(workspace).toContain('<AvatarFallback className="rounded-icon');
    expect(desktop).not.toContain('className="squircle');
    expect(desktop).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|md|sm|full|\[[^\]]+\])\b/);
    expect(desktop).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(desktop).not.toMatch(/\bgeo-/);
    expect(desktop).not.toMatch(/\bborder-/);
    expect(desktop).not.toMatch(/\bring-/);
    expect(desktop).not.toMatch(/\boutline-/);
    expect(desktop).not.toMatch(/\buppercase\b/);
    expect(desktop).not.toContain('tracking-widest');

    expect(oldMobile).toContain('MobilePageShell');
    expect(oldMobile).toContain('MobileMetricRow');
    expect(oldMobile).toContain('label="Account"');
    expect(oldMobile).toContain('label="Preferences"');
    expect(oldMobile).toContain('label="Security"');
    expect(oldMobile).toContain('Dark Mode');
    expect(oldMobile).toContain('Change Password');
    expect(oldMobile).toContain('Help Center');
    expect(oldMobile).toContain('Professional Profile');
    expect(oldMobile).toContain('Sign Out');
    expect(oldMobile).toContain("label=\"PROFILE\"");
    expect(oldMobile).toContain("label=\"EMAIL\"");
    expect(oldMobile).toContain("label=\"PHONE\"");
    expect(oldMobile).toContain("badge: 'BOUND'");
    expect(oldMobile).toContain("badge: profile?.phone ? 'VERIFIED' : 'MISSING'");
    expect(oldMobile).toContain("badge: 'EXIT'");
    expect(mobile).toContain('const SettingsSkeleton = () =>');
    expect(mobile).toContain('const ActionRow = ({');
    expect(mobile).toContain('const InfoRow = ({ icon: Icon, title, value, toneClass }) =>');
    expect(mobile).toContain('<Section label="Account">');
    expect(mobile).toContain('<Section label="Preferences">');
    expect(mobile).toContain('<Section label="Security and help">');
    expect(mobile).toContain('<Section label="Session">');
    expect(mobile).toContain('title="Edit profile"');
    expect(mobile).toContain('Dark mode');
    expect(mobile).toContain('title="Password and authentication"');
    expect(mobile).toContain('title="Support"');
    expect(mobile).toContain('title="Professional profile"');
    expect(mobile).toContain('Identity verified');
    expect(mobile).not.toContain("profile?.phone ? 'Verified' : 'Missing'");
    expect(mobile).toContain('rounded-card');
    expect(mobile).toContain('rounded-inner');
    expect(mobile).toContain('rounded-icon');
    expect(mobile).toContain('rounded-pill');
    expect(mobile).not.toMatch(/(?:h-(\d+) w-\1(?=\s)|w-(\d+) h-\2(?=\s))[^"']*rounded-(?:pill|full)\b/);
    expect(mobile).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|md|sm|full|\[[^\]]+\])\b/);
    expect(mobile).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(mobile).not.toMatch(/\bgeo-/);
    expect(mobile).not.toMatch(/\bborder-/);
    expect(mobile).not.toMatch(/\bring-/);
    expect(mobile).not.toMatch(/\boutline-/);
    expect(mobile).not.toMatch(/\buppercase\b/);
    expect(mobile).not.toMatch(/\btracking-/);
    expect(mobile).not.toContain('VIEWER');
    expect(mobile).not.toContain("label=\"PROFILE\"");
    expect(mobile).not.toContain("badge: 'WAIT'");
    expect(mobile).not.toContain("badge: 'EXIT'");
    expect(mobile).toContain('isSigningOut = false');
    expect(mobile).toContain("title={isSigningOut ? 'Signing out' : 'Sign out'}");
    expect(mobile).toContain('pending={isSigningOut}');
    expect(mobile).toContain("data-state={pending ? 'pending' : 'idle'}");
    expect(mobile).toContain('aria-busy={pending}');
    expect(gate).toContain('The session row now accepts the Settings-owned sign-out pending state, removes the row click while pending, and shows a `Wait` status blade until the auth receiver resolves.');
    expect(gate).toContain('MobileSettings squircle/voice cleanup on 2026-07-06 converted the local identity/loading cards, avatar/display-id surfaces, role/BVN badges, theme row, and Settings-owned row labels/blades to semantic `rounded-card`, `rounded-inner`, `rounded-icon`, and `rounded-pill` tokens plus plain labels while preserving the same `MobileMetricRow` actions, Support handoff, provider profile trigger, app-local theme toggle, and sign-out pending guard.');
    expect(gate).toContain('This gives `MobileSettings.jsx` focused strict-radius and mobile source-voice proof only; it does not admit Settings, prove preference persistence, or make shared `MobileMetricRow` typography canonical.');

    for (const source of [oldPanel]) {
      expect(source).toContain("label: 'Edit Profile'");
      expect(source).toContain("new Event('openProfileModal')");
      expect(source).toContain("label: 'Security'");
      expect(source).toContain("new Event('openSecurityModal')");
      expect(source).toContain("label: 'Billing'");
      expect(source).toContain("label: 'Help'");
      expect(source).toContain("new Event('openSupportModal')");
    }
    expect(panel).toContain("label: 'Edit profile'");
    expect(panel).toContain("dispatchAction('openProfileModal', 'Opening profile editor...')");
    expect(panel).toContain("label: 'Security'");
    expect(panel).toContain("dispatchAction('openSecurityModal', 'Opening security settings...')");
    expect(panel).toContain("label: 'Billing'");
    expect(panel).toContain("label: 'Support'");
    expect(panel).toContain("dispatchAction('openSupportModal', 'Opening support...')");
    expect(panel).toContain('window.dispatchEvent(new Event(eventName));');
    expect(oldPanel).toContain("toast.info('Billing portal coming soon')");
    expect(oldPanel).toContain('Security Health');
    expect(oldPanel).toContain('System Guard Active');
    expect(oldPanel).toContain('Verified & Secure');
    expect(oldPanel).toContain('Session Update');
    expect(panel).not.toContain("toast.info('Billing portal coming soon')");
    expect(panel).not.toContain('disabled: true');
    expect(panel).toContain("const [panelNotice, setPanelNotice] = React.useState('Choose an account action.');");
    expect(panel).toContain("const BILLING_UNAVAILABLE = 'Billing is not available for this account yet.';");
    expect(panel).toContain('unavailable: true');
    expect(panel).toContain('run: () => setPanelNotice(BILLING_UNAVAILABLE)');
    expect(panel).toContain("aria-disabled={unavailable ? 'true' : undefined}");
    expect(panel).toContain("data-state={unavailable ? 'unavailable' : 'ready'}");
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('Account details');
    expect(panel).toContain('Password and authentication');
    expect(panel).toContain('data-testid="settings-panel-skeleton"');
    expect(gate).toContain('SettingsPanel squircle cleanup on 2026-07-06 converted right-panel quick actions, security/session rows, and help notice to semantic radius tokens (`rounded-card`, `rounded-icon`, `rounded-inner`) while preserving profile/security/support event bridges, unavailable Billing feedback, and the local status live region.');
    expect(gate).toContain('This is focused strict-radius source proof only; it does not admit Settings or add Page 16 to the default hardgate.');
    expect(panel).toContain('rounded-card');
    expect(panel).not.toContain('rounded-modal');
    expect(panel).toContain('rounded-icon');
    expect(panel).toContain('rounded-inner');
    expect(panel).toContain('gap-2 rounded-button bg-background/45');
    expect(panel).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])\b/);
    expect(panel).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(panel).not.toMatch(/\bgeo-/);
    expect(panel).not.toContain('border-0');
    expect(panel).not.toContain('focus:ring');
    expect(panel).not.toContain('outline-none');
    expect(panel).not.toContain("from '../ui/card'");

    for (const source of [oldSecurityModal, securityModal]) {
      expect(source).toContain('supabase.auth.mfa.getAuthenticatorAssuranceLevel');
      expect(source).toContain('supabase.auth.mfa.enroll');
      expect(source).toContain('supabase.auth.mfa.challenge');
      expect(source).toContain('supabase.auth.mfa.verify');
      expect(source).toContain('supabase.auth.mfa.listFactors');
      expect(source).toContain('supabase.auth.mfa.unenroll');
      expect(source).toContain('updatePassword(passwords.password)');
      expect(source).toContain('AnimatePresence');
      expect(source).toContain('role="dialog"');
    }
    expect(oldSecurityModal).toContain('Two-Factor Authentication Enabled!');
    expect(oldSecurityModal).toContain('2FA Disabled');
    expect(oldSecurityModal).toContain('Secret: {enrollData.totp.secret}');
    expect(oldSecurityModal).toContain("console.error('Error updating password:', error)");
    expect(securityModal).not.toContain('console.error');
    expect(securityModal).not.toContain('setError(err.message)');
    expect(securityModal).toContain("handleAuthError(error, 'update')");
    expect(securityModal).toContain('placeholder="********"');
    expect(securityModal).not.toMatch(/[\u2022]/);
    expect(securityModal).toContain('const MFA_ERROR_COPY = {');
    expect(securityModal).toContain("setup: 'Authenticator setup could not start. Try again.'");
    expect(securityModal).toContain("verify: 'Verification failed. Check the code and try again.'");
    expect(securityModal).toContain("setError(MFA_ERROR_COPY.setup)");
    expect(securityModal).toContain("setError(MFA_ERROR_COPY.verify)");
    expect(securityModal).toContain('const getTotpFactor = (factors) => {');
    expect(securityModal).toContain("factor?.factorType === 'totp' || factor?.factor_type === 'totp'");
    expect(securityModal).toContain("toast.success('Two-factor authentication enabled.')");
    expect(securityModal).toContain("toast.success('Two-factor authentication disabled.')");
    expect(securityModal).toContain('Setup key: {enrollData.totp.secret}');
    expect(securityModal).toContain("setVerifyCode(e.target.value.replace(/\\D/g, '').slice(0, 6))");
    expect(securityModal).toContain("data-state={isSetupPending ? 'pending' : 'ready'}");
    expect(securityModal).toContain("data-state={isDisablePending ? 'pending' : 'ready'}");
    expect(securityModal).toContain("data-state={isVerifyPending ? 'pending' : isVerificationReady ? 'ready' : 'disabled'}");
    expect(securityModal).toContain("data-state={loading ? 'pending' : 'ready'}");
    expect(securityModal).toContain("aria-busy={loading ? 'true' : undefined}");
    expect(securityModal).toContain('rounded-modal');
    expect(securityModal).toContain('rounded-inner');
    expect(securityModal).toContain('rounded-icon');
    expect(securityModal).toContain('rounded-button');
    expect(securityModal).toContain('rounded-pill');
    expect(securityModal).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])\b/);
    expect(securityModal).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(securityModal).not.toMatch(/\bgeo-/);
    expect(securityModal).not.toContain('border-0');
    expect(securityModal).not.toMatch(/\bborder-/);
    expect(securityModal).not.toMatch(/\bring-/);
    expect(securityModal).not.toContain('h-px');
    expect(securityModal).not.toContain('w-px');

    for (const source of [oldProfileModal, profileModal]) {
      expect(source).toContain('updateProfile({');
      expect(source).toContain("toast.success('Profile updated successfully')");
      expect(source).toContain('avatar-upload');
      expect(source).toContain('Tap to change photo');
      expect(source).toContain('Save Changes');
      expect(source).toContain('AnimatePresence');
      expect(source).toContain('role="dialog"');
    }
    expect(oldProfileModal).toContain('uploadAvatar(file)');
    expect(oldProfileModal).toContain("toast.success('Image uploaded successfully')");
    expect(oldProfileModal).toContain("console.error('Error uploading image:', error)");
    expect(oldProfileModal).toContain('console.error(error)');
    expect(profileModal).not.toContain('console.error');
    expect(profileModal).not.toContain("toast.success('Image uploaded successfully')");
    expect(profileModal).toContain('const nextPreviewUrl = URL.createObjectURL(file);');
    expect(profileModal).toContain('URL.revokeObjectURL(avatarPreviewUrlRef.current);');
    expect(profileModal).toContain('uploadedAvatar = await uploadAvatar(selectedAvatarFile);');
    expect(profileModal).toContain('await discardAvatarUpload(uploadedAvatar);');
    expect(profileModal).toContain("toast.error('The photo was not saved, and cleanup could not be confirmed.');");
    expect(profileModal).toContain("handleApiError(error, 'update')");
    expect(profileModal).toContain('const file = event.target.files?.[0];');
    expect(profileModal).toContain('if (!file) return;');
    expect(profileModal).toContain('role="status" aria-live="polite"');
    expect(profileModal).toContain('Photo selected. Save to apply it.');
    expect(profileModal).toContain("data-state={selectedAvatarFile ? 'selected' : 'ready'}");
    expect(profileModal).toContain("data-state={loading ? 'blocked' : 'ready'}");
    expect(profileModal).toContain("data-state={loading ? 'pending' : 'ready'}");
    expect(profileModal).toContain("aria-busy={loading ? 'true' : undefined}");
    expect(profileModal).toContain('Saving...');
    expect(profileModal).toContain('rounded-modal');
    expect(profileModal).toContain('rounded-card');
    expect(profileModal).toContain('rounded-inner');
    expect(profileModal).toContain('rounded-button');
    expect(profileModal).toContain('rounded-pill');
    expect(profileModal).not.toMatch(/\brounded-(?:3xl|2xl|xl|lg|full|\[[^\]]+\])\b/);
    expect(profileModal).not.toMatch(/\bsquircle-(?:3xl|2xl|xl|lg|md|sm|xs)\b/);
    expect(profileModal).not.toMatch(/\bgeo-/);
    expect(profileModal).not.toContain('border-0');
    expect(profileModal).not.toMatch(/\bborder-/);
    expect(profileModal).not.toMatch(/\bring-/);
    expect(profileModal).not.toContain('h-px');
    expect(profileModal).not.toContain('w-px');

    for (const source of [oldSupportModal, supportModal]) {
      expect(source).toContain('createSupportTicket({');
      expect(source).toContain("status: 'open'");
      expect(source).toContain("category: 'general'");
      expect(source).toContain("priority: 'normal'");
      expect(source).toContain('Support ticket created!');
      expect(source).toContain('Help & Support');
      expect(source).toContain('Email Updates');
      expect(source).toContain('Send Request');
      expect(source).toContain('AnimatePresence');
      expect(source).toContain('role="dialog"');
    }

    for (const source of [oldDoctorCard, doctorCard]) {
      expect(source).toContain('updateProfile(formData)');
      expect(source).toContain('Professional Profile Inactive');
      expect(source).toContain('Contact Support');
      expect(source).toContain("new CustomEvent('openDoctorModal')");
      expect(source).toContain('Edit Details');
      expect(source).toContain('Consultation Fee');
      expect(source).toContain('Availability Status');
      expect(source).toContain('Toggle to appear in search results');
      expect(source).toContain('Bio / About');
    }

    for (const source of [oldDoctorHook, doctorHook]) {
      expect(source).toContain('getDoctorByProfileId(user.id)');
    }
    expect(oldDoctorHook).toContain('updateDoctor(doctorProfile.id, updates)');
    expect(oldDoctorHook).toContain("toast.success('Professional profile updated successfully')");
    expect(oldDoctorHook).toContain("console.error('Error loading doctor profile', error)");
    expect(oldDoctorHook).toContain('console.error(error)');
    expect(doctorHook).not.toContain('console.error');
    expect(doctorHook).not.toContain('updateDoctor(');
    expect(doctorHook).toContain("error.code = 'DOCTOR_PROFILE_WRITE_UNAVAILABLE';");
    expect(doctorHook).toContain("toast.info('Professional directory editing is not available here.')");
    expect(doctorHook).toContain('throw error');
    expect(gate).toContain('Settings diagnostic hygiene cleanup on 2026-07-06 removed raw browser `console.error` diagnostics from profile image upload/profile save failures, password update failures, and provider-profile load/update failures, and changed the password placeholders in `SecurityModal.jsx` to ASCII `********`.');
    expect(gate).toContain('User-facing failure feedback remains through existing toast/error handlers, but this is redaction/copy hygiene only; it does not prove the profile, security, or provider-profile receivers as final Settings authority.');
    expect(gate).toContain('Settings profile-modal feedback cleanup on 2026-07-06 converted `ProfileEditModal.jsx` to focused strict-radius squircle tokens, removed decorative border/ring/hairline chrome, avoided entering upload pending state when no file is selected, added visible upload status, and added cancel/save `data-state` plus save `aria-busy` feedback while preserving `uploadAvatar(file)`, `updateProfile()`, and the existing success/error handlers.');
    expect(gate).toContain('This gives `ProfileEditModal.jsx` focused strict-radius and upload/save feedback source proof only; it does not prove editable profile fields, avatar Storage policy, media fallback policy, reflected-read state, or shared `ModalShell` admission.');
    expect(gate).toContain('Settings security-modal feedback cleanup on 2026-07-06 replaced raw MFA UI errors with redacted user-facing messages, added pending/disabled `data-state` and `aria-busy` feedback for setup, verify, disable, and password update actions, normalized six-digit verification input, made TOTP factor lookup tolerant of Supabase factor-list shapes, and converted the private modal source to focused strict-radius squircle tokens.');
    expect(gate).toContain('This gives `SecurityModal.jsx` focused strict-radius and interaction-feedback source proof only; it does not prove the own-user Auth adapter, secret-display policy, rendered recovery states, or shared `ModalShell` admission.');
  });

  it('blocks Settings canon reuse until profile, security, preference, billing, support, provider, and shell slots close', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const pass4 = read('docs/implementation/console-service-alignment/passes/PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md');
    const pass8 = read('docs/implementation/console-service-alignment/passes/PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md');
    const stage5 = read('docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md');
    const contextPanel = read('src/components/navigation/ContextPanel.jsx');
    const page = read('src/components/pages/SettingsPage.jsx');
    const app = read('src/App.js');
    const routes = read('src/config/routes.jsx');
    const navigation = read('src/config/navigation.js');
    const contextFab = read('src/components/navigation/ContextAwareFAB.jsx');
    const bottomBar = [
      read('src/components/navigation/DynamicBottomBar.jsx'),
      read('src/config/mobileRouteActions.js'),
    ].join('\n');

    expect(gate).toContain('Settings Requests-canon blocker map:');
    expect(gate).toContain('This is a blocker map, not a design target.');
    expect(gate).toContain('Data ownership: not admitted. Settings currently mixes AuthContext profile/session truth');
    expect(gate).toContain('RBAC and shell: partially aligned, not admitted. The route, account nav, mobile settings entry, and `ContextPanel.jsx` now treat `/settings` as an own-user surface instead of admin-only.');
    expect(gate).toContain('Security/password/MFA: intake only. Direct Supabase Auth SDK operations are not admin authority.');
    expect(gate).toContain('Raw profile/avatar browser diagnostics have a first redaction cleanup and the modal has focused upload/save pending-state proof, but the receiver and media policy are still unproved.');
    expect(gate).toContain('Password-update browser diagnostics and raw MFA UI errors have first redaction cleanups, and the modal has focused pending-state proof, but the Auth adapter remains unproved.');
    expect(gate).toContain('The first preference cleanup routes the active dark-mode switch through the shared `ThemeProvider` instead of a page-owned `document.documentElement.classList` mutation');
    expect(gate).toContain('Preferences/notifications: blocked. The dark-mode toggle now uses the app `ThemeProvider` instead of page-owned DOM mutation');
    expect(gate).toContain('The original route/nav/panel mismatch treated `/settings` as admin context');
    expect(gate).toContain('The first shell alignment cleanup now treats `/settings` as an own-user context panel');
    expect(gate).toContain('The first billing truth cleanup replaced active desktop `Free Tier` plan copy with `Plan unavailable` / `Billing source not verified`.');
    expect(gate).toContain('Billing/account plan: blocked. Static `Free Tier` and `Upgrade` are preserved as old inventory only; active desktop Settings now renders `Plan unavailable` / `Billing source not verified`');
    expect(gate).toContain('the Settings panel Billing quick action gives unavailable status feedback until a billing receiver exists.');
    expect(gate).toContain('Provider profile: blocked. Provider doctor bio, fee, availability, and status writes belong to Pass 5 provider operations');
    expect(gate).toContain('Support shortcut: partially aligned. Active Settings no longer imports or renders private `SupportModal`');
    expect(gate).toContain('the Help/Support affordance now hands off to `/support-tickets?add=true&from=settings`');
    expect(gate).toContain('non-support roles receive immediate unavailable feedback');
    expect(gate).toContain('Global actions: partially aligned, not admitted. `ContextAwareFAB.jsx` suppresses the generic desktop action on `/settings`, while `DynamicBottomBar.jsx` now supplies one route-owned mobile `Security` FAB');
    expect(gate).toContain('Keep `Free Tier`, `Upgrade`, and Billing portal copy out of active Settings unless user-scoped billing/subscription truth is proved');
    expect(gate).toContain('| Route-owned action | Profile edit, security, support handoff, provider profile, sign out, Billing, and `?quick=true` can all be visible; Billing is unavailable with local feedback pending receiver proof');
    expect(gate).toContain('sign out has local pending feedback and duplicate-tap blocking');
    expect(gate).toContain('| Interaction feedback | Sign out now acknowledges pending desktop/mobile state and blocks duplicate taps; `SecurityModal` has focused setup/verify/disable/password pending-state proof; `ProfileEditModal` has focused upload/save pending-state proof; support submit, theme toggle, provider update, rendered profile/avatar recovery states, and rendered security recovery states still need complete immediate feedback and reflected state proof.');
    expect(gate).toContain('| Data quieting | Auth/profile/display-id reads, Auth SDK actions, support handoff, doctor update, context-panel events, and ThemeProvider-owned local theme state coexist. PageData startup and generic floating actions are quieted on `/settings`; the mobile dock action is namespaced to the existing security event.');

    expect(pass4).toContain('own-user `/settings` is also route-visible from `viewer` while its panel is admin-only');
    expect(pass4).toContain('MobileSettings` is a mounted own-user identity surface for every settings actor.');
    expect(pass4).toContain('SettingsPage` actively mounts `SecurityModal`, which invokes Supabase Auth MFA enrollment/challenge/verification/unenrollment and password change as own-user Auth operations.');
    expect(pass4).toContain('Own-user security settings');
    expect(pass4).toContain('Auth hard-coded admin elevation');
    expect(pass4).toContain('Auth fallback elevated role');
    expect(pass4).toContain('Settings avatar load/failure can log email/profile/user/avatar URL');
    expect(pass4).toContain('External avatar fallback');

    expect(stage5).toContain('Signed-in email/profile flow messages, selected user object and resolved avatar media URL on image load/failure.');
    expect(stage5).toContain('Provider settings mounts a professional card that reads the current provider\'s doctor row');
    expect(stage5).toContain('Live route and navigation allow `viewer`; `ContextPanel` suppresses settings context unless `admin`.');
    expect(stage5).toContain('Desktop `SettingsPage` renders static `Free Tier` copy and an `Upgrade` button with no receiver');
    expect(stage5).toContain('Console settings may own the signed-in operator\'s notification preference');
    expect(stage5).toContain('`demo_mode_enabled` and medical/contact sharing remain patient-app behavior and consent lanes');

    expect(pass8).toContain('SettingsPage` renders a notification switch with `checked={true}` and no preference receiver');
    expect(pass8).toContain('Desktop `SettingsPage` also renders a static `Free Tier` plan and an `Upgrade` button with no receiver');
    expect(pass8).toContain('Settings Billing quick action and dormant PDF export');
    expect(pass8).toContain('Settings plan/upgrade claim');
    expect(pass8).toContain('| Edit settings | Own-user CRUD subset | `preferences` | Only signed-in operator settings; no patient consent/demo substitution. |');
    expect(pass8).toContain('| Open Billing from settings | Unavailable action pending receiver | No billing-portal or scoped finance-navigation receiver is proved in `SettingsPanel` |');
    expect(pass8).toContain('| View or upgrade own plan from settings | Unavailable until lifecycle owner exists | Pass 7 subscriber/billing authority plus Pass 2 finance destination if applicable |');

    expect(routeOwnsStartupDomains('/settings')).toBe(true);
    expect(app).toContain('<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />');
    expect(routes).toContain("'/settings': {");
    expect(routes).toContain("minRole: 'viewer'");
    expect(navigation).toContain("minRole: 'viewer'");
    expect(contextPanel).toContain("'/settings': true, // Own-user settings");
    expect(contextPanel).not.toContain('getPageContextHeader'); // header slimmed -- each panel owns its heading (see ContextPanelShell contract)
    expect(contextPanel).toContain('<SettingsPanel settingsContext={settingsRouteContext} />');
    expect(contextPanel).toContain("new CustomEvent('requestSettingsRouteContext')");
    expect(page).toContain("new CustomEvent('settingsRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestSettingsRouteContext'");
    expect(routeOwnsShellAction('/settings')).toBe(true);
    expect(bottomBar).toContain("pathname.startsWith('/settings') && canReach('/settings')");
    expect(bottomBar).toContain("label: 'Security'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openSecurityModal')");
    expect(contextFab).toContain('routeOwnsShellAction(location.pathname)');
  });

  it('uses the desktop workspace grammar with a complete role rail and structural loading state', () => {
    const page = read('src/components/pages/SettingsPage.jsx');
    const workspace = read('src/components/pages/settings/SettingsDesktopWorkspace.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(page).toContain("import { SettingsDesktopWorkspace } from './settings/SettingsDesktopWorkspace';");
    expect(page).toContain('getConsoleModuleRailItems(roleKind)');
    expect(page).toContain("if (isAdmin()) return 'admin';");
    expect(page).toContain("if (isOrgAdmin()) return 'org_admin';");
    expect(page).toContain("if (isSponsor()) return 'sponsor';");
    expect(page).toContain("if (providerAccount) return isDriver() ? 'driver' : 'provider';");
    expect(page).toContain('<SettingsDesktopWorkspace');
    expect(page).toContain('moduleRailItems={moduleRailItems}');
    expect(page).toContain("usePageHeader('Settings', headerActions)");
    expect(page).toContain('aria-haspopup="dialog"');
    expect(page).toContain('aria-expanded={isProfileModalOpen}');
    expect(page).toContain("data-state={isProfileModalOpen ? 'open' : 'idle'}");
    expect(page).toContain('Edit profile');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true })');

    expect(workspace).toContain('<WorkspaceStage');
    expect(workspace).toContain('activePath="/settings"');
    expect(workspace).toContain('<SignalPanel');
    expect(workspace).toContain('<MetricStrip items={metrics} loading={loading} max={3}');
    expect(workspace).toContain('data-testid="settings-account-sheet"');
    expect(workspace).toContain('<DetailRailShell>');
    expect(workspace).toContain('<RailInsetHero>');
    expect(workspace).toContain('data-testid="settings-sheet-skeleton"');
    expect(workspace).toContain('data-testid="settings-detail-rail-skeleton"');
    expect(workspace).toContain('<SettingsSheetSkeleton rowCount={isProvider ? 7 : 6} />');
    expect(workspace).toContain('<Shimmer className="mt-5 h-40 rounded-modal" />');

    expect(page).not.toContain('DoctorProfileCard');
    expect(workspace).not.toContain('DoctorProfileCard');
    expect((page.match(/useDoctorProfile\(\)/g) || [])).toHaveLength(1);
    expect(page).toContain('doctor={doctorProfile}');
    expect(page).toContain('mode="view"');
    expect(workspace).not.toContain('updateProfile(');
    expect(workspace).not.toContain('updateDoctor(');
    expect(workspace).toContain('View professional profile');
    expect(hardgate).toContain('src/components/pages/settings/SettingsDesktopWorkspace.jsx');
  });

  it('keeps the desktop account dashboard calm and avoids inferred status claims', () => {
    const page = read('src/components/pages/SettingsPage.jsx');
    const workspace = read('src/components/pages/settings/SettingsDesktopWorkspace.jsx');
    const desktop = `${page}\n${workspace}`;

    expect(desktop).not.toContain("from 'framer-motion'");
    expect(desktop).not.toContain('<motion.div');
    expect(desktop).not.toContain('<LayoutGroup>');
    expect(desktop).not.toContain('bg-gradient-to-');
    expect(desktop).not.toContain('title="Online"');
    expect(desktop).not.toContain("? 'Strong' : 'Standard'");
    expect(desktop).not.toContain('phone && <Badge');
    expect(workspace).toContain('Review password and authentication options');
    expect(workspace).toContain('Plan unavailable');
    expect(workspace).toContain('Billing details are not available for this account yet.');
    expect(desktop).not.toContain('Billing source not verified');
    expect(desktop).not.toContain('Account evidence');
    expect(desktop).not.toContain('read-only');
  });
});
