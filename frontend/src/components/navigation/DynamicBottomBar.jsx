import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useInsurance } from '../../hooks/useInsurance';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { Menu, Zap, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { ContextPanel } from './ContextPanel';
import { MobileNavMenu } from './MobileNavMenu';
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
import { NotificationCenter } from '../common/NotificationCenter';
import { QuickSearch } from './QuickSearch';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';

export const DynamicBottomBar = () => {
    const { isMobile } = useNavigation();
    const { isScrolledDown } = useLayout();
    const { theme } = useTheme();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeView, setActiveView] = useState('menu');
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

    // Constants for SupportTicketModal
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

    const isDark = theme === 'dark';

    return (
        <>
            <div
                id="dynamic-bottom-bar"
                className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none"
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{
                        y: isScrolledDown ? 120 : 0,
                        opacity: isScrolledDown ? 0 : 1,
                        scale: isScrolledDown ? 0.95 : 1
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                    className="pointer-events-auto"
                >
                    <div
                        className="flex items-center gap-1 p-1.5 rounded-full bg-background/80 backdrop-blur-xl shadow-premium"
                    >
                        {/* Menu Trigger */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSheetOpen(true)}
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <Menu className="w-6 h-6 text-black dark:text-white" />
                        </motion.button>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Search */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSearchOpen(true)}
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <Search className="w-6 h-6 text-black dark:text-white" />
                        </motion.button>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Notifications */}
                        <div className="w-12 h-12 rounded-full flex items-center justify-center">
                            <NotificationCenter />
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Context Action */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={actionConfig.action}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                            style={{
                                background: `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.8) 100%)`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            <actionConfig.icon className="w-6 h-6 text-white" />
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            {/* Sheet for Menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetOverlay className="bg-black/40 backdrop-blur-[2px]" />
                <SheetContent
                    side="bottom"
                    className="h-[90vh] rounded-t-[32px] border-0 p-0 overflow-hidden"
                    style={{
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
                    }}
                >
                    <div className="h-1.5 w-12 bg-white/20 rounded-full mx-auto mt-4 mb-6" />

                    {/* View Toggle (Apple-style Segmented Control) */}
                    <div className="px-4 mb-6">
                        <div className="p-1 rounded-xl bg-muted/20 backdrop-blur-md flex relative">
                            {/* Sliding Background */}
                            <motion.div
                                className="absolute top-1 bottom-1 bg-background shadow-sm rounded-lg"
                                initial={false}
                                animate={{
                                    left: activeView === 'menu' ? '4px' : '50%',
                                    width: 'calc(50% - 4px)',
                                    x: activeView === 'menu' ? 0 : 0
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />

                            <button
                                onClick={() => setActiveView('menu')}
                                className={`flex-1 relative z-10 py-2 text-sm font-semibold text-center transition-colors duration-200 ${activeView === 'menu' ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                            >
                                Menu
                            </button>
                            <button
                                onClick={() => setActiveView('context')}
                                className={`flex-1 relative z-10 py-2 text-sm font-semibold text-center transition-colors duration-200 ${activeView === 'context' ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                            >
                                Context
                            </button>
                        </div>
                    </div>

                    <div className="h-full overflow-y-auto px-4 pb-20 scrollbar-hide">
                        <AnimatePresence mode="wait">
                            {activeView === 'menu' ? (
                                <motion.div
                                    key="menu"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <MobileNavMenu onClose={() => setSheetOpen(false)} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="context"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="font-bold text-2xl tracking-tight">Context</h2>
                                            <p className="text-sm text-muted-foreground font-normal">Quick Access & Insights</p>
                                        </div>
                                    </div>
                                    <ContextPanel />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </SheetContent>
            </Sheet>

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
