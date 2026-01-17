import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
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
          className="relative w-14 h-14 geo-round shadow-premium transition-all duration-300 group flex items-center justify-center"
          style={{
            // Theme-sensitive background matching page context
            background: `hsl(var(--${actionConfig.color}) / 0.9)`,
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 12px 24px rgba(0, 0, 0, 0.2),
              0 4px 8px rgba(0, 0, 0, 0.1),
              inset 0 0 0 1px rgba(255, 255, 255, 0.15)
            `,
            border: 'none',
          }}
          title={actionConfig.label}
        >
          {/* Icon */}
          <actionConfig.icon className="w-6 h-6 text-white" />

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
