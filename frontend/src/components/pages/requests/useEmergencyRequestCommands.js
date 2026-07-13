import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { applyOptimisticStatus, useEmergencyMutations } from '../../../hooks/useEmergencyMutations';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { createNotification, NotificationActions, NotificationTypes } from '../../../services/notificationService';
import {
  cancelEmergencyRequest,
  EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
} from '../../../services/emergencyService';
import { completeEmergency, dispatchEmergency } from '../../../services/emergencyResponseService';
import { getEmergencyActionState } from '../../../utils/emergencyActions';
import { isCashPaymentMethod } from '../../../utils/emergencyRequestMapper';

const DEFAULT_CONFIRMATION_MODAL = {
  isOpen: false,
  title: '',
  description: '',
  onConfirm: null,
  variant: 'destructive',
  confirmLabel: 'Cancel',
};

const DEFAULT_COMPLETE_MODAL = { open: false, request: null };

export const useEmergencyRequestCommands = ({
  requests,
  queryFilter,
  fetchRequests,
  isAdmin,
  isOrgAdmin,
  isProvider,
  user,
}) => {
  const [confirmationModal, setConfirmationModal] = useState(DEFAULT_CONFIRMATION_MODAL);
  const [completeModal, setCompleteModal] = useState(DEFAULT_COMPLETE_MODAL);
  const dispatchMutation = useEmergencyMutations({
    mutationFn: ({ id, request }) => dispatchEmergency(id, request),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'accepted'),
    filter: queryFilter,
  });
  const completeMutation = useEmergencyMutations({
    mutationFn: ({ id, request }) => completeEmergency(id, request),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'completed'),
    filter: queryFilter,
  });
  const cancelMutation = useEmergencyMutations({
    mutationFn: ({ id, reason }) => cancelEmergencyRequest(id, reason),
    applyOptimistic: (cache, variables) => applyOptimisticStatus(cache, variables.id, 'cancelled'),
    filter: queryFilter,
  });
  const dispatchMutateAsync = dispatchMutation.mutateAsync;
  const completeMutateAsync = completeMutation.mutateAsync;
  const cancelMutateAsync = cancelMutation.mutateAsync;

  const getEmergencyLabel = useCallback((request) => (
    request?.display_id || request?.hospital_name || request?.service_type || 'selected request'
  ), []);

  const handleDelete = useCallback(async (request) => {
    if (!getEmergencyActionState(request).canCancel) {
      toast.info('This request is already closed.');
      await fetchRequests();
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Cancel request',
      description: `Cancel ${getEmergencyLabel(request)}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await cancelMutateAsync({ id: request.id, reason: 'cancelled_from_console' });
        } catch (error) {
          console.error('Error cancelling request:', error);
          toast.error(error.message || 'Failed to cancel request');
          return;
        }
        try {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CANCELLED,
            request.id,
            { message: 'Request has been cancelled' }
          );
        } catch (notifyError) {
          console.warn('Cancel succeeded but notification failed:', notifyError);
        }
        toast.success('Request cancelled');
        setConfirmationModal((previous) => ({ ...previous, isOpen: false }));
      },
      variant: 'destructive',
      confirmLabel: 'Cancel request',
    });
  }, [cancelMutateAsync, fetchRequests, getEmergencyLabel]);

  const {
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  } = useRowSelection(requests);

  const executeBulkCancel = useCallback(async () => {
    setConfirmationModal((previous) => ({ ...previous, isOpen: false }));
    const targets = requests.filter(
      (row) => selectedIds.includes(row.id) && getEmergencyActionState(row).canCancel
    );
    if (targets.length === 0) {
      clearSelection();
      return;
    }

    toast.loading(`Cancelling ${targets.length} request${targets.length === 1 ? '' : 's'}...`, { id: 'bulk-cancel' });
    let failed = 0;
    for (const request of targets) {
      try {
        await cancelMutateAsync({ id: request.id, reason: 'cancelled_from_console' });
        try {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CANCELLED,
            request.id,
            { message: 'Request has been cancelled' }
          );
        } catch (notifyError) {
          console.warn('Cancel succeeded but notification failed:', notifyError);
        }
      } catch (error) {
        console.error('Bulk cancel failed for request:', request.id, error);
        failed += 1;
      }
    }

    clearSelection();
    if (failed > 0) {
      toast.error(`${failed} cancel${failed === 1 ? '' : 's'} failed`, { id: 'bulk-cancel' });
    } else {
      toast.success(`${targets.length} request${targets.length === 1 ? '' : 's'} cancelled`, { id: 'bulk-cancel' });
    }
  }, [cancelMutateAsync, clearSelection, requests, selectedIds]);

  const cancellableSelectedCount = useMemo(
    () => requests.filter((row) => selectedIds.includes(row.id) && getEmergencyActionState(row).canCancel).length,
    [requests, selectedIds]
  );

  const handleBulkCancel = useCallback(() => {
    if (cancellableSelectedCount === 0) return;
    setConfirmationModal({
      isOpen: true,
      title: 'Cancel requests',
      description: `Cancel ${cancellableSelectedCount} cancellable request${cancellableSelectedCount === 1 ? '' : 's'}? Completed and cancelled ones are skipped. This cannot be undone.`,
      onConfirm: executeBulkCancel,
      variant: 'destructive',
      confirmLabel: 'Cancel requests',
    });
  }, [cancellableSelectedCount, executeBulkCancel]);

  const handleDispatch = useCallback(async (request) => {
    const actionState = getEmergencyActionState(request);
    if (!actionState.canDispatch) {
      toast.info('This request is not ready to dispatch. Refreshing list...');
      await fetchRequests();
      return;
    }

    try {
      toast.loading('Dispatching request...', { id: 'dispatch' });
      const result = await dispatchMutateAsync({ id: request.id, request });
      toast.success('Request dispatched', { id: 'dispatch' });
      toast.info(`Responder: ${result.assignments.ambulance?.type || 'Assigned'}`, { duration: 3000 });
    } catch (error) {
      console.error('Dispatch failed:', error);
      const message = String(error?.message || '');
      if (
        message.toLowerCase().includes('terminal emergency request') ||
        message.toLowerCase().includes('cannot dispatch before cash approval')
      ) {
        toast.info(message || 'Request state changed. Refreshing list.', { id: 'dispatch' });
        await fetchRequests();
        return;
      }
      toast.error(message || 'Failed to dispatch request', { id: 'dispatch' });
    }
  }, [dispatchMutateAsync, fetchRequests]);

  const canCurrentActorCompleteRequest = useCallback((request) => {
    const actionState = getEmergencyActionState(request);
    if (!actionState.canComplete) return false;
    if (isAdmin() || isOrgAdmin()) return true;
    return isProvider() && Boolean(user?.id) && request?.responder_id === user.id;
  }, [isAdmin, isOrgAdmin, isProvider, user?.id]);

  const handleComplete = useCallback((request) => {
    if (!canCurrentActorCompleteRequest(request)) {
      toast.info('Only the assigned responder can complete this request.');
      return;
    }
    setCompleteModal({ open: true, request });
  }, [canCurrentActorCompleteRequest]);

  const executeComplete = useCallback(async (request) => {
    setCompleteModal(DEFAULT_COMPLETE_MODAL);
    if (!canCurrentActorCompleteRequest(request)) {
      toast.info('Only the assigned responder can complete this request.');
      return;
    }
    try {
      await completeMutateAsync({ id: request.id, request });
      if (isCashPaymentMethod(request.payment_method) && request.payment_status !== 'completed') {
        toast.warning('Cash follow-up needed', {
          description: 'Completion was saved. Cash settlement is handled in Finance.',
        });
      } else {
        toast.success('Request completed');
      }
    } catch (error) {
      console.error('Complete failed:', error);
      toast.error(error?.message || 'Failed to complete request');
    }
  }, [canCurrentActorCompleteRequest, completeMutateAsync]);

  const handleProcessCash = useCallback(() => {
    toast.info('Cash settlement is not ready here yet', {
      description: 'The finance receiver pass still owns this action.',
    });
  }, []);

  const handleRetryPaymentUnavailable = useCallback(() => {
    toast.info('Payment retry unavailable', {
      description: EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON,
    });
    return false;
  }, []);

  return {
    handleDelete,
    handleDispatch,
    handleComplete,
    handleProcessCash,
    handleRetryPaymentUnavailable,
    dispatchPending: dispatchMutation.isPending,
    completePending: completeMutation.isPending,
    cancelPending: cancelMutation.isPending,
    selectedIds,
    handleSelectClick,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBulkCancel,
    cancellableSelectedCount,
    confirmationModal,
    closeConfirmationModal: () => setConfirmationModal((previous) => ({ ...previous, isOpen: false })),
    completeModal,
    closeCompleteModal: () => setCompleteModal(DEFAULT_COMPLETE_MODAL),
    executeComplete,
  };
};
