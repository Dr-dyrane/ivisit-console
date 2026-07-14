import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { UserModal } from '../modals/UserModal';
import { HospitalModal } from '../modals/HospitalModal';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { DoctorModal } from '../modals/DoctorModal';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { SubscriptionModal } from '../modals/SubscriptionModal';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';

export const ContextAwareFAB = () => {
  const { usesCompactNavigation } = useNavigation();
  const { isContextPanelOpen, pageShellConfig } = useLayout();
  const location = useLocation();
  const routeOwnsAction = routeOwnsShellAction(location.pathname);
  const hideFab = Boolean(pageShellConfig?.hideFab) || routeOwnsAction;

  // Keep route-owned surfaces free of global FAB side effects.
  if (usesCompactNavigation || isContextPanelOpen || hideFab) return null;

  return <ContextAwareFABContent />;
};

const ContextAwareFABContent = () => {
  const [modalStates, setModalStates] = useState({
    emergency: false,
    user: false,
    hospital: false,
    ambulance: false,
    doctor: false,
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
  const isDestructive = actionConfig.color === 'destructive';

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
          className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-button shadow-[0_6px_16px_rgb(0_0_0/0.12)] transition-[background-color,color,box-shadow,transform] duration-300 ${isDestructive
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          title={actionConfig.label}
          aria-label={actionConfig.label}
        >
          {/* Icon */}
          <actionConfig.icon className="h-6 w-6" />

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
            case 'emergency': return <EmergencyRequestModal key={key} {...props} mode="create" />;
            case 'user': return <UserModal key={key} {...props} />;
            // Skip hospital modal - HospitalsPage handles it
            case 'hospital': return null;
            case 'ambulance': return <AmbulanceModal key={key} {...props} />;
            case 'doctor': return <DoctorModal key={key} {...props} />;
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
            case 'subscription': return <SubscriptionModal key={key} {...props} mode="create" />;
            case 'emailActions': return <SubscriptionModal key={key} {...props} mode="emailActions" />;
            default: return null;
          }
        })}
      </AnimatePresence>
    </>
  );
};
