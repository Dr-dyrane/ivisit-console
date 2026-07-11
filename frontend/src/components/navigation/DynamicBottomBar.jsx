import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { getMobileNavigationItems } from '../../config/mobileNavigation';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import {
    LayoutDashboard,
    Map,
    BarChart3,
    Calendar,
    AlertTriangle,
    Stethoscope,
    FileCheck,
    Settings,
    ClipboardCheck,
    Plus,
    Hospital,
    Ambulance,
    Wallet,
    ShieldCheck,
    Users,
    Building2,
    Newspaper,
    LifeBuoy,
    Filter,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    EmergencyRequestModal,
    UserModal,
    HospitalModal,
    AmbulanceModal,
    DoctorModal,
    VisitModal,
    SupportTicketModal,
    SubscriptionModal
} from '../modals/index';
import { useSubscription } from '../../hooks/useSubscription';
import { getProtectedRoutesForRole } from '../../config/routes';

// RBAC (2026-07-10): a `to:` FAB navigates to a route, so its role gate must be the
// SAME truth the route guard uses — derive it from getProtectedRoutesForRole, never a
// hand-kept role list that can drift out of sync with the route's minRole. A user who
// can't reach the destination must not see the FAB (no dead affordance).
const canReachRoute = (userRole, to = '') =>
  getProtectedRoutesForRole(userRole).includes(String(to).split('?')[0]);

export const DynamicBottomBar = () => {
    const { isMobile } = useNavigation();

    if (!isMobile) return null;

    return <DynamicBottomBarContent />;
};

