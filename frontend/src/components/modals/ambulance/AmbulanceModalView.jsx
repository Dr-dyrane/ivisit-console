import React from 'react';
import { Ambulance, Loader2 } from 'lucide-react';

import { CopyChip } from '../../console/primitives';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ModalShell } from '../../ui/ModalShell';
import {
  formatAmbulanceLabel,
  formId,
  getAmbulanceStatusTone,
} from './ambulanceModalModel';
import {
  AmbulanceLinkedWorkSection,
  AmbulanceStationSection,
  AmbulanceStatusSection,
  AmbulanceUnitSection,
} from './AmbulanceModalSections';

export const AmbulanceModalView = ({
  ambulance,
  canSubmit,
  closeModal,
  formData,
  handleChange,
  handleSubmit,
  hospitals,
  isAdminRole,
  isCreate,
  isOpen,
  isView,
  loading,
  loadingHospitals,
  modalTitle,
  selectedStationIsInScope,
  stationName,
  stationOutOfScope,
  status,
  tripOwnedStatus,
  updateField,
}) => {
  const modalSubtitle = ambulance?.display_id ? (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate">{stationName}</span>
      <span aria-hidden="true">&middot;</span>
      <span
        className="truncate font-mono text-[11px] font-medium tracking-wide"
        title={ambulance.display_id}
      >
        {ambulance.display_id}
      </span>
      <CopyChip value={ambulance.display_id} label="Copy unit ID" />
    </span>
  ) : stationName;

  const statusBadge = (
    <Badge className={`rounded-pill px-3 py-0.5 text-xs font-semibold ${getAmbulanceStatusTone(status)}`}>
      {formatAmbulanceLabel(status, 'Available')}
    </Badge>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => closeModal(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Ambulance className="h-5 w-5 text-primary" />}
      badge={statusBadge}
      size="lg"
      managed
      className="bg-background"
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => closeModal(false)}
            className="h-11 rounded-button px-5 font-semibold text-muted-foreground hover:bg-muted"
            disabled={loading}
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={formId}
              className="h-11 rounded-button bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              disabled={!canSubmit}
              aria-busy={loading}
              data-state={loading ? 'saving' : 'idle'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : isCreate ? 'Add unit' : 'Save changes'}
            </Button>
          )}
        </div>
      )}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-2 pt-1 md:p-8 md:pt-2 no-scrollbar">
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
          <AmbulanceUnitSection
            formData={formData}
            handleChange={handleChange}
            isView={isView}
            updateField={updateField}
          />
          <AmbulanceStationSection
            formData={formData}
            handleChange={handleChange}
            hospitals={hospitals}
            isAdminRole={isAdminRole}
            isView={isView}
            loadingHospitals={loadingHospitals}
            selectedStationIsInScope={selectedStationIsInScope}
            stationName={stationName}
            stationOutOfScope={stationOutOfScope}
            updateField={updateField}
          />
          <AmbulanceStatusSection
            formData={formData}
            handleChange={handleChange}
            isCreate={isCreate}
            isView={isView}
            status={status}
            tripOwnedStatus={tripOwnedStatus}
            updateField={updateField}
          />
          <AmbulanceLinkedWorkSection formData={formData} />
        </form>
      </div>
    </ModalShell>
  );
};
