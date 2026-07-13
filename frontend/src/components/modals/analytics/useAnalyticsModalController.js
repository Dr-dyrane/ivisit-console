import { useState } from 'react';

import { getPhases } from './analyticsModalModel';

export const useAnalyticsModalController = ({ onClose, type }) => {
  const [phase, setPhase] = useState(0);
  const phases = getPhases(type);
  const isFirst = phase === 0;
  const isLast = phase === phases.length - 1;

  const nextPhase = () => setPhase((current) => Math.min(current + 1, phases.length - 1));
  const prevPhase = () => setPhase((current) => Math.max(current - 1, 0));
  const handleClose = () => {
    setPhase(0);
    onClose();
  };

  return {
    handleClose,
    isFirst,
    isLast,
    nextPhase,
    phase,
    phases,
    prevPhase,
  };
};
