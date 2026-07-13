import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';
import { getAccessibleNav } from '../../config/navigation';
import { getPageDataStartupDomainsForRole } from '../../config/pageDataAccess';
import { getProtectedRoutesForRole, getRouteProtection } from '../../config/routes';

describe('DoctorsPage Staff contract', () => {
  const readSources = (...paths) => paths
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  const pageSource = () => readSources(
    'src/components/pages/DoctorsPage.jsx',
    'src/components/pages/doctors/DoctorsPageView.jsx',
    'src/components/pages/doctors/StaffDesktopWorkspace.jsx',
    'src/components/pages/doctors/staffPageModel.js',
    'src/components/pages/doctors/useDoctorsPageChrome.js',
    'src/components/pages/doctors/useDoctorsPageController.js',
    'src/components/pages/doctors/useDoctorsRouteBridge.js'
  );
  const mobileSource = () => readSources(
    'src/components/mobile/MobileDoctors.jsx',
    'src/components/mobile/doctors/MobileDoctorsView.jsx',
    'src/components/mobile/doctors/mobileDoctorsModel.js',
    'src/components/mobile/doctors/useMobileDoctorsController.js'
  );
  const listSource = () => fs.readFileSync('src/components/views/DoctorListView.jsx', 'utf8');
  const tableSource = () => fs.readFileSync('src/components/views/DoctorTableView.jsx', 'utf8');
  const modalSource = () => fs.readFileSync('src/components/modals/DoctorModal.jsx', 'utf8');
  const panelSource = () => fs.readFileSync('src/components/context/DoctorsPanel.jsx', 'utf8');
  const contextPanelSource = () => fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
  const serviceSource = () => fs.readFileSync('src/services/doctorsService.js', 'utf8');
  const hookSource = () => fs.readFileSync('src/hooks/useDoctorsQuery.js', 'utf8');
  const fabSource = () => fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
  const bottomBarSource = () => [
    fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
    fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
  ].join('\n');
  const modalShellSource = () => fs.readFileSync('src/components/ui/ModalShell.jsx', 'utf8');
  const modalChromeHookSource = () => fs.readFileSync('src/hooks/useModalChromeSuppression.js', 'utf8');
  const smartHeaderSource = () => fs.readFileSync('src/components/navigation/SmartHeader.jsx', 'utf8');
  const routeSource = () => readSources(
    'src/app/AppRoutes.jsx',
    'src/app/appRouteMetadata.js'
  );
  const appChromeSource = () => fs.readFileSync('src/App.js', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');
  const gateSource = () => fs.readFileSync('docs/planning/PAGE_REVAMP_GATE.md', 'utf8');

  it('surfaces the provider directory as Staff while preserving the /doctors route contract', () => {
    expect(getRouteProtection('/doctors')).toEqual({
      minRole: 'org_admin',
      resource: 'doctors',
      title: 'Staff',
    });

    expect(getProtectedRoutesForRole('admin')).toContain('/doctors');
    expect(getProtectedRoutesForRole('org_admin')).toContain('/doctors');
    expect(getProtectedRoutesForRole('provider')).not.toContain('/doctors');
    expect(getProtectedRoutesForRole('sponsor')).not.toContain('/doctors');
    expect(getProtectedRoutesForRole('viewer')).not.toContain('/doctors');

    expect(getAccessibleNav({ role: 'org_admin' }).ops.items.find((item) => item.path === '/doctors')?.label)
      .toBe('Staff');

    const routes = routeSource();
    expect(routes).toContain("doctors: lazyNamedPage(() => import('../components/pages/DoctorsPage'), 'DoctorsPage')");
    expect(routes).toContain("{ id: 'doctors', path: '/doctors', minRole: 'org_admin' }");
  });

  it('keeps Staff route-owned so PageData and shell actions do not duplicate the page', () => {
    expect(getPageDataStartupDomainsForRole('org_admin', '/doctors')).toEqual([]);
    expect(getPageDataStartupDomainsForRole('admin', '/doctors')).toEqual([]);

    const fab = fabSource();
    const bottomBar = bottomBarSource();
    const contextPanel = contextPanelSource();
    const page = pageSource();

    expect(routeOwnsShellAction('/doctors')).toBe(true);
    expect(fab.indexOf('if (isMobile || isContextPanelOpen || hideFab) return null;'))
      .toBeLessThan(fab.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));

    expect(bottomBar).toContain('getRouteOwnedMobileAction(location.pathname, profile, pageAction, can)');
    expect(bottomBar).toContain("pathname.startsWith('/doctors')");
    expect(bottomBar).toContain("label: 'Add staff'");
    expect(bottomBar).toContain("color: 'staff'");
    expect(bottomBar).toContain("actionConfig.color === 'staff'");
    expect(bottomBar).toContain("action: dispatchWindowEvent('openDoctorModal')");
    expect(bottomBar.indexOf('RouteOwnedBottomAction'))
      .toBeLessThan(bottomBar.indexOf('const DynamicBottomAction'));
    expect(gateSource()).toContain('Staff right-panel route-context cleanup on 2026-07-06 moved `DoctorsPanel.jsx` off `PageDataContext` staff truth');
    expect(gateSource()).toContain('`ContextPanel.jsx` no longer passes `PageDataContext` `doctorsData` into the `/doctors` right panel.');
    expect(page).toContain('const staffPanelContext = useMemo(() => buildStaffPanelContext({');
    expect(page).toContain("window.dispatchEvent(new CustomEvent('doctorsRouteContextUpdated'");
    expect(page).toContain("window.addEventListener('requestDoctorsRouteContext', publishStaffRouteContext);");
    expect(contextPanel).toContain('const [doctorsRouteContext, setDoctorsRouteContext] = React.useState(null);');
    expect(contextPanel).toContain("window.addEventListener('doctorsRouteContextUpdated', handleDoctorsRouteContext);");
    expect(contextPanel).toContain("window.dispatchEvent(new CustomEvent('requestDoctorsRouteContext'));");
    expect(contextPanel).toContain('<DoctorsPanel staffContext={doctorsRouteContext} />');
    expect(contextPanel).not.toContain('<DoctorsPanel doctorsData={doctorsData} />');
  });

  it('wires Staff create/edit + selection while excluding destructive and unproved schedule controls', () => {
    const page = pageSource();
    const list = listSource();
    const table = tableSource();
    const mobile = mobileSource();
    const activeStaffSource = `${page}\n${list}\n${table}\n${mobile}`;

    expect(page).toContain('const canManageStaff = isAdmin() || isOrgAdmin();');
    expect(page).toContain('quiet: true');
    expect(page).toContain('resolveStaffStatusFilter(filters)');
    expect(page).toContain('limit: isMobile ? currentPage * itemsPerPage : itemsPerPage');
    expect(page).toContain('offset: isMobile ? 0 : offset');
    expect(page).toContain('stats: staffStats');
    expect(page).toContain('setTotalCount(count)');
    expect(page).toContain('filters.search,');
    expect(page).toContain('filters.kpiFilter,');
    expect(page).toContain('filters.created_at,');
    expect(page).toContain('sortConfig.key');
    expect(page).toContain('sortKey: sortConfig.key,');
    expect(page).not.toContain('}, [filters, isPrivileged');
    expect(page).not.toContain('limit: isPrivileged ? 1000');
    expect(page).not.toContain('filteredDoctors');
    expect(page).not.toContain('processedDoctors');
    expect(page).not.toContain('filtered.filter');
    expect(page).not.toContain('processedDoctors.slice');
    expect(page).toContain('if (!canManageStaff) return;');
    expect(page).toContain("usePageFooter(null, 'status', false);");
    expect(page).toContain('canManage={role.canManageStaff}');
    expect(gateSource()).toContain('Staff source-owner cleanup on 2026-07-04 moved desktop and mobile Staff filtering/counting/pagination');
    expect(gateSource()).toContain('Staff mobile projection cleanup on 2026-07-04 removed duplicate mobile search/KPI filtering');

    expect(list).toContain('canManage = false');
    expect(list).toContain('{canManage && (');
    expect(table).toContain('canManage = false');
    expect(table).toContain('{canManage && (');
    expect(mobile).toContain('canManage: canManageOverride');
    expect(mobile).toContain('const canManage = Boolean(canManageOverride');
    expect(mobile).toContain('const sourceDoctors = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);');
    expect(mobile).toContain('useStableList(sourceDoctors, loading)');
    expect(mobile).not.toContain('filteredDoctors');
    expect(mobile).not.toContain('let result = Array.isArray(doctors)');
    expect(mobile).not.toContain('result.filter');

    // Staff mobile detail is a tap-opens bottom sheet (MobileDetailSheet), not an inline
    // dropdown. One active-record state; the canon MobileListRow opens it via onOpen
    // (rebuilt to canon 2026-07-10; it was an inline MobileMetricRow onClick).
    expect(mobile).toContain('const [activeDoctor, setActiveDoctor] = useState(null);');
    expect(mobile).toContain('onOpen={setActiveDoctor}');
    expect(mobile).toContain('<MobileListRow');
    expect(mobile).toContain('<MobileDetailSheet');
    expect(mobile).toContain('isOpen={!!doctor}');
    expect(mobile).not.toContain('expandedContent');
    expect(mobile).not.toContain('onExpand');
    expect(mobile).not.toContain('expandedDoctorId');
    expect(mobile).not.toContain('MobileDetailIslands');
    expect(mobile).not.toContain('MobileSheetActions');

    // Selection stays mounted for non-destructive workflows, while the route has
    // no single or bulk destructive doctor action.
    expect(page).toContain("import { BulkActionBar } from '../../common/BulkActionBar';");
    expect(page).not.toContain('deleteDoctor');
    expect(page).not.toContain('applyOptimisticRemove');
    expect(page).not.toContain('ConfirmationModal');
    expect(page).not.toContain('confirmDelete');
    expect(page).not.toContain('handleBulkDelete');
    expect(page).not.toContain('onDelete=');
    // Selection is now the SHARED useRowSelection hook (gains shift-range + prune-to-
    // visible); the mobile surface consumes handleToggleSelect/handleSelectAll from it.
    expect(page).toContain('onSelect={selection.handleToggleSelect}');
    expect(page).toContain('onSelectAll={selection.handleSelectAll}');
    expect(page).toContain('selectionEnabled={role.canManageStaff}');
    expect(page).toContain('<BulkActionBar');

    // Legacy density components retain dormant props, but the mounted page/mobile
    // path does not pass or render destructive actions.
    expect(table).toContain('const canDeleteRow = canDelete && canManage && Boolean(onDelete)');
    expect(table).toContain('<Checkbox');
    expect(list).toContain('canDelete && onDelete && (');
    // Canon selection: the row is `selectable` (gated by canSelect) and toggles / long-
    // presses through the SHARED onSelect; the old MobileMetricRow onSelect prop is retired.
    expect(mobile).toContain('const canSelect = selectionEnabled && canManage && Boolean(onSelect);');
    expect(mobile).toContain('selectable={canSelect}');
    expect(mobile).toContain('onToggleSelect={(it) => onSelect?.(it.id');
    expect(mobile).toContain('<MobileSelectionBar');
    expect(mobile).not.toContain('canBulkDelete');
    expect(mobile).not.toContain('onBulkDelete');
    expect(mobile).not.toContain('canDelete');
    expect(mobile).not.toContain('onDelete');
    expect(mobile).not.toContain('Trash2');
    expect(page).toContain("staff?.is_available === false ? 'unavailable' : status");
    expect(mobile).toContain("doctor?.is_available === false ? 'unavailable' : status");
    expect(mobile).toContain("statusPill('off_duty', 'Unavailable for assignment')");

    // Scheduling stays unproved for Staff; destructive copy is separately excluded
    // from the mounted page/mobile source below.
    [
      'Remove selected',
      'Remove staff',
      'aria-label={`Remove',
      'onSchedule',
      'CalendarDays',
      'aria-label={`Schedule',
    ].forEach((blockedTerm) => {
      expect(activeStaffSource).not.toContain(blockedTerm);
    });

    ['Delete selected', 'Delete staff', 'Delete staff member'].forEach((blockedTerm) => {
      expect(`${page}\n${mobile}`).not.toContain(blockedTerm);
    });

    expect(page).not.toContain('clinical availability');
  });

  it('is composed on the console design system, not the retired ViewToggle/bento shell', () => {
    const page = pageSource();
    // COMPOSITION: the shared workspace grammar, not bespoke StaffSignalPanel/StaffStateStrip/StaffDetailRail.
    expect(page).toContain("from '../../console/WorkspaceStage'");
    expect(page).toContain("import { SignalPanel } from '../../console/SignalPanel';");
    expect(page).toContain("import { KpiStrip } from '../../console/KpiStrip';");
    expect(page).toContain("from '../../console/ActivitySheet'");
    expect(page).toContain('<WorkspaceStage');
    expect(page).toContain('<SignalPanel');
    expect(page).toContain('<KpiStrip');
    expect(page).toContain('<ActivitySheet');
    expect(page).toContain('usePageShell({ bleed: true, hideFab: true });');
    // Shared MECHANISMS (not reinvented inline): selection prune, keyboard nav, scroll
    // reset, auto-select, arrival toast, deep-link, isFetching surfaced.
    expect(page).toContain("from '../../../hooks/useRowSelection'");
    expect(page).toContain('useRowSelection(staffRows)');
    expect(page).toContain("useFocusedRecord('doctors', staffRows)");
    expect(page).toContain('useListKeyboardNav');
    expect(page).toContain('useScrollResetOnPage');
    expect(page).toContain('isFetching={isFetching}');
    expect(page).toContain('lastInsertToastAtRef');
    expect(page).toContain('location.search');
    // Single-shared-list: exactly ONE Time header; the retired density shell is gone.
    expect((page.match(/<SortableColumnHeader/g) || []).length).toBe(1);
    expect(page).not.toContain('ViewToggle');
    expect(page).not.toContain('useViewMode');
    expect(page).not.toContain('<DoctorListView');
    expect(page).not.toContain('<DoctorTableView');
    expect(page).not.toContain('StaffSignalPanel');
    expect(page).not.toContain('StaffStateStrip');
    // No re-introduced entrance stagger; no colored bleeding shadow glow.
    expect(page).not.toContain('initial={{');
    expect({ rgba: /shadow-\[[^\]]*rgba?\(/.test(page) }).toEqual({ rgba: false });
    // DATA-TRUTH (live-DB check 2026-07-10): status handling tolerates the real 'invited'
    // state and does NOT default unknown statuses to 'available' (the masquerade bug).
    expect(page).toContain('invited: {');
    expect(page).not.toContain('|| staffStatusMeta.available');
  });

  it('records the data-verified persona exclusion (no schema-first driver split)', () => {
    const page = pageSource();
    // Live-DB check (2026-07-10): 322/322 doctors are provider_type='doctor', zero
    // drivers/paramedics, and specialization is monovalue (321 Emergency / 1 General).
    // So NO driver/persona KPI is data-backed -- do not join provider_type or invent a
    // Role chip. The honest axis is availability + specialization (subtitle).
    expect(page).not.toContain('provider_type');
    expect(page).not.toContain("'driver'");
    expect(page).not.toContain('Paramedic');
  });

  it('removes stale Staff mobile trend and Doctor-facing copy from the active surface', () => {
    const page = pageSource();
    const mobile = mobileSource();
    const activeStaffSource = `${page}\n${mobile}`;

    expect(activeStaffSource).toContain("'Staff'");
    expect(activeStaffSource).toContain('Search staff');
    expect(activeStaffSource).toContain('No staff yet');
    expect(activeStaffSource).not.toContain('Medical Staff');
    expect(activeStaffSource).not.toContain('ADD DOCTOR');
    expect(activeStaffSource).not.toContain('Search doctors');
    expect(activeStaffSource).not.toContain('Staff Velocity');
    expect(activeStaffSource).not.toContain('Clinical Readiness');
    expect(activeStaffSource).not.toContain('Avg Rating');
    expect(activeStaffSource).not.toContain('ONLINE');
    expect(activeStaffSource).not.toContain('STANDBY');
    expect(activeStaffSource).not.toContain("'LIVE'");
    expect(activeStaffSource).not.toContain('growthData');
    // Canon LIST rebuild (2026-07-10): grouped panel + heading, no MobileMetricRow floating
    // cards, no metric rail / featured billboard (DASHBOARD furniture banned on a LIST page).
    expect(mobile).toContain('<MobileHeading');
    expect(mobile).toContain('<GroupPanel');
    expect(mobile).toContain('<SkeletonGroupPanel');
    expect(mobile).not.toContain('MobileMetricRow');
    expect(mobile).not.toContain('MobileSecondaryMetricRail');
    expect(mobile).not.toContain('MobileFeaturedMetric');
    expect(page).not.toContain('doctor - card');
    expect(page).not.toContain('geo - badge');
  });

  it('promotes Staff into the active visual hardgate', () => {
    const hardgate = hardgateSource();

    expect(hardgate).toContain('src/components/pages/DoctorsPage.jsx');
    expect(hardgate).toContain('src/components/mobile/MobileDoctors.jsx');
    expect(hardgate).toContain('src/components/context/DoctorsPanel.jsx');
    expect(hardgate).toContain('src/components/views/DoctorListView.jsx');
    expect(hardgate).toContain('src/components/views/DoctorTableView.jsx');
    expect(hardgate).toContain('src/components/modals/DoctorModal.jsx');
  });

  it('keeps the Staff context panel route-owned and hardgate-clean', () => {
    const panel = panelSource();

    expect(panel).toContain('export const DoctorsPanel = ({ staffContext }) =>');
    expect(panel).toContain("const [panelNotice, setPanelNotice] = React.useState('Staff actions ready.');");
    expect(panel).toContain('Staff overview');
    expect(panel).toContain('Current route scope');
    expect(panel).toContain('Panel actions');
    expect(panel).toContain('Current list');
    expect(panel).toContain('No staff in the current view.');
    expect(panel).toContain('role="status"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('title="View staff statistics"');
    expect(panel).toContain('title="Filter staff"');
    expect(panel).not.toContain('doctorsData');
    expect(panel).not.toContain('Active Faculty');
    expect(panel).not.toContain('Recent Roster');
    expect(panel).not.toContain('Clinical Staff');
    expect(panel).not.toContain('border');
    expect(panel).not.toContain('ring');
    expect(panel).not.toContain('outline');
    expect(panel).not.toContain('divide');
  });

  it('keeps the Staff modal inside proved directory CRUD boundaries', () => {
    const modal = modalSource();
    const service = serviceSource();
    const hook = hookSource();

    expect(modal).toContain("from '../../services/doctorsService';");
    expect(modal).toContain('filterDoctorFacilityOptions');
    expect(modal).toContain('assertDoctorWriteScope(payload, actorScope');
    expect(modal).toContain("import { getHospitals } from '../../services/hospitalsService';");
    expect(modal).toContain('if (!isOpen) return;');
    expect(modal).toContain('getHospitals({ quiet: true, limit: 500 })');
    expect(modal).toContain('toast.error(\'Select a facility first.\')');
    expect(modal).toContain('toast.success(\'Staff member added.\')');
    expect(modal).toContain('toast.success(\'Staff changes saved.\')');
    expect(modal).toContain('status: normalizeStaffDirectoryStatus(doctor?.status)');
    expect(modal).toContain("label: 'Invited'");
    expect(modal).toContain("label: 'Unavailable for assignment'");
    expect(modal).toContain('const isProfileLinked = Boolean(doctor?.profile_id);');
    expect(modal).toContain('buildStaffPayload(formData, { isCreate, isProfileLinked })');
    expect(modal).toContain('if (isCreate || !isProfileLinked)');
    expect(modal).not.toContain('payload.status');
    expect(modal).toContain('Synced from the linked account');
    expect(modal).not.toContain("updateField('status'");
    expect(modal).not.toContain('status: formData.status');
    expect(modal).toContain('Staff profile');
    expect(modal).toContain('Add staff');
    expect(modal).toContain('Save changes');

    expect(modal).not.toContain("supabase.from('hospitals')");
    expect(modal).not.toContain('getProfilesByRole');
    expect(modal).not.toContain('inviteUser');
    expect(modal).not.toContain('uploadImage');
    expect(modal).not.toContain('Send Invitation');
    expect(modal).not.toContain('Add Professional');
    expect(modal).not.toContain('Professional Profile');
    expect(modal).not.toContain('Medical Specialist');
    expect(modal).not.toContain('organization_id: submitData.hospital_id');
    expect(modal).not.toContain('profile.organization_id');
    expect(modal).not.toContain('\u00e2');

    expect(service).toContain('const DOCTOR_WORKFLOW_FIELDS = new Set([');
    expect(service).toContain("'rating',");
    expect(service).toContain("'reviews_count',");
    expect(service).toContain('assertDoctorWritableFields(input);');
    expect(service).not.toContain('rating: input.rating');
    expect(service).not.toContain('reviews_count: input.reviews_count');
    expect(service).toContain('async function getDoctorExactCount');
    expect(service).toContain('async function getDoctorPageStats');
    expect(service).toContain('applyDoctorFilters(query, user, filter)');
    expect(service).toContain('export function filterDoctorFacilityOptions');
    expect(service).toContain('export function assertDoctorWriteScope');
    expect(service).toContain("error.code = 'DOCTOR_SCOPE_DENIED';");
    expect(service).toContain('assertDoctorWriteScope(input, actor, { requireFacility: actor?.role === \'org_admin\' });');
    expect(service).toContain('assertDoctorWriteScope(input, actor);');
    expect(service).toContain("query.or(`name.ilike.%${search}%,specialization.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)");
    expect(service).toContain("query = query.gte('created_at'");
    expect(service).toContain("query = query.lte('created_at'");
    expect(service).toContain('const sortKey = DOCTOR_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : \'created_at\';');
    expect(service).toContain('return { data: rows, count: count || 0, stats };');
    expect(service).toContain("error.code = 'DOCTOR_RETIREMENT_UNAVAILABLE';");
    expect(service).not.toContain("query = query.ilike('name'");
    expect(hook).toContain('stats: query.data?.stats');
  });

  it('keeps the Staff modal above mobile app chrome', () => {
    const shell = modalShellSource();
    const chromeHook = modalChromeHookSource();
    const header = smartHeaderSource();
    const app = appChromeSource();

    expect(shell).toContain("import { useModalChromeSuppression } from '../../hooks/useModalChromeSuppression'");
    expect(shell).toContain('useModalChromeSuppression(isOpen);');
    expect(shell).not.toContain('document.querySelectorAll');
    expect(chromeHook).toContain("document.querySelectorAll('[data-modal-chrome=\"true\"], #dynamic-bottom-bar')");
    expect(chromeHook).toContain("node.setAttribute('aria-hidden', 'true')");
    expect(shell).toContain('z-[420]');
    expect(shell).toContain('backdrop-blur-sm');
    expect(header).toContain('data-modal-chrome="true"');
    expect(app).toContain('data-modal-chrome="true"');
    expect(app).not.toContain('z-[9999]');
  });
});
