import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { useContextAction } from '../../hooks/useContextAction';
import { Menu, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { ContextPanel } from './ContextPanel';
import { EmergencyRequestModal } from '../modals/EmergencyRequestModal';
import { UserModal } from '../modals/UserModal';
import { HospitalModal } from '../modals/HospitalModal';
import { AmbulanceModal } from '../modals/AmbulanceModal';
import { DoctorModal } from '../modals/DoctorModal';
import { VisitModal } from '../modals/VisitModal';

export const DynamicBottomBar = () => {
    const { isMobile } = useNavigation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalStates, setModalStates] = useState({
        emergency: false,
        user: false,
        hospital: false,
        ambulance: false,
        doctor: false,
        visit: false
    });

    const openModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: true }));
    };

    const closeModal = (type) => {
        setModalStates(prev => ({ ...prev, [type]: false }));
    };

    const actionConfig = useContextAction(openModal);

    if (!isMobile) return null;

    return (
        <>
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pointer-events-auto"
                >
                    <div
                        className="flex items-center gap-1 p-1.5 rounded-full border border-white/10 shadow-premium"
                        style={{
                            background: 'rgba(20, 20, 20, 0.6)', // More transparent for "Apple" look
                            backdropFilter: 'blur(20px) saturate(180%)',
                            boxShadow: `
                0 20px 40px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.1)
              `
                        }}
                    >
                        {/* Menu Trigger */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSheetOpen(true)}
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <Menu className="w-6 h-6 text-white" />
                        </motion.button>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Context Action */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={actionConfig.action}
                            className="h-12 px-6 rounded-full flex items-center gap-2 font-medium text-white transition-all"
                            style={{
                                background: `linear-gradient(135deg, hsl(var(--${actionConfig.color})) 0%, hsl(var(--${actionConfig.color}) / 0.8) 100%)`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            <actionConfig.icon className="w-5 h-5" />
                            <span>{actionConfig.label}</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            {/* Sheet for Menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetOverlay className="bg-black/60 backdrop-blur-sm" />
                <SheetContent
                    side="bottom"
                    className="h-[85vh] max-h-[600px] rounded-t-[32px] border-0 p-0 overflow-hidden"
                    style={{
                        background: 'hsl(var(--background) / 0.95)',
                        backdropFilter: 'blur(34px) saturate(180%)',
                    }}
                >
                    <div className="h-1.5 w-12 bg-white/20 rounded-full mx-auto mt-4 mb-2" />
                    <div className="h-full overflow-y-auto p-6 pb-20">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="font-black text-2xl tracking-tight">Context</h2>
                                <p className="text-sm text-muted-foreground font-medium">Quick Access & Navigation</p>
                            </div>
                        </div>
                        <ContextPanel />
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
                        default: return null;
                    }
                })}
            </AnimatePresence>
        </>
    );
};
