import React, { useEffect, useState } from 'react';
import { Hospital, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import { CopyChip } from '../console/primitives';
import { HospitalCapacitySection } from './hospital/HospitalCapacitySection';
import {
  HospitalFacilityDetailsSection,
  HospitalLocationSection,
  HospitalSystemSection,
} from './hospital/HospitalDetailsSections';
import {
  buildHospitalSavePayload,
  buildInitialHospitalForm,
  HOSPITAL_FORM_ID,
  toIntOrZero,
} from './hospital/hospitalModalModel';
import { useHospitalBedData } from './hospital/useHospitalBedData';

export { buildHospitalSavePayload } from './hospital/hospitalModalModel';

// Create mode stays unavailable until the backend exposes a proved insert
// receiver. This modal therefore owns view and edit behavior only.
export const HospitalModal = ({ isOpen, onClose, hospital, mode, onSave }) => {
  const isView = mode === 'view';
  const { isAdmin } = useAuth();
  const canManageVerification = Boolean(isAdmin?.());
  const hospitalId = hospital?.id;
  const [formData, setFormData] = useState(() => buildInitialHospitalForm(hospital));
  const [loading, setLoading] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const {
    activeReservations,
    bedUtilization,
    loadBedData,
    loadingReservations,
    reservationError,
  } = useHospitalBedData({ hospitalId, isOpen, isView });

  useEffect(() => {
    setFormData(buildInitialHospitalForm(hospital));
  }, [hospital, mode, isOpen]);

  const totalBeds = toIntOrZero(formData.total_beds);
  const availableBeds = toIntOrZero(formData.available_beds);
  const reservedBedsDisplay = isView && bedUtilization
    ? toIntOrZero(bedUtilization.reserved_beds)
    : Math.max(0, totalBeds - availableBeds);
  const bedUtilizationPercent = totalBeds > 0
    ? Math.min(Math.round(((totalBeds - availableBeds) / totalBeds) * 100), 100)
    : 0;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const numericFields = new Set([
      'rating',
      'available_beds',
      'icu_beds_available',
      'total_beds',
      'ambulances_count',
      'emergency_wait_time_minutes',
      'latitude',
      'longitude',
    ]);
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox'
        ? checked
        : numericFields.has(name)
          ? (value === '' ? 0 : Number(value))
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSave) {
      console.error('HospitalModal: onSave prop is required but was not provided');
      toast.error('Configuration error: cannot save. Please reload the page.');
      return;
    }
    setLoading(true);

    try {
      await onSave(buildHospitalSavePayload(formData, canManageVerification));
      onClose();
    } catch (error) {
      console.error('Error saving hospital:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose()}
      title={formData.name || 'Facility record'}
      subtitle={hospital?.display_id ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          {formData.type && <span className="truncate">{formData.type}</span>}
          {formData.type && <span aria-hidden="true">&middot;</span>}
          <span className="truncate font-mono text-[11px] font-medium tracking-wide" title={hospital.display_id}>
            {hospital.display_id}
          </span>
          <CopyChip value={hospital.display_id} label="Copy record ID" />
        </span>
      ) : formData.type}
      icon={<Hospital className="h-5 w-5 text-blue-500 md:h-6 md:w-6" />}
      badge={(
        <Badge className={`rounded-pill px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${formData.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
          {formData.status || 'AVAILABLE'}
        </Badge>
      )}
      size="lg"
      managed
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose()}
            className="h-12 rounded-button bg-muted/60 px-8 font-semibold active:scale-[0.96]"
            disabled={loading}
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={HOSPITAL_FORM_ID}
              disabled={loading}
              className="h-12 rounded-button bg-primary px-10 font-semibold text-primary-foreground active:scale-[0.96] hover:bg-primary/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      )}
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-2 pt-2 no-scrollbar md:p-8 md:pt-2">
        <form id={HOSPITAL_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <HospitalFacilityDetailsSection
            formData={formData}
            handleChange={handleChange}
            isView={isView}
            setFormData={setFormData}
          />
          <HospitalCapacitySection
            activeReservations={activeReservations}
            availableBeds={availableBeds}
            bedUtilizationPercent={bedUtilizationPercent}
            formData={formData}
            handleChange={handleChange}
            isView={isView}
            loadBedData={loadBedData}
            loadingReservations={loadingReservations}
            reservationError={reservationError}
            reservedBedsDisplay={reservedBedsDisplay}
          />
          <HospitalLocationSection
            formData={formData}
            handleChange={handleChange}
            isView={isView}
            setFormData={setFormData}
          />
          <HospitalSystemSection
            canManageVerification={canManageVerification}
            formData={formData}
            handleChange={handleChange}
            hospital={hospital}
            isView={isView}
            setShowImage={setShowImage}
            showImage={showImage}
          />
        </form>
      </div>
    </ModalShell>
  );
};
