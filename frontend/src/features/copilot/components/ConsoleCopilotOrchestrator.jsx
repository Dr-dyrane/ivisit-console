import React from 'react';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { DesktopCopilotRail } from '../variants/DesktopCopilotRail';
import { MobileCopilotSheet } from '../variants/MobileCopilotSheet';
import { TabletCopilotOverlay } from '../variants/TabletCopilotOverlay';

/**
 * Presentation-only responsive adapter. It owns no route data, writes, query
 * state, or navigation; callers provide the controller's ephemeral state.
 */
export const ConsoleCopilotOrchestrator = ({ controller }) => {
  const { isPhone, isTablet, isDesktop } = useBreakpoint();
  const sharedProps = {
    isOpen: controller.isOpen,
    onClose: controller.close,
    proposal: controller.proposal,
    isPreparing: controller.isPreparing,
    error: controller.error,
    onRetry: controller.retry,
    pendingAction: controller.pendingAction,
    isExecuting: controller.isExecuting,
    executionError: controller.executionError,
    onPrepareAction: controller.prepareAction,
    onCancelAction: controller.cancelAction,
    onConfirmAction: controller.confirmAction,
  };

  if (isPhone) return <MobileCopilotSheet {...sharedProps} />;
  if (isTablet) return <TabletCopilotOverlay {...sharedProps} />;
  if (isDesktop) return <DesktopCopilotRail {...sharedProps} />;
  return null;
};
