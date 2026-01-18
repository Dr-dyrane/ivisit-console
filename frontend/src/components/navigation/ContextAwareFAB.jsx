import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLayout } from '../../contexts/LayoutContext';
import { useContextAction } from '../../hooks/useContextAction';
import { useInsurance } from '../../hooks/useInsurance';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { UserModal } from '../modals/UserModal';
import { HospitalModal } from '../modals/HospitalModal';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { DoctorModal } from '../modals/DoctorModal';
import { VisitModal } from '../modals/VisitModal';
import { HealthNewsModal } from '../modals/HealthNewsModal';
import { SupportTicketModal } from '../modals/SupportTicketModal';
import { InsuranceModal } from '../modals/InsuranceModal';

export const ContextAwareFAB = () => {
  const { isDesktop } = useNavigation();
  const { isContextPanelOpen } = useLayout();
  const [modalStates, setModalStates] = useState({
    emergency: false,
    user: false,
    hospital: false,
    ambulance: false,
    doctor: false,
    visit: false,
    healthNews: false,
    supportTicket: false,
    insurance: false
  });

  const openModal = (type) => {
    setModalStates(prev => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModalStates(prev => ({ ...prev, [type]: false }));
  };

  // Use the shared hook
  const actionConfig = useContextAction(openModal);
  const { createPolicy } = useInsurance();
  const { createTicket } = useSupportTickets();

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

  // Desktop only - Mobile uses DynamicBottomBar
  if (!isDesktop) return null;

  // Hide FAB when context panel is open to reduce cognitive load
  if (isContextPanelOpen) return null;

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
          className="relative w-14 h-14 geo-round bg-background/80 backdrop-blur-xl border border-border/40 shadow-premium transition-all duration-300 group flex items-center justify-center"
          style={{
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
          }}
          title={actionConfig.label}
        >
          {/* Icon */}
          <actionConfig.icon className={`w-6 h-6 ${actionConfig.color === 'destructive' ? 'text-destructive' : 'text-foreground'}`} />

          {/* Pulse ring for important actions */}
          {actionConfig.color === 'destructive' && (
            <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-foreground text-background text-sm font-medium rounded-lg whitespace-nowrap pointer-events-none"
          >
            {actionConfig.label}
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-foreground border-y-4 border-y-transparent" />
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
            default: return null;
          }
        })}
      </AnimatePresence>
    </>
  );
};
