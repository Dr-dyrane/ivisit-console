export const canApplyEmergencyDetailProjection = ({
  sequence,
  latestSequence,
  requestId,
  activeRequestId,
  isOpen,
}) => Boolean(
  isOpen &&
  requestId &&
  requestId === activeRequestId &&
  sequence === latestSequence
);
