import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    MapPin,
    UserPlus,
    Ambulance,
    Stethoscope,
    Shield,
    Settings,
    BarChart3,
    Headphones,
    Mail,
    Send,
    ArrowUpCircle
} from 'lucide-react';

export const useContextAction = (openModal) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    if (currentPath.includes('/emergencies')) {
        return {
            icon: Plus,
            label: 'New Emergency',
            color: 'destructive',
            action: () => openModal('emergency')
        };
    } else if (currentPath.includes('/users')) {
        return {
            icon: UserPlus,
            label: 'Invite user',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openUserModal'));
            }
        };
    } else if (currentPath.includes('/ambulances')) {
        return {
            icon: Ambulance,
            label: 'Add unit',
            color: 'warning',
            action: () => {
                window.dispatchEvent(new CustomEvent('openAmbulanceModal'));
            }
        };
    } else if (currentPath.includes('/map')) {
        return {
            icon: MapPin,
            label: 'Center Map',
            color: 'secondary',
            action: () => {
                // Center map via window event
                window.dispatchEvent(new CustomEvent('centerMap'));
            }
        };
    } else if (currentPath.includes('/analytics')) {
        return {
            icon: BarChart3,
            label: 'View analytics',
            color: 'primary',
            action: () => {
                // Open analytics modal via window event
                window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
            }
        };
    } else if (currentPath.includes('/doctors')) {
        return {
            icon: Stethoscope,
            label: 'Add Staff',
            color: 'info',
            action: () => {
                window.dispatchEvent(new CustomEvent('openDoctorModal'));
            }
        };
    } else if (currentPath.includes('/visits')) {
        return {
            icon: BarChart3,
            label: 'View statistics',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
            }
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
    } else if (currentPath === '/settings') {
        return {
            icon: Shield,
            label: 'Security',
            color: 'primary',
            action: () => {
                // If already on settings page, just open the modal directly
                window.dispatchEvent(new CustomEvent('openSecurityModal'));
            }
        };
    } else if (currentPath.includes('/settings')) {
        // Fallback for sub-routes if any, or just use the same logic
        return {
            icon: Shield,
            label: 'Security',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openSecurityModal'));
            }
        };
    } else if (currentPath.includes('/health-news')) {
        return {
            icon: BarChart3,
            label: 'News stats',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
            }
        };
    } else if (currentPath.includes('/support-tickets')) {
        return {
            icon: Headphones,
            label: 'Create Ticket',
            color: 'primary',
            action: () => openModal('supportTicket')
        };
    } else if (currentPath.includes('/insurance')) {
        return {
            icon: Shield,
            label: 'Add policy',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openInsuranceModal'));
            }
        };
    } else if (currentPath.includes('/subscriptions')) {
        return {
            icon: Mail,
            label: 'Email Actions',
            color: 'primary',
            action: () => openModal('emailActions')
        };
    } else if (currentPath.includes('/pricing')) {
        return {
            icon: ArrowUpCircle,
            label: 'Add price',
            color: 'success',
            action: () => {
                window.dispatchEvent(new CustomEvent('openPricingModal'));
            }
        };
    } else if (currentPath.includes('/organizations')) {
        return {
            icon: Plus,
            label: 'Add organization',
            color: 'primary',
            action: () => {
                window.dispatchEvent(new CustomEvent('openOrganizationModal'));
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
