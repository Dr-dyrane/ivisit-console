import React from 'react';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { ConfirmationModal } from '../../modals/ConfirmationModal';
import { SupportTicketModal } from '../../modals/SupportTicketModal';
import { FilterSheet } from '../../common/FilterSheet';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from './supportTicketsModel';

export const SupportPageModals = ({
  modalMode,
  selectedTicket,
  setModalMode,
  onSave,
  filterSheetOpen,
  setFilterSheetOpen,
  filterSchema,
  filters,
  onApplyFilters,
  analyticsModalOpen,
  setAnalyticsModalOpen,
  analytics,
  confirmationModal,
  onCloseConfirmation,
  deletePending,
  isMobile,
}) => (
  <>
    {modalMode && (
      <SupportTicketModal
        ticket={selectedTicket}
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onSave={onSave}
        priorities={SUPPORT_PRIORITIES}
        categories={SUPPORT_CATEGORIES}
      />
    )}
    <FilterSheet
      isOpen={filterSheetOpen}
      onOpenChange={setFilterSheetOpen}
      filterSchema={filterSchema}
      onApply={onApplyFilters}
      initialValues={filters}
      isMobile={isMobile}
    />
    <AnalyticsModal
      open={analyticsModalOpen}
      onClose={() => setAnalyticsModalOpen(false)}
      analytics={analytics}
      type="support"
    />
    <ConfirmationModal
      isOpen={confirmationModal?.isOpen || false}
      onClose={onCloseConfirmation}
      onConfirm={confirmationModal?.onConfirm || undefined}
      title={confirmationModal?.title}
      description={confirmationModal?.description}
      confirmLabel="Delete"
      variant="destructive"
      isLoading={deletePending}
    />
  </>
);
