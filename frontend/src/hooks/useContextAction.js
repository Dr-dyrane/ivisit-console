import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    MapPin,
    Users,
    Hospital,
    Ambulance,
    Stethoscope,
    Calendar,
    Shield,
    Settings,
    BarChart3,
    Newspaper,
    Headphones
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
    } else if (currentPath.includes('/health-news')) {
        return {
            icon: Newspaper,
            label: 'Add News',
            color: 'primary',
            action: () => openModal('healthNews')
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
            label: 'Add Policy',
            color: 'primary', // or 'success' depending on theme preference
            action: () => openModal('insurance')
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
