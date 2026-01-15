import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, FileCheck, TrendingUp, Settings, Hospital, Ambulance, Stethoscope, Users, Calendar, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

export const MobileNavMenu = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, hasMinRole } = useAuth();
    const isActive = (path) => location.pathname === path;

    const handleNavigate = (path) => {
        navigate(path);
        onClose();
    };

    const mainLinks = [
        { path: '/', icon: Home, label: 'Home', minRole: 'viewer' },
        { path: '/map', icon: MapPin, label: 'Map', minRole: 'viewer' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics', minRole: 'viewer' },
    ];

    const adminLinks = [
        { path: '/users', icon: Users, label: 'Users', minRole: 'admin' },
        { path: '/verification', icon: FileCheck, label: 'Verification', minRole: 'admin' },
    ];

    const providerLinks = [
        { path: '/emergencies', icon: AlertTriangle, label: 'Emergencies', minRole: 'provider' },
        { path: '/hospitals', icon: Hospital, label: 'Hospitals', minRole: 'provider' },
        { path: '/ambulances', icon: Ambulance, label: 'Ambulances', minRole: 'provider' },
        { path: '/doctors', icon: Stethoscope, label: 'Doctors', minRole: 'provider' },
        { path: '/visits', icon: Calendar, label: 'Visits', minRole: 'provider' },
    ];

    const renderLink = (item) => (
        <motion.button
            key={item.path}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleNavigate(item.path)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive(item.path)
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
        >
            <div className={`p-2 rounded-xl ${isActive(item.path) ? 'bg-primary-foreground/10' : 'bg-transparent'}`}>
                <item.icon className="h-5 w-5" />
            </div>
            <span className="font-bold text-base tracking-tight">{item.label}</span>
            {isActive(item.path) && (
                <motion.div
                    layoutId="active-mobile-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                />
            )}
        </motion.button>
    );

    return (
        <div className="space-y-6 pb-6">
            {/* Main Navigation */}
            <div className="space-y-2">
                <h3 className="px-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Menu</h3>
                {mainLinks.filter(l => hasMinRole(l.minRole)).map(renderLink)}
            </div>

            {/* Operations / Provider */}
            {(hasMinRole('provider') || hasMinRole('admin')) && (
                <div className="space-y-2">
                    <h3 className="px-4 text-xs font-black text-muted-foreground uppercase tracking-widest mt-6">Operations</h3>
                    {providerLinks.filter(l => hasMinRole(l.minRole)).map(renderLink)}
                </div>
            )}

            {/* Admin */}
            {hasMinRole('admin') && (
                <div className="space-y-2">
                    <h3 className="px-4 text-xs font-black text-muted-foreground uppercase tracking-widest mt-6">Admin</h3>
                    {adminLinks.filter(l => hasMinRole(l.minRole)).map(renderLink)}
                </div>
            )}

            <div className="h-px bg-border/40 mx-4 my-4" />

            {/* Settings & Logout */}
            <div className="space-y-2">
                {renderLink({ path: '/settings', icon: Settings, label: 'Settings', minRole: 'viewer' })}
                <button
                    onClick={() => { signOut(); navigate('/login'); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-destructive/10 text-destructive transition-colors group"
                >
                    <div className="p-2 rounded-xl group-hover:bg-destructive/10">
                        <LogOut className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-base tracking-tight">Sign Out</span>
                </button>
            </div>
        </div>
    );
};
