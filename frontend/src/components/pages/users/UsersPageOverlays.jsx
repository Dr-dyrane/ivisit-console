import React from 'react';
import { Trash2 } from 'lucide-react';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { ConfirmationModal } from '../../modals/ConfirmationModal';
import { InviteUserModal } from '../../modals/InviteUserModal';
import { UserModal } from '../../modals/UserModal';
import { FilterSheet } from '../../common/FilterSheet';
import { BulkActionBar } from '../../common/BulkActionBar';
import { Button } from '../../ui/button';
import { toUsersAnalyticsShape } from './usersPageModel';

const Confirmation = ({ confirmationModal, setConfirmationModal }) => (
  <ConfirmationModal
    isOpen={confirmationModal.isOpen}
    onClose={() => setConfirmationModal((previous) => ({ ...previous, isOpen: false }))}
    title={confirmationModal.title}
    description={confirmationModal.description}
    onConfirm={confirmationModal.onConfirm}
    variant={confirmationModal.variant}
    confirmLabel={confirmationModal.confirmLabel}
    isLoading={confirmationModal.isLoading}
  />
);

export const UsersPageDialogs = ({
  isMobile,
  modalMode,
  selectedUser,
  onClose,
  onSave,
  onInvited,
  filterSheetOpen,
  setFilterSheetOpen,
  filterSchema,
  filters,
  setFilters,
  analyticsModalOpen,
  setAnalyticsModalOpen,
  statistics,
  confirmationModal,
  setConfirmationModal,
}) => (
  <>
    <UserModal
      isOpen={modalMode === 'create' || modalMode === 'edit' || modalMode === 'view'}
      onClose={onClose}
      user={selectedUser}
      mode={modalMode}
      onSave={onSave}
    />
    <InviteUserModal isOpen={modalMode === 'invite'} onClose={onClose} onInvited={onInvited} />
    <FilterSheet
      isOpen={filterSheetOpen}
      onOpenChange={setFilterSheetOpen}
      filterSchema={filterSchema}
      onApply={setFilters}
      initialValues={filters}
      viewToggle={isMobile ? undefined : null}
      isMobile={isMobile}
    />
    {isMobile && (
      <Confirmation
        confirmationModal={confirmationModal}
        setConfirmationModal={setConfirmationModal}
      />
    )}
    <AnalyticsModal
      open={analyticsModalOpen}
      onClose={() => setAnalyticsModalOpen(false)}
      analytics={toUsersAnalyticsShape(statistics)}
      type="user"
    />
    {!isMobile && (
      <Confirmation
        confirmationModal={confirmationModal}
        setConfirmationModal={setConfirmationModal}
      />
    )}
  </>
);

export const UsersBulkActionBar = ({ selectedIds, onClear, onDeleteUnavailable }) => (
  <BulkActionBar selectedCount={selectedIds.length} onClear={onClear}>
    <Button
      variant="ghost"
      size="icon"
      onClick={onDeleteUnavailable}
      className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground active:scale-[0.96]"
      title="Delete unavailable"
      aria-label="Delete unavailable"
      data-state="unavailable"
    >
      <Trash2 className="h-5 w-5" />
    </Button>
  </BulkActionBar>
);
