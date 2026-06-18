import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { ROLE_LEVELS } from '../../config/navigation';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useInsurance } from '../../hooks/useInsurance';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import {
    LayoutDashboard,
    Map,
    BarChart3,
    Calendar,
    AlertTriangle,
    Hospital,
    Ambulance,
    Stethoscope,
    Headphones,
    Newspaper,
    FileCheck,
    Users,
    Building2,
    Mail,
    Wallet,
    DollarSign,
    Shield,
    Settings,
    Activity,
    Menu
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
    EmergencyRequestModal,
    UserModal,
    HospitalModal,
    AmbulanceModal,
    DoctorModal,
    VisitModal,
    HealthNewsModal,
    SupportTicketModal,
    InsuranceModal,
    SubscriptionModal
} from '../modals/index';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import { QuickSearch } from './QuickSearch';

const PATH_ICONS = {
    '/': LayoutDashboard,
    '/map': Map,
    '/analytics': BarChart3,
    '/visits': Calendar,
    '/emergencies': AlertTriangle,
    '/hospitals': Hospital,
    '/ambulances': Ambulance,
    '/doctors': Stethoscope,
    '/support-tickets': Headphones,
    '/health-news': Newspaper,
    '/verification': FileCheck,
    '/users': Users,
    '/organizations': Building2,
    '/subscriptions': Mail,
    '/wallet': Wallet,
    '/pricing': DollarSign,
    '/insurance': Shield,
    '/settings': Settings
};

const SMART_RECOMMENDATIONS = {
    '/': '/analytics',
    '/map': '/emergencies',
    '/analytics': '/pricing',
    '/hospitals': '/ambulances',
    '/ambulances': '/map',
    '/doctors': '/visits',
    '/visits': '/doctors',
    '/users': '/organizations',
    '/organizations': '/users',
    '/emergencies': '/map',
    '/verification': '/users',
    '/support-tickets': '/analytics',
    '/health-news': '/analytics',
    '/subscriptions': '/pricing',
    '/pricing': '/wallet',
    '/wallet': '/analytics',
    '/insurance': '/pricing',
    '/settings': '/wallet'
};

export const DynamicBottomBar = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown } = useLayout();
    const { profile } = useAuth();
    const { theme } = useTheme();
    const location = useLocation();
    const [searchOpen, setSearchOpen] = useState(false);
    const [modalStates, setModalStates] = useState({
        emergency: false,
        user: false,
        hospital: false,
        ambulance: false,
        doctor: false,
        visit: false,
        healthNews: false,
        supportTicket: false,
        insurance: false,
        subscription: false,
        emailActions: false
    });

    const openModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: true }));
    };

    const closeModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: false }));
    };

    const { createPolicy } = useInsurance();
    const { createTicket } = useSupportTickets();
    const { createSubscriber } = useSubscription();

    const TICKET_PRIORITIES = [
        { value: 'low', label: 'Low', color: 'blue' },
        { value: 'normal', label: 'Normal', color: 'green' },
        { value: 'high', label: 'High', color: 'orange' },
        { value: 'urgent', label: 'Urgent', color: 'red' }
    ];

    const TICKET_CATEGORIES = [
        'general', 'technical', 'billing', 'account', 'feature_request', 'bug_report', 'medical'
    ];
    const actionConfig = useContextAction(openModal);

    if (!isMobile) return null;

    const currentPath = location.pathname;

    // Role-deterministic nav slots — predictable per role
    const userRole = profile?.role || 'viewer';
    const userLevel = ROLE_LEVELS[userRole] || 0;

    let navItems;
    if (userLevel >= 100) {
        // admin
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Home' },
            { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
            { path: '/map', icon: Map, label: 'Map' },
        ];
    } else if (userLevel >= 80) {
        // org_admin
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Home' },
            { path: '/visits', icon: Calendar, label: 'Visits' },
            { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
        ];
    } else if (userLevel >= 40) {
        // provider
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Home' },
            { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies' },
            { path: '/visits', icon: Calendar, label: 'Visits' },
        ];
    } else {
        // viewer / below
        navItems = [
            { path: '/', icon: LayoutDashboard, label: 'Home' },
            { path: '/health-news', icon: Newspaper, label: 'Health News' },
            { path: '/settings', icon: Settings, label: 'Settings' },
        ];
    }

    // Handler to open the full nav menu sheet
    const handleOpenMenu = () => {
        window.dispatchEvent(new CustomEvent('openMobileMenu'));
    };

    return (
        <>
            <div
                id="dynamic-bottom-bar"
                className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none"
                style={{ bottom: 'calc(var(--safe-bottom, 0px) + 14px)' }}
            >
                <div className="w-full px-6 flex items-center justify-between pointer-events-auto">
                    {/* CORE NAVIGATION PILL - Lucid Design */}
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{
                            x: isScrolledDown ? -100 : 0,
                            opacity: isScrolledDown ? 0 : 1,
                        }}
                        className="flex items-center gap-1 p-1 rounded-full bg-transparent backdrop-blur-sm shadow-sm"
                    >
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link key={item.path} to={item.path}>
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                                            ? 'bg-[hsl(var(--spark)/0.12)] text-[hsl(var(--spark)/0.92)] shadow-inner'
                                            : 'text-foreground/45 hover:text-foreground'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5 transition-transform group-active:scale-90" />
                                    </motion.div>
                                </Link>
                            );
                        })}
                        {/* Hamburger — opens full nav menu */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleOpenMenu}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 text-foreground/45 hover:text-foreground"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </motion.button>
                    </motion.div>

                    {/* CONTEXT FAB - Professional Detached Pill */}
                    <motion.button
                        initial={{ x: 50, opacity: 0 }}
                        animate={{
                            x: isScrolledDown ? 100 : 0,
                            opacity: isScrolledDown ? 0 : 1,
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={actionConfig.action}
                        className="w-12 h-12 flex items-center justify-center transition-all shadow-2xl relative overflow-hidden rounded-3xl"
                        style={{
                            background: `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.86) 100%)`,
                        }}
                    >
                        {/* Shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
                        <actionConfig.icon className="w-6 h-6 text-white relative z-10" />
                    </motion.button>
                </div>
            </div>

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
                        case 'healthNews': return <HealthNewsModal key={key} {...props} mode="create" />;
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
                        case 'insurance': return <InsuranceModal key={key} {...props} onSave={createPolicy} mode="create" />;
                        case 'subscription': return <SubscriptionModal key={key} {...props} onSave={createSubscriber} mode="create" />;
                        case 'emailActions': return <SubscriptionModal key={key} {...props} mode="emailActions" />;
                        default: return null;
                    }
                })}
            </AnimatePresence>

            {/* Search Dialog */}
            <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};
