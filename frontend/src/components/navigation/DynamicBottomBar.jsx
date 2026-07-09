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
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
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
    const routeOwnedAction = getRouteOwnedMobileAction(location.pathname, userRole);
    const showAnyAction = Boolean(routeOwnedAction) || !hideContextFab;

    const navItems = getMobileNavigationItems(userRole);
    const navIcons = {
        today: LayoutDashboard,
        emergencies: AlertTriangle,
        map: Map,
        approvals: FileCheck,
        staff: Stethoscope,
        statistics: BarChart3,
        settings: Settings,
        visits: Calendar,
    };

    return (
        <>
            <div
                id="dynamic-bottom-bar"
                className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none"
                style={{ bottom: 'calc(var(--safe-bottom, 0px) + 14px)' }}
            >
                <div className={`w-full px-6 flex items-center pointer-events-auto ${showAnyAction ? 'justify-between' : 'justify-center'}`}>
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
                                            ? 'bg-[hsl(var(--spark)/0.12)] text-[hsl(var(--spark)/0.92)] shadow-inner'
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
        </>
    );
};

const getRouteOwnedMobileAction = (pathname = '', userRole = 'viewer') => {
    if (pathname.startsWith('/emergencies') && (userRole === 'admin' || userRole === 'org_admin')) {
        return {
            icon: ClipboardCheck,
            label: 'New request',
            color: 'destructive',
            action: () => window.dispatchEvent(new CustomEvent('openEmergencyModal'))
        };
    }

    if (pathname.startsWith('/doctors')) {
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

    if (pathname.startsWith('/support-tickets') && ['provider', 'org_admin', 'admin'].includes(userRole)) {
        return {
            icon: ClipboardCheck,
            label: 'New ticket',
            color: 'primary',
            action: () => window.dispatchEvent(new CustomEvent('openSupportTicketModal'))
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
            className="w-12 h-12 flex items-center justify-center transition-all shadow-2xl relative overflow-hidden rounded-button"
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
                className="w-12 h-12 flex items-center justify-center transition-all shadow-2xl relative overflow-hidden rounded-button"
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
