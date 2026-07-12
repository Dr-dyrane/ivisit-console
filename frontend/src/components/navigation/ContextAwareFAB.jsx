import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { useSubscription } from '../../hooks/useSubscription';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { UserModal } from '../modals/UserModal';
import { HospitalModal } from '../modals/HospitalModal';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { DoctorModal } from '../modals/DoctorModal';
import { VisitModal } from '../modals/VisitModal';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { SubscriptionModal } from '../modals/SubscriptionModal';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';

export const ContextAwareFAB = () => {
  const { isMobile } = useNavigation();
  const { isContextPanelOpen, pageShellConfig } = useLayout();
  const location = useLocation();
  const routeOwnsAction = routeOwnsShellAction(location.pathname);
  const hideFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction;

  // Keep route-owned surfaces free of global FAB side effects.
  if (isMobile || isContextPanelOpen || hideFab) return null;

  return <ContextAwareFABContent />;
};

const ContextAwareFABContent = () => {
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

  // Use the shared hook
  const actionConfig = useContextAction(openModal);
  const { createTicket } = useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true });
  const { createSubscriber } = useSubscription({ autoFetch: false, autoSubscribe: false });

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

  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-8 right-8 z-[60]"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={actionConfig.action}
          className="relative w-14 h-14 glass-card rounded-button bg-background/80 backdrop-blur-xl transition-all duration-300 group flex items-center justify-center overflow-hidden"
          style={{
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
          }}
          title={actionConfig.label}
          aria-label={actionConfig.label}
        >
          {/* Shared RGB Hive Effect */}
          <div className={`hover-glow ${actionConfig.color === 'destructive' ? 'hover-glow-primary' : 'hover-glow-success'}`} />
          
          {/* Icon */}
          <actionConfig.icon className={`w-6 h-6 ${actionConfig.color === 'destructive' ? 'text-primary' : 'text-success'}`} />

          {/* Pulse cue for important actions */}
          {actionConfig.color === 'destructive' && (
            <div className="absolute inset-0 bg-current opacity-20 animate-ping" />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-foreground text-background text-sm font-normal rounded-pill whitespace-nowrap pointer-events-none"
          >
            {actionConfig.label}
            <div className="absolute left-full top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {Object.entries(modalStates).map(([key, isOpen]) => {
          if (!isOpen) return null;
          const props = { isOpen, onClose: () => closeModal(key) };
          switch (key) {
            case 'emergency': return <EmergencyRequestModal key={key} {...props} />;
            case 'user': return <UserModal key={key} {...props} />;
            // Skip hospital modal - HospitalsPage handles it
            case 'hospital': return null;
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
