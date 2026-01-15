import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { UserModal } from '../modals/UserModal';
import { HospitalModal } from '../modals/HospitalModal';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { DoctorModal } from '../modals/DoctorModal';
import { VisitModal } from '../modals/VisitModal';
import { 
  Plus, 
  MapPin, 
  Users, 
  Hospital, 
  Ambulance,
  Heart,
  Activity,
  Settings,
  BarChart3,
  Stethoscope,
  Calendar,
  Shield,
  Zap
} from 'lucide-react';

export const ContextAwareFAB = () => {
  const { isMobile, isDesktop } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [modalStates, setModalStates] = useState({
    emergency: false,
    user: false,
    hospital: false,
    ambulance: false,
    doctor: false,
    visit: false
  });
  const currentPath = location.pathname;

  // Don't show on mobile
  if (isMobile) return null;

  // Open modal handlers
  const openModal = (type) => {
    setModalStates(prev => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModalStates(prev => ({ ...prev, [type]: false }));
  };

  // Smart action configuration based on current page
  const getActionConfig = () => {
    if (currentPath.includes('/emergencies')) {
      return {
        icon: Plus,
        label: 'New Emergency',
        color: 'destructive',
        action: () => openModal('emergency')
      };
    } else if (currentPath.includes('/users')) {
      return {
        icon: Users,
        label: 'Add User',
        color: 'primary',
        action: () => openModal('user')
      };
    } else if (currentPath.includes('/hospitals')) {
      return {
        icon: Hospital,
        label: 'Add Hospital',
        color: 'info',
        action: () => openModal('hospital')
      };
    } else if (currentPath.includes('/ambulances')) {
      return {
        icon: Ambulance,
        label: 'Add Ambulance',
        color: 'warning',
        action: () => openModal('ambulance')
      };
    } else if (currentPath.includes('/map')) {
      return {
        icon: MapPin,
        label: 'Center Map',
        color: 'secondary',
        action: () => {
          // Center map logic - will be implemented in map component
          console.log('Centering map on user location');
        }
      };
    } else if (currentPath.includes('/analytics')) {
      return {
        icon: BarChart3,
        label: 'Generate Report',
        color: 'primary',
        action: () => {
          // Generate and download report
          console.log('Generating analytics report');
        }
      };
    } else if (currentPath.includes('/doctors')) {
      return {
        icon: Stethoscope,
        label: 'Add Doctor',
        color: 'info',
        action: () => openModal('doctor')
      };
    } else if (currentPath.includes('/visits')) {
      return {
        icon: Calendar,
        label: 'Schedule Visit',
        color: 'primary',
        action: () => openModal('visit')
      };
    } else if (currentPath.includes('/verification')) {
      return {
        icon: Shield,
        label: 'Quick Verify',
        color: 'warning',
        action: () => {
          navigate('/verification?quick=true');
        }
      };
    } else if (currentPath.includes('/settings')) {
      return {
        icon: Settings,
        label: 'Quick Setting',
        color: 'muted',
        action: () => {
          navigate('/settings?quick=true');
        }
      };
    } else {
      return {
        icon: Plus,
        label: 'Quick Action',
        color: 'primary',
        action: () => navigate('/emergencies')
      };
    }
  };

  const actionConfig = getActionConfig();

  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-8 right-8 z-40"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={actionConfig.action}
          className="relative w-14 h-14 geo-round shadow-premium transition-all duration-300 group"
          style={{
            // Theme-sensitive background matching page context
            background: `hsl(var(--${actionConfig.color})) / 0.9)`,
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
          <actionConfig.icon className="w-6 h-6 text-white mx-auto" />

          {/* Pulse ring for important actions */}
          {actionConfig.color === 'destructive' && (
            <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-foreground text-background text-sm font-medium rounded-lg whitespace-nowrap"
          >
            {actionConfig.label}
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-foreground border-y-4 border-y-transparent" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modalStates.emergency && (
          <EmergencyRequestModal
            isOpen={modalStates.emergency}
            onClose={() => closeModal('emergency')}
          />
        )}
        {modalStates.user && (
          <UserModal
            isOpen={modalStates.user}
            onClose={() => closeModal('user')}
          />
        )}
        {modalStates.hospital && (
          <HospitalModal
            isOpen={modalStates.hospital}
            onClose={() => closeModal('hospital')}
          />
        )}
        {modalStates.ambulance && (
          <AmbulanceModal
            isOpen={modalStates.ambulance}
            onClose={() => closeModal('ambulance')}
          />
        )}
        {modalStates.doctor && (
          <DoctorModal
            isOpen={modalStates.doctor}
            onClose={() => closeModal('doctor')}
          />
        )}
        {modalStates.visit && (
          <VisitModal
            isOpen={modalStates.visit}
            onClose={() => closeModal('visit')}
          />
        )}
      </AnimatePresence>
    </>
  );
};
