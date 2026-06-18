import React from 'react';
import { cn } from '../../lib/utils';

/**
 * GlassSection — shared section/card wrapper inside modals.
 *
 * Replaces the copy-pasted local `GlassCard` component found in:
 * DoctorModal, HospitalModal, UserModal, AmbulanceModal, InsuranceModal,
 * VisitModal, SupportTicketModal, HealthNewsModal, EmergencyRequestModal,
 * EmergencyDetailsModal, VerificationModal, BulkImportModal, StaffSchedulingModal.
 *
 * Props:
 *   title     {string}     Optional section heading
 *   icon      {ReactNode}  Optional icon left of the heading
 *   className {string}     Extra classes (e.g. for custom background)
 *   children  {ReactNode}  Section content
 */
export const GlassSection = ({ children, title, icon, className }) => (
    <div className={cn('p-4 sm:p-6 rounded-inner bg-muted/30', className)}>
        {(title || icon) && (
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
                {icon && (
                    <div className="p-1.5 sm:p-2 bg-muted/50 rounded-icon shrink-0">
                        {icon}
                    </div>
                )}
                {title && (
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                        {title}
                    </h3>
                )}
            </div>
        )}
        {children}
    </div>
);

export default GlassSection;
