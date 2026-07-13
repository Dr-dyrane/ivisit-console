import React from 'react';
import { Siren } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ModalShell } from '../../ui/ModalShell';
import { EmergencyRequestFields } from './EmergencyRequestFields';
import { RequestStatusBar } from './RequestStatusBar';
import { getPriorityBg, getPriorityColor } from './requestModel';

export const EmergencyRequestModalView = ({ isOpen, onClose, controller }) => {
  const {
    currentStatus,
    currentStepIndex,
    formData,
    formId,
    handleSubmit,
    isEdit,
    isView,
    modalSubtitle,
    modalTitle,
    setFormData,
    submitDisabled,
    submitLabel,
  } = controller;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Siren className={`h-4 w-4 ${getPriorityColor(formData.priority)}`} />}
      badge={(
        <Badge className={`rounded-pill px-4 py-1 ${getPriorityBg(formData.priority)} ${getPriorityColor(formData.priority)}`}>
          {formData.priority || 'medium'}
        </Badge>
      )}
      size="lg"
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose(false)}
            className="h-12 rounded-button bg-muted/60 px-8 font-semibold active:scale-[0.96]"
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={formId}
              disabled={submitDisabled}
              className="h-12 rounded-button bg-primary px-10 font-semibold text-primary-foreground active:scale-[0.96] hover:bg-primary/90"
            >
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-4 pb-4 pt-1 sm:px-8 sm:pb-8 sm:pt-2">
        <RequestStatusBar
          currentStatus={currentStatus}
          currentStepIndex={currentStepIndex}
          isEdit={isEdit}
          setFormData={setFormData}
        />
        <EmergencyRequestFields controller={controller} />
      </form>
    </ModalShell>
  );
};
