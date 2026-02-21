import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useInsurance } from '../../hooks/useInsurance';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { LayoutDashboard, Map, BarChart3 } from 'lucide-react';
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

export const DynamicBottomBar = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown } = useLayout();
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

    const navItems = [
        { icon: LayoutDashboard, path: '/', label: 'Home' },
        { icon: Map, path: '/map', label: 'Map' },
        { icon: BarChart3, path: '/analytics', label: 'Data' }
    ];

    return (
        <>
            <div
                id="dynamic-bottom-bar"
                className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none"
                style={{ bottom: '24px' }}
            >
                <div className="w-full px-6 flex items-center justify-between pointer-events-auto">
                    {/* CORE NAVIGATION PILL - Lucid Design */}
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{
                            x: isScrolledDown ? -100 : 0,
                            opacity: isScrolledDown ? 0 : 1,
                        }}
                        className="flex items-center gap-1 p-1 rounded-full bg-background/10 backdrop-blur-sm shadow-lg"
                    >
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link key={item.path} to={item.path}>
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                                            ? 'bg-primary/20 text-primary shadow-inner'
                                            : 'text-foreground/40 hover:text-foreground'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                    </motion.div>
                                </Link>
                            );
                        })}
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
                        className="w-12 h-12 flex items-center justify-center transition-all shadow-xl relative overflow-hidden rounded-[20px]"
                        style={{
                            background: `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.8) 100%)`,
                        }}
                    >
                        {/* Shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
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
