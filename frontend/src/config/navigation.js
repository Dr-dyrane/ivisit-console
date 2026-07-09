import {
    Home, MapPin, FileCheck, TrendingUp,
    Stethoscope, Calendar, AlertTriangle, Hospital, Ambulance,
    Users, Newspaper, Headphones, Shield, Mail, FolderKanban, Handshake, Settings,
    Wallet, DollarSign, Building2
} from 'lucide-react';

/**
 * Role-based access levels for comparison
 */
export const ROLE_LEVELS = {
    admin: 100,
    org_admin: 80,
    sponsor: 60,
    provider: 40,
    viewer: 20,
};

/**
 * Navigation items configuration
 * permissions:
 * - minRole: Minimum role level required (from ROLE_LEVELS)
 * - resource: The resource name for fine-grained permission checks (can(action, resource))
 * - scopes: ['global', 'org'] - whether this item is visible globally or only for org/admin users
 */
export const NAV_CONFIG = {
    main: [
        { id: 'home', path: '/', icon: Home, label: 'Today', resource: 'dashboard', minRole: 'viewer' },
        { id: 'map', path: '/map', icon: MapPin, label: 'Live Map', resource: 'map', minRole: 'provider', excludedRoles: ['sponsor'] },
        { id: 'analytics', path: '/analytics', icon: TrendingUp, label: 'Statistics', resource: 'analytics', minRole: 'provider' },
    ],
    ops: {
        id: 'ops',
        label: 'Care',
        icon: Handshake,
        items: [
            // Provider-accessible items (scoped to their own records). Responder
            // providers never appear in visits (no doctor_name rows) -- Visits is a
            // dead-end for them, so the responder set is excluded here exactly like
            // the mobile dock's driver slate (persona canon, PERSONA_MATRIX S3.3).
            { id: 'visits', path: '/visits', icon: Calendar, label: 'Visits', resource: 'visits', minRole: 'provider', excludedRoles: ['sponsor'], excludedProviderTypes: ['driver', 'paramedic', 'ambulance', 'ambulance_service'] },
            { id: 'emergencies', path: '/emergencies', icon: AlertTriangle, label: 'Requests', resource: 'emergency_requests', minRole: 'provider', excludedRoles: ['sponsor'] },

            // Org Admin+ items (fleet/network management)
            { id: 'hospitals', path: '/hospitals', icon: Hospital, label: 'Hospitals', resource: 'hospitals', minRole: 'org_admin' },
            { id: 'ambulances', path: '/ambulances', icon: Ambulance, label: 'Ambulances', resource: 'ambulances', minRole: 'org_admin' },
            { id: 'doctors', path: '/doctors', icon: Stethoscope, label: 'Staff', resource: 'doctors', minRole: 'org_admin' },
        ]
    },
    mgmt: {
        id: 'mgmt',
        label: 'Admin',
        icon: FolderKanban,
        items: [
            // Provider-accessible (submit support, read own tickets)
            { id: 'support', path: '/support-tickets', icon: Headphones, label: 'Support', resource: 'support', minRole: 'provider', excludedRoles: ['sponsor'] },
            { id: 'news', path: '/health-news', icon: Newspaper, label: 'Health News', resource: 'news', minRole: 'org_admin' },

            // Org Admin+ items
            { id: 'verification', path: '/verification', icon: FileCheck, label: 'Approvals', resource: 'verification', minRole: 'org_admin' },
            { id: 'users', path: '/users', icon: Users, label: 'Users', resource: 'users', minRole: 'org_admin' },
            { id: 'organizations', path: '/organizations', icon: Building2, label: 'Organizations', resource: 'organizations', minRole: 'admin' },
            { id: 'subscriptions', path: '/subscriptions', icon: Mail, label: 'Email Subscribers', resource: 'subscriptions', minRole: 'admin' },
        ]
    },
    finance: {
        id: 'finance',
        label: 'Payments',
        icon: DollarSign,
        items: [
            { id: 'wallet', path: '/wallet', icon: Wallet, label: 'Payments', resource: 'wallet', minRole: 'org_admin' },
            { id: 'pricing', path: '/pricing', icon: DollarSign, label: 'Pricing', resource: 'pricing', minRole: 'org_admin' },
            { id: 'insurance', path: '/insurance', icon: Shield, label: 'Insurance', resource: 'insurance', minRole: 'admin' },
        ]
    },
    user: {
        id: 'user',
        label: 'Account',
        icon: Settings,
        items: [
            { id: 'settings', path: '/settings', icon: Settings, label: 'Settings', resource: 'settings', minRole: 'viewer' },
        ]
    }
};

/**
 * Filters navigation items based on user's role and permissions
 */
export const getAccessibleNav = (userProfile, canHelper) => {
    const role = userProfile?.role || 'viewer';
    const userLevel = ROLE_LEVELS[role] || 0;

    const isItemAccessible = (item) => {
        if (item.excludedRoles?.includes(role)) {
            return false;
        }

        // Sub-persona exclusion from the existing profiles.provider_type signal
        // (driver-lens precedent) -- providers only; operators keep the full tree.
        if (role === 'provider' && item.excludedProviderTypes?.includes(userProfile?.provider_type)) {
            return false;
        }

        // 1. Check minimum role level - this is the primary filter
        if (item.minRole) {
            const minLevel = ROLE_LEVELS[item.minRole] || 0;
            if (userLevel < minLevel) {
                return false;
            }
        }

        // 2. Fine-grained permissions are optional - only check if canHelper exists and resource is defined
        // But don't block if canHelper returns false - role level is the primary determinant
        if (canHelper && item.resource) {
            const canAccess = canHelper('view', item.resource);
            // Note: We don't block based on canAccess - role level is sufficient for navigation visibility
        }

        return true;
    };

    const filteredMain = NAV_CONFIG.main.filter(isItemAccessible);

    const filteredOps = {
        ...NAV_CONFIG.ops,
        items: NAV_CONFIG.ops.items.filter(isItemAccessible)
    };

    const filteredMgmt = {
        ...NAV_CONFIG.mgmt,
        items: NAV_CONFIG.mgmt.items.filter(isItemAccessible)
    };

    const filteredFinance = {
        ...NAV_CONFIG.finance,
        items: NAV_CONFIG.finance.items.filter(isItemAccessible)
    };

    const filteredUser = {
        ...NAV_CONFIG.user,
        items: NAV_CONFIG.user.items.filter(isItemAccessible)
    };

    return {
        main: filteredMain,
        ops: filteredOps.items.length > 0 ? filteredOps : null,
        mgmt: filteredMgmt.items.length > 0 ? filteredMgmt : null,
        finance: filteredFinance.items.length > 0 ? filteredFinance : null,
        user: filteredUser.items.length > 0 ? filteredUser : null,
    };
};
