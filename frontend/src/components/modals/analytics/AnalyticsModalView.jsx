import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

import { Button } from '../../ui/button';
import { ModalShell } from '../../ui/ModalShell';
import { AnalyticsDetailsPhase } from './AnalyticsDetailsPhase';
import { AnalyticsDistributionPhase } from './AnalyticsDistributionPhase';
import { getDisplayType } from './analyticsModalModel';
import { AnalyticsSummaryPhase } from './AnalyticsSummaryPhase';

export const AnalyticsModalView = ({ analytics, controller, open, type }) => {
  const {
    handleClose,
    isFirst,
    isLast,
    nextPhase,
    phase,
    phases,
    prevPhase,
  } = controller;
  const currentPhase = phases[phase];
  const displayType = getDisplayType(type);
  const phaseRenderers = [
    <AnalyticsSummaryPhase key="summary" analytics={analytics} type={type} />,
    <AnalyticsDistributionPhase
      key="distribution"
      analytics={analytics}
      phaseLabel={currentPhase?.label}
      type={type}
    />,
    <AnalyticsDetailsPhase
      key="detailed"
      analytics={analytics}
      phaseId={currentPhase?.id}
      phaseLabel={currentPhase?.label}
      type={type}
    />,
  ];

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        onClick={isFirst ? handleClose : prevPhase}
        className="h-12 rounded-button px-5 text-xs font-semibold text-muted-foreground/70 transition-all hover:bg-foreground/5 active:scale-95 sm:px-6"
      >
        {isFirst ? 'Close' : 'Previous'}
      </Button>

      <div className="flex items-center gap-1.5">
        {phases.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-pill transition-all duration-500 ${i === phase ? 'w-2.5 bg-sky-500' : 'w-1 bg-foreground/10'}`}
          />
        ))}
      </div>

      {!isLast ? (
        <Button
          onClick={nextPhase}
          className="h-12 rounded-button bg-foreground px-7 text-xs font-semibold text-background shadow-none transition-all hover:bg-foreground/90 active:scale-[0.97] sm:px-8"
        >
          Next
        </Button>
      ) : (
        <Button
          onClick={handleClose}
          className="h-12 rounded-button px-7 text-xs font-semibold text-foreground transition-all active:scale-[0.97] bg-background/80 backdrop-blur-xl sm:px-8"
        >
          Done
        </Button>
      )}
    </div>
  );

  return (
    <ModalShell
      isOpen={open}
      onClose={handleClose}
      title="Statistics"
      subtitle={displayType}
      icon={<BarChart3 className="h-5 w-5 text-sky-600 opacity-90 dark:text-sky-300" />}
      footer={footer}
      size="md"
      className="bg-background/95 backdrop-blur-md dark:bg-background/90"
    >
      <div className="px-5 pb-6 sm:px-6">
        <div className="pb-4">
          <span className="text-xs font-semibold text-sky-600/75 dark:text-sky-300/80">{currentPhase?.label}</span>
        </div>

        <div className="flex gap-1 pb-6">
          {phases.map((phaseConfig, i) => (
            <div
              key={phaseConfig.id}
              className={`h-0.5 flex-1 rounded-pill transition-all duration-700 ${i === phase
                ? 'bg-sky-500'
                : i < phase
                  ? 'bg-sky-500/25'
                  : 'bg-foreground/5'
                }`}
            />
          ))}
        </div>

        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {phaseRenderers[phase] || null}
          </AnimatePresence>
        </div>
      </div>
    </ModalShell>
  );
};
