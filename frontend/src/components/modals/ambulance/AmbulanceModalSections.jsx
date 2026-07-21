import React from 'react';
import {
  Activity,
  Ambulance,
  Calendar,
  Hospital,
  MapPin,
  Shield,
  UserCheck,
  Wrench,
} from 'lucide-react';

import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  formatAmbulanceDateTime,
  formatAmbulanceLabel,
  getAmbulanceCurrentCallLabel,
  TYPE_OPTIONS,
  UNIT_STATUS_OPTIONS,
} from './ambulanceModalModel';
import {
  AmbulanceFieldGroup,
  AmbulanceModalCard,
  AmbulanceReadOnlyField,
  AmbulanceUnavailableNote,
} from './AmbulanceModalPrimitives';

const modalFieldClassName = 'rounded-button bg-muted/30 shadow-[0_14px_34px_rgb(0_0_0/0.06)] transition-[background,box-shadow] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:bg-background/80 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16),0_18px_38px_rgb(0_0_0/0.10)] dark:bg-white/[0.06] dark:focus-visible:bg-white/[0.09]';
const modalSelectContentClassName = 'rounded-inner bg-background/95 shadow-xl backdrop-blur-xl';

export const AmbulanceUnitSection = ({ formData, handleChange, isView, updateField }) => (
  <AmbulanceModalCard icon={<Activity />} title="Unit">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AmbulanceFieldGroup label="Call sign" htmlFor="ambulance-call-sign">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formData.call_sign || 'Unknown unit'}
            icon={<Ambulance className="h-4 w-4" />}
          />
        ) : (
          <Input
            id="ambulance-call-sign"
            name="call_sign"
            value={formData.call_sign}
            onChange={handleChange}
            className={`${modalFieldClassName} h-12 font-semibold`}
            placeholder="D-AMB-1"
          />
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Type">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formatAmbulanceLabel(formData.type, 'Unit')}
            icon={<Shield className="h-4 w-4" />}
          />
        ) : (
          <Select value={formData.type} onValueChange={(value) => updateField('type', value)}>
            <SelectTrigger className={`${modalFieldClassName} h-12`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={modalSelectContentClassName}>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Vehicle number" htmlFor="ambulance-vehicle-number">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formData.vehicle_number || 'No vehicle number'}
            icon={<Shield className="h-4 w-4" />}
          />
        ) : (
          <Input
            id="ambulance-vehicle-number"
            name="vehicle_number"
            value={formData.vehicle_number}
            onChange={handleChange}
            className={`${modalFieldClassName} h-12 font-mono`}
            placeholder="COV-GUES-1"
          />
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Plate" htmlFor="ambulance-license-plate">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formData.license_plate || 'No plate'}
            icon={<Shield className="h-4 w-4" />}
          />
        ) : (
          <Input
            id="ambulance-license-plate"
            name="license_plate"
            value={formData.license_plate}
            onChange={handleChange}
            className={`${modalFieldClassName} h-12 font-mono`}
            placeholder="Plate"
          />
        )}
      </AmbulanceFieldGroup>
    </div>
  </AmbulanceModalCard>
);

export const AmbulanceStationSection = ({
  formData,
  handleChange,
  hospitals,
  isAdminRole,
  isView,
  loadingHospitals,
  selectedStationIsInScope,
  stationName,
  stationOutOfScope,
  updateField,
}) => (
  <AmbulanceModalCard icon={<Hospital />} title="Station">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AmbulanceFieldGroup label="Base station">
        {isView ? (
          <AmbulanceReadOnlyField
            value={stationName}
            subtext={formData.hospital_id || ''}
            icon={<MapPin className="h-4 w-4" />}
          />
        ) : (
          <Select
            value={selectedStationIsInScope ? (formData.hospital_id || '') : ''}
            onValueChange={(value) => updateField('hospital_id', value)}
          >
            <SelectTrigger className={`${modalFieldClassName} h-12`}>
              <SelectValue
                placeholder={loadingHospitals
                  ? 'Loading stations...'
                  : (stationOutOfScope ? 'Select an authorized station' : 'Select station')}
              />
            </SelectTrigger>
            <SelectContent className={modalSelectContentClassName}>
              {isAdminRole && formData.hospital_id && !hospitals.some((hospital) => hospital.id === formData.hospital_id) && (
                <SelectItem value={formData.hospital_id}>{stationName}</SelectItem>
              )}
              {hospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {stationOutOfScope && (
          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-200" role="alert">
            This station is outside your organization. Select an authorized station before saving.
          </p>
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="ETA" htmlFor="ambulance-eta">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formatAmbulanceDateTime(formData.eta)}
            icon={<Calendar className="h-4 w-4" />}
          />
        ) : (
          <Input
            id="ambulance-eta"
            name="eta"
            type="datetime-local"
            value={formData.eta}
            onChange={handleChange}
            className={`${modalFieldClassName} h-12`}
            placeholder="Unknown"
          />
        )}
      </AmbulanceFieldGroup>
    </div>
  </AmbulanceModalCard>
);

export const AmbulanceStatusSection = ({
  formData,
  handleChange,
  isCreate,
  isView,
  status,
  tripOwnedStatus,
  updateField,
}) => (
  <AmbulanceModalCard icon={<Wrench />} title="Status">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AmbulanceFieldGroup label="Current status">
        {!isCreate ? (
          <AmbulanceReadOnlyField
            value={formatAmbulanceLabel(status, 'Available')}
            subtext={tripOwnedStatus
              ? 'Trip status changes stay in Requests.'
              : 'Status changes require the authorized fleet workflow.'}
            icon={<Activity className="h-4 w-4" />}
          />
        ) : (
          <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
            <SelectTrigger className={`${modalFieldClassName} h-12`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={modalSelectContentClassName}>
              {UNIT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Crew (comma separated)" htmlFor="ambulance-crew">
        {isView ? (
          <AmbulanceReadOnlyField
            value={formData.crew || 'Not listed'}
            icon={<UserCheck className="h-4 w-4" />}
          />
        ) : (
          <Input
            id="ambulance-crew"
            name="crew"
            value={formData.crew}
            onChange={handleChange}
            className={`${modalFieldClassName} h-12`}
            placeholder="Ada N., Bola O."
          />
        )}
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Current call">
        <AmbulanceReadOnlyField
          value={getAmbulanceCurrentCallLabel(formData)}
          subtext={isView ? '' : 'Set by dispatch in Requests.'}
          icon={<Activity className="h-4 w-4" />}
        />
      </AmbulanceFieldGroup>

      <AmbulanceFieldGroup label="Updated">
        <AmbulanceReadOnlyField
          value={formatAmbulanceDateTime(formData.updated_at)}
          icon={<Calendar className="h-4 w-4" />}
        />
      </AmbulanceFieldGroup>
    </div>
  </AmbulanceModalCard>
);

export const AmbulanceLinkedWorkSection = ({ formData }) => (
  <AmbulanceModalCard icon={<UserCheck />} title="Linked work">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <AmbulanceUnavailableNote
        title="Driver link"
        text={formData.profile_id
          ? 'Linked profile is read-only in this pass.'
          : 'Driver assignment needs provider and station proof.'}
      />
      <AmbulanceUnavailableNote
        title="Image"
        text={formData.image
          ? 'Existing media is not edited here yet.'
          : 'Media upload needs storage policy proof.'}
      />
      <AmbulanceUnavailableNote
        title="Trip commands"
        text="Arrival, completion, and cancellation stay in Requests or Map."
      />
    </div>
  </AmbulanceModalCard>
);
