import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  applyOptimisticRemove,
  applyOptimisticUpsert,
  settleSupportTicketDeletes,
  useSupportTicketsMutations,
} from '../../../hooks/useSupportTicketsMutations';
import {
  assignTicket,
  createSupportTicket,
  deleteSupportTicket,
  updateSupportTicket,
} from '../../../services/supportTicketsService';
import { handleApiError } from '../../../utils/errorHandler';

export const useSupportTicketCommands = ({
  canCreate,
  canManageSupport,
  clearSelection,
  handleToggleSelect,
  isFocused,
  isProvider,
  markActionFeedback,
  profile,
  queryFilter,
  recordConfirmedTicketDeletion,
  selectedIds,
  setFocused,
}) => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
  });
  const [deletePending, setDeletePending] = useState(false);
  const [assignPending, setAssignPending] = useState(false);
  const [createConvergenceNotice, setCreateConvergenceNotice] = useState(null);
  const deletePendingRef = useRef(false);
  const assignPendingRef = useRef(false);

  const handleCreate = useCallback(() => {
    if (!canCreate) {
      toast.info('Support request access is unavailable');
      return;
    }
    markActionFeedback('create');
    setSelectedTicket(null);
    setModalMode('create');
  }, [canCreate, markActionFeedback]);

  const handleView = useCallback((ticket) => {
    markActionFeedback(`view-${ticket?.id || 'unknown'}`);
    if (ticket?.id && !isFocused(ticket.id)) setFocused(ticket.id);
    setSelectedTicket(ticket);
    setModalMode('view');
  }, [markActionFeedback, setFocused, isFocused]);

  const canEditTicket = useCallback((ticket) => (
    canManageSupport || (isProvider() && ticket?.user_id === profile?.id)
  ), [canManageSupport, isProvider, profile?.id]);

  const handleEdit = useCallback((ticket) => {
    if (!canEditTicket(ticket)) {
      toast.info('This request is read only here');
      return;
    }
    markActionFeedback(`edit-${ticket?.id || 'unknown'}`);
    if (ticket?.id && !isFocused(ticket.id)) setFocused(ticket.id);
    setSelectedTicket(ticket);
    setModalMode('edit');
  }, [canEditTicket, markActionFeedback, setFocused, isFocused]);

  const handleCreateConvergenceError = useCallback((_error, context) => {
    const ticketId = String(context?.data?.id || '').trim() || null;
    setCreateConvergenceNotice({
      ticketId,
      message: 'Request created. Refresh is unavailable, so the confirmed request is shown from the saved response.',
    });
    toast.warning('Request created, but the support list did not refresh.');
  }, []);

  const createTicketMutation = useSupportTicketsMutations({
    mutationFn: createSupportTicket,
    applyCommitted: applyOptimisticUpsert,
    onConvergenceError: handleCreateConvergenceError,
    filter: queryFilter,
  });
  const updateTicketMutation = useSupportTicketsMutations({
    mutationFn: ({ id, ...changes }) => updateSupportTicket(id, changes),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });
  const deleteTicketMutation = useSupportTicketsMutations({
    mutationFn: deleteSupportTicket,
    applyOptimistic: applyOptimisticRemove,
    filter: queryFilter,
  });
  const assignTicketMutation = useSupportTicketsMutations({
    mutationFn: ({ id, assigned_to }) => assignTicket(id, assigned_to),
    applyOptimistic: applyOptimisticUpsert,
    filter: queryFilter,
  });

  const handleSave = useCallback(async (...args) => {
    if (args.length === 1) {
      setCreateConvergenceNotice(null);
      await createTicketMutation.mutateAsync(args[0]);
    } else {
      await updateTicketMutation.mutateAsync({ id: args[0], ...args[1] });
    }
    return true;
  }, [createTicketMutation, updateTicketMutation]);

  const closeConfirmation = useCallback(() => {
    if (deletePendingRef.current) return;
    setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleDelete = useCallback((ticket) => {
    if (deletePendingRef.current) return;
    if (!canManageSupport || !ticket?.id) {
      toast.info('Delete is unavailable for this request');
      return;
    }
    setConfirmationModal({
      isOpen: true,
      title: 'Delete ticket',
      description: `Delete "${ticket.subject || 'this request'}"? This cannot be undone.`,
      onConfirm: async () => {
        if (deletePendingRef.current) return;
        deletePendingRef.current = true;
        setDeletePending(true);
        try {
          const deletedTicket = await deleteTicketMutation.mutateAsync(ticket.id);
          recordConfirmedTicketDeletion(ticket.id, deletedTicket);
          toast.success('Ticket deleted');
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          deletePendingRef.current = false;
          setDeletePending(false);
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, closeConfirmation, deleteTicketMutation, recordConfirmedTicketDeletion]);

  const handleBulkDelete = useCallback(() => {
    if (deletePendingRef.current) return;
    if (!canManageSupport || selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const selectedCount = ids.length;
    setConfirmationModal({
      isOpen: true,
      title: `Delete ${selectedCount} ticket${selectedCount === 1 ? '' : 's'}`,
      description: `Delete ${selectedCount} selected request${selectedCount === 1 ? '' : 's'}? This cannot be undone.`,
      onConfirm: async () => {
        if (deletePendingRef.current) return;
        deletePendingRef.current = true;
        setDeletePending(true);
        try {
          const outcome = await settleSupportTicketDeletes(
            ids,
            (id) => deleteTicketMutation.mutateAsync(id)
          );

          outcome.confirmed.forEach(({ id, ticket }) => {
            recordConfirmedTicketDeletion(id, ticket);
          });

          clearSelection();
          outcome.failed.forEach(({ id }) => handleToggleSelect(id, true));

          const deletedCount = outcome.confirmed.length;
          const failedCount = outcome.failed.length;
          if (failedCount === 0) {
            toast.success(`${deletedCount} ticket${deletedCount === 1 ? '' : 's'} deleted`);
          } else if (deletedCount === 0) {
            toast.error(`No tickets were deleted. ${failedCount} remain selected.`);
          } else {
            toast.warning(`${deletedCount} deleted. ${failedCount} could not be deleted and remain selected.`);
          }
        } catch (error) {
          handleApiError(error, 'delete');
        } finally {
          deletePendingRef.current = false;
          setDeletePending(false);
          closeConfirmation();
        }
      },
    });
  }, [canManageSupport, clearSelection, closeConfirmation, deleteTicketMutation, handleToggleSelect, recordConfirmedTicketDeletion, selectedIds]);

  const canAssign = isProvider();
  const handleAssign = useCallback(async (ticket) => {
    if (assignPendingRef.current) return;
    if (!ticket?.id || !profile?.id) {
      toast.info('Assignment is unavailable for this request');
      return;
    }
    assignPendingRef.current = true;
    setAssignPending(true);
    markActionFeedback(`assign-${ticket.id}`);
    try {
      await assignTicketMutation.mutateAsync({
        id: ticket.id,
        assigned_to: profile.id,
        status: 'in_progress',
      });
      toast.success('Ticket assigned to you');
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      assignPendingRef.current = false;
      setAssignPending(false);
    }
  }, [assignTicketMutation, markActionFeedback, profile?.id]);

  const clearCreateConvergenceNotice = useCallback(() => {
    setCreateConvergenceNotice(null);
  }, []);

  return {
    assignPending,
    canAssign,
    canEditTicket,
    clearCreateConvergenceNotice,
    closeConfirmation,
    confirmationModal,
    createConvergenceNotice,
    deletePending,
    handleAssign,
    handleBulkDelete,
    handleCreate,
    handleDelete,
    handleEdit,
    handleSave,
    handleView,
    modalMode,
    selectedTicket,
    setModalMode,
  };
};