const DynamicBottomBarContent = () => {
    const { isScrolledDown, pageShellConfig } = useLayout();
    const { profile } = useAuth();
    const location = useLocation();
    const userRole = profile?.role || 'viewer';
    const routeOwnsAction =
        location.pathname === '/' ||
        location.pathname.startsWith('/emergencies') ||
        location.pathname.startsWith('/visits') ||
        location.pathname.startsWith('/verification') ||
        location.pathname.startsWith('/doctors') ||
        location.pathname.startsWith('/hospitals') ||
        location.pathname.startsWith('/ambulances') ||
        location.pathname.startsWith('/health-news') ||
        location.pathname.startsWith('/support-tickets') ||
        location.pathname.startsWith('/insurance') ||
        location.pathname.startsWith('/organizations') ||
        location.pathname.startsWith('/subscriptions') ||
        location.pathname.startsWith('/map') ||
        location.pathname.startsWith('/wallet') ||
        location.pathname.startsWith('/pricing') ||
        location.pathname.startsWith('/settings');
    const hideContextFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction;
    // Route-owned actions may open a locally hosted modal (routeModal) instead of
    // dispatching a window event — pages like '/' have no modal listener mounted.
    // A `to` action navigates (SPA route change, not an anchor/full reload).
    const [routeModal, setRouteModal] = useState(null);
    const navigate = useNavigate();
    const routeOwnedActionConfig = getRouteOwnedMobileAction(location.pathname, userRole);
    const routeOwnedAction = routeOwnedActionConfig?.modal
        ? { ...routeOwnedActionConfig, action: () => setRouteModal(routeOwnedActionConfig.modal) }
        : routeOwnedActionConfig?.to
            ? { ...routeOwnedActionConfig, action: () => navigate(routeOwnedActionConfig.to) }
            : routeOwnedActionConfig;
    const showAnyAction = Boolean(routeOwnedAction) || !hideContextFab;

    // provider_type routes responder providers (driver/paramedic/ambulance) to the
    // driver slate; the current path lets the LAST slot morph into the current page
    // when off-slate (wayfinding rule, 2026-07-09).
    const navItems = getMobileNavigationItems(userRole, profile?.provider_type, location.pathname);
    const navIcons = {
        today: LayoutDashboard,
        emergencies: AlertTriangle,
        map: Map,
        approvals: FileCheck,
        staff: Stethoscope,
        statistics: BarChart3,
        settings: Settings,
        visits: Calendar,
        hospitals: Hospital,
        ambulances: Ambulance,
        payments: Wallet,
        insurance: ShieldCheck,
        users: Users,
        organizations: Building2,
        news: Newspaper,
        support: LifeBuoy,
    };

    return (
        <>
            <div
                id="dynamic-bottom-bar"
                className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none"
                style={{ bottom: 'calc(var(--safe-bottom, 0px) + 14px)' }}
            >
                <div className={`w-full px-4 flex items-center pointer-events-auto ${showAnyAction ? 'justify-between' : 'justify-center'}`}>
                    {/* CORE NAVIGATION PILL - Lucid Design */}
                    <motion.nav
                        initial={{ x: -50, opacity: 0 }}
                        animate={{
                            x: isScrolledDown ? -100 : 0,
                            opacity: isScrolledDown ? 0 : 1,
                        }}
                        className="flex items-center gap-1 rounded-pill chrome-glass-strong p-1"
                        aria-label="Primary mobile"
                    >
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = navIcons[item.id] || LayoutDashboard;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                    data-state={isActive ? 'active' : 'idle'}
                                    className="group"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.96 }}
                                        className={`w-10 h-10 rounded-button flex items-center justify-center transition-all duration-300 ${isActive
                                            ? 'bg-[hsl(var(--spark)/0.12)] text-[hsl(var(--spark)/0.92)]'
                                            : 'text-foreground/45 hover:text-foreground'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 transition-transform group-active:scale-90" />
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </motion.nav>

                    {routeOwnedAction ? (
                        <RouteOwnedBottomAction actionConfig={routeOwnedAction} isScrolledDown={isScrolledDown} />
                    ) : (
                        !hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />
                    )}
                </div>
            </div>

            {/* Locally hosted route-owned modal (same self-contained pattern as the
                context FAB's modals below) — keeps the '/' New-request tap honest. */}
            <AnimatePresence>
                {routeModal === 'emergency' && (
                    <EmergencyRequestModal isOpen onClose={() => setRouteModal(null)} />
                )}
            </AnimatePresence>
        </>
    );
};

const getRouteOwnedMobileAction = (pathname = '', userRole = 'viewer') => {
    // Today home: dock parity with /emergencies — same New-request quick action,
    // same roles. `modal` (not a window event) because the Requests page's
    // openEmergencyModal listener is not mounted on '/'.
    if (pathname === '/' && (userRole === 'admin' || userRole === 'org_admin')) {
        return {
            icon: Plus,
            label: 'New request',
            color: 'destructive',
            modal: 'emergency',
        };
    }

    if (pathname.startsWith('/emergencies') && (userRole === 'admin' || userRole === 'org_admin')) {
        return {
            icon: Plus,
            label: 'New request',
            color: 'destructive',
            action: () => window.dispatchEvent(new CustomEvent('openEmergencyModal'))
        };
    }

    // RBAC fix (2026-07-10 audit): /doctors is org_admin-scoped and staff CREATE is an
    // admin action, but this FAB had NO role gate — a lower role reaching /doctors would
    // get "Add staff". Gate it to match the route + create authority.
    if (pathname.startsWith('/doctors') && ['org_admin', 'admin'].includes(userRole)) {
        return {
            icon: Stethoscope,
            label: 'Add staff',
            color: 'staff',
            action: () => window.dispatchEvent(new CustomEvent('openDoctorModal'))
        };
    }

    if (pathname.startsWith('/visits') && ['provider', 'org_admin', 'admin'].includes(userRole)) {
        return {
            icon: Calendar,
            label: 'New visit',
            color: 'primary',
            action: () => window.dispatchEvent(new CustomEvent('openVisitModal'))
        };
    }

    // Hospitals (user arbitration 2026-07-09 #2: "make the FAB render something
    // practical and working"): the gated Add toast leaves the FAB; the route
    // action is now the domain's REAL adjacent write surface — the facility
    // approval queue (/verification, facilities tab preselected via ?queue=).
    // Approvals is absent from the dock on /hospitals (the 4th pill morphs to
    // the current page), so nothing duplicates. The honest create gate stays
    // reachable via the desktop header pill and the ?add=true deep link.
    // to:-FAB gate DERIVED from the destination route's RBAC (canReachRoute) — the same
    // truth the route guard uses, so the FAB can never drift out of sync with
    // /verification's minRole (RBAC audit 2026-07-10).
    if (pathname.startsWith('/hospitals') && canReachRoute(userRole, '/verification')) {
        return {
            icon: FileCheck,
            label: 'Facility approvals',
            color: 'staff',
            to: '/verification?queue=organizations',
        };
    }

    // Ambulances (user arbitration 2026-07-10): unit create is fail-closed, so — like
    // Hospitals — the FAB does the domain's REAL adjacent work. Data-sync-guided scope:
    // the ambulances page is about the FLEET, and the providers queue is role='provider'
    // (doctors + drivers), so the FAB scopes to provider_type='driver' via ?type=driver
    // — "Driver approvals" now shows DRIVERS, honest to the data. Non-duplicating (the
    // dock carries Map); gate derived from /verification RBAC.
    if (pathname.startsWith('/ambulances') && canReachRoute(userRole, '/verification')) {
        return {
            icon: FileCheck,
            label: 'Driver approvals',
            color: 'staff',
            to: '/verification?queue=providers&type=driver',
        };
    }

    if (pathname.startsWith('/support-tickets') && ['provider', 'org_admin', 'admin'].includes(userRole)) {
        return {
            icon: ClipboardCheck,
            label: 'New ticket',
            color: 'primary',
            action: () => window.dispatchEvent(new CustomEvent('openSupportTicketModal'))
        };
    }

    // Approvals (/verification): a REVIEW-only surface — there is no "create" here, so the
    // FAB can't mirror the New-request/New-visit siblings. Data-sync-guided action: the
    // approver's job is the PENDING subset, so the FAB filters the queue to pending (the
    // items awaiting a decision) — the one dock-level action that turns a long mixed queue
    // into the actionable list without scrolling back to the chips. Gate = canReachRoute
    // (org_admin+ = the REVIEW tier that can see the page); approval COMMANDS stay
    // admin-only inside the sheet. Dispatches to MobileVerification (the mounted mobile
    // surface owns the filter state), so the dock never couples to the desktop page file.
    // Without this branch /verification sits in routeOwnsAction with no action -> the dock
    // collapses to a lone centered pill (the Ambulances bug).
    if (pathname.startsWith('/verification') && canReachRoute(userRole, '/verification')) {
        return {
            icon: ShieldCheck,
            label: 'Review pending',
            color: 'staff',
            action: () => window.dispatchEvent(new CustomEvent('approvalsReviewPending'))
        };
    }

    // Users (/users): a directory with FAIL-CLOSED commands (invite/delete unproved), so the
    // FAB can't create. The data-driven action is FILTER — narrow an 800+ user directory by
    // role / verification / date. Gate = canReachRoute (org_admin+, the route's minRole).
    // Dispatches to MobileUsers (which owns the filter-sheet trigger), decoupled from the page.
    if (pathname.startsWith('/users') && canReachRoute(userRole, '/users')) {
        return {
            icon: Filter,
            label: 'Filter users',
            color: 'staff',
            action: () => window.dispatchEvent(new CustomEvent('openUsersFilter'))
        };
    }

    return null;
};

const RouteOwnedBottomAction = ({ actionConfig, isScrolledDown }) => {
    return (
        <motion.button
            initial={{ x: 50, opacity: 0 }}
            animate={{
                x: isScrolledDown ? 100 : 0,
                opacity: isScrolledDown ? 0 : 1,
            }}
            whileTap={{ scale: 0.96 }}
            onClick={actionConfig.action}
            className="w-12 h-12 flex items-center justify-center transition-all shadow-2xl relative overflow-hidden rounded-pill"
            style={{
                background: actionConfig.color === 'staff'
                    ? 'linear-gradient(135deg, rgb(56 189 248) 0%, rgb(14 165 233) 100%)'
                    : actionConfig.color === 'destructive'
                        ? 'linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive) / 0.86) 100%)'
                    : `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.86) 100%)`,
            }}
            aria-label={actionConfig.label || 'Open action'}
        >
            <actionConfig.icon className="w-6 h-6 text-white relative z-10" />
        </motion.button>
    );
};

const DynamicBottomAction = ({ isScrolledDown }) => {
    const [modalStates, setModalStates] = useState({
        emergency: false,
        user: false,
        hospital: false,
        ambulance: false,
        doctor: false,
        visit: false,
        supportTicket: false,
        subscription: false,
        emailActions: false
    });

    const openModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: true }));
    };

    const closeModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: false }));
    };

    const { createTicket } = useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true });
    const { createSubscriber } = useSubscription({ autoFetch: false, autoSubscribe: false });
    const actionConfig = useContextAction(openModal);

    const TICKET_PRIORITIES = [
        { value: 'low', label: 'Low', color: 'blue' },
        { value: 'normal', label: 'Normal', color: 'green' },
        { value: 'high', label: 'High', color: 'orange' },
        { value: 'urgent', label: 'Urgent', color: 'red' }
    ];

    const TICKET_CATEGORIES = [
        'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
    ];

    return (
        <>
            <motion.button
                initial={{ x: 50, opacity: 0 }}
                animate={{
                    x: isScrolledDown ? 100 : 0,
                    opacity: isScrolledDown ? 0 : 1,
                }}
                whileTap={{ scale: 0.95 }}
                onClick={actionConfig.action}
                className="w-12 h-12 flex items-center justify-center transition-all shadow-2xl relative overflow-hidden rounded-pill"
                style={{
                    background: `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.86) 100%)`,
                }}
                aria-label={actionConfig.label || 'Open action'}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
                <actionConfig.icon className="w-6 h-6 text-white relative z-10" />
            </motion.button>

            {/* Modals */}
            <AnimatePresence>
                {Object.entries(modalStates).map(([key, isOpen]) => {
                    if (!isOpen) return null;
                    const props = { isOpen, onClose: () => closeModal(key) };
                    switch (key) {
                        case 'emergency': return <EmergencyRequestModal key={key} {...props} />;
                        case 'user': return <UserModal key={key} {...props} />;
                        case 'hospital': return <HospitalModal key={key} {...props} />;
                        case 'ambulance': return <AmbulanceModal key={key} {...props} />;
                        case 'doctor': return <DoctorModal key={key} {...props} />;
                        case 'visit': return <VisitModal key={key} {...props} />;
                        case 'supportTicket':
                            return (
                                <SupportTicketModal
                                    key={key}
                                    {...props}
                                    onSave={createTicket}
                                    mode="create"
                                    priorities={TICKET_PRIORITIES}
                                    categories={TICKET_CATEGORIES}
                                />
                            );
                        case 'subscription': return <SubscriptionModal key={key} {...props} onSave={createSubscriber} mode="create" />;
                        case 'emailActions': return <SubscriptionModal key={key} {...props} mode="emailActions" />;
                        default: return null;
                    }
                })}
            </AnimatePresence>
        </>
    );
};
