'use client';

import React, { useEffect, useState } from 'react';
import { Ambulance, Building2, ExternalLink, Hospital, Loader2, Search, Stethoscope } from 'lucide-react';
import { onboardingService } from '../../services/onboardingService';
import { useOnboarding } from '../../contexts/OnboardingContext';

const ORGANIZATION_TYPES = [
  { value: 'hospital', label: 'Hospital', icon: Hospital },
  { value: 'clinic', label: 'Clinic', icon: Stethoscope },
  { value: 'ambulance_service', label: 'Ambulance', icon: Ambulance },
];

export const OrganizationTypeStep = () => {
  const { formData, updateFormData, setStepValid } = useOnboarding();
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isExistingMode = formData.organizationMode === 'existing';
  const query = String(
    isExistingMode ? formData.facilitySearch : formData.organizationName,
  ).trim();
  const isClaimType = ['hospital', 'clinic'].includes(formData.organizationType);
  const isValid = isExistingMode
    ? isClaimType && Boolean(formData.existingFacilityId)
    : Boolean(formData.organizationType) && query.length >= 2;

  useEffect(() => {
    setStepValid('organization', isValid);
  }, [isValid, setStepValid]);

  useEffect(() => {
    if (query.length < 3) {
      setMatches([]);
      setSearchError('');
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = await onboardingService.searchFacilities(query);
        if (active) setMatches(results);
      } catch (error) {
        if (active) {
          setMatches([]);
          setSearchError(error.message);
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 rounded-inner bg-foreground/[0.045] p-1 dark:bg-white/[0.06]" aria-label="Organization type">
        {ORGANIZATION_TYPES.map(({ value, label, icon: Icon }) => {
          const selected = formData.organizationType === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => updateFormData({
                organizationType: value,
                ...(value === 'ambulance_service'
                  ? {
                    organizationMode: 'new',
                    facilitySearch: '',
                    existingFacilityId: null,
                    existingFacilityName: '',
                    existingFacilityAddress: '',
                  }
                  : {}),
              })}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-button px-2 py-2 text-xs font-semibold transition-[background,color,box-shadow,transform] active:scale-[0.98] ${selected ? 'bg-background text-foreground shadow-e1' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="w-full truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 rounded-inner bg-foreground/[0.035] p-1 dark:bg-white/[0.05]" aria-label="Registration mode">
        {[
          { value: 'new', label: 'Register new' },
          { value: 'existing', label: 'Already listed' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={formData.organizationMode === option.value}
            disabled={option.value === 'existing' && formData.organizationType === 'ambulance_service'}
            onClick={() => updateFormData({
              organizationMode: option.value,
              facilitySearch: '',
              existingFacilityId: null,
              existingFacilityName: '',
              existingFacilityAddress: '',
              ...(option.value === 'new' ? { claimNote: '' } : {}),
            })}
            className={`h-10 flex-1 rounded-button px-3 text-sm font-semibold transition-[background,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-40 ${formData.organizationMode === option.value ? 'bg-background text-foreground shadow-e1' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="organization-name" className="sr-only">Organization or facility name</label>
        <div className="relative rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
          {searching ? (
            <Loader2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : isExistingMode ? (
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          )}
          <input
            id="organization-name"
            autoFocus
            type="text"
            value={isExistingMode ? formData.facilitySearch : formData.organizationName}
            onChange={(event) => updateFormData(isExistingMode
              ? {
                facilitySearch: event.target.value,
                existingFacilityId: null,
                existingFacilityName: '',
                existingFacilityAddress: '',
              }
              : { organizationName: event.target.value })}
            placeholder={isExistingMode ? 'Search by facility name or address' : 'Organization name'}
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base placeholder:text-muted-foreground/60"
          />
        </div>
        {searchError && <p role="alert" className="mt-2 px-1 text-xs font-medium text-destructive">{searchError}</p>}
      </div>

      {query.length >= 3 && !searchError && (
        <div className="space-y-2" aria-live="polite">
          {matches.length > 0 ? matches.map((facility) => {
            const selected = formData.existingFacilityId === facility.id;
            const claimable = facility.claimable === true;
            const statusLabel = claimable
              ? 'Available for review'
              : facility.ownership_state === 'owned'
                ? 'Already managed'
                : 'Review in progress';

            return (
            <button
              key={facility.id}
              type="button"
              disabled={!isExistingMode || !claimable}
              aria-pressed={selected}
              onClick={() => updateFormData({
                existingFacilityId: facility.id,
                existingFacilityName: facility.name,
                existingFacilityAddress: facility.address,
                organizationType: facility.provider_type === 'clinic' ? 'clinic' : 'hospital',
              })}
              className={`flex w-full items-start gap-3 rounded-inner p-3 text-left transition-[background,box-shadow,transform] disabled:cursor-default ${selected ? 'bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.25)]' : 'bg-foreground/[0.035] dark:bg-white/[0.05]'} ${isExistingMode && claimable ? 'hover:bg-foreground/[0.06] active:scale-[0.995]' : ''}`}
            >
              <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-icon bg-background text-muted-foreground shadow-e1">
                <Hospital className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{facility.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{facility.address}</p>
              </div>
              <span className={`rounded-pill px-2 py-1 text-[10px] font-semibold ${claimable ? 'bg-sky-500/10 text-sky-800 dark:text-sky-200' : 'bg-foreground/[0.055] text-muted-foreground'}`}>
                {selected ? 'Selected' : statusLabel}
              </span>
            </button>
            );
          }) : !searching && isExistingMode ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No matching facility found.</p>
          ) : null}
        </div>
      )}

      {isExistingMode && (
        <div className="rounded-inner bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-semibold">
            {formData.existingFacilityId ? 'Ownership review selected' : 'Existing access needs review'}
          </p>
          <p className="mt-1 leading-5 opacity-80">
            {formData.existingFacilityId
              ? 'Continue with your organization details and evidence. Selection does not transfer or verify this facility.'
              : 'Select an unowned listing to submit evidence. Managed facilities require an invitation from their current administrator.'}
          </p>
          {!formData.existingFacilityId && (
            <a href="mailto:support@ivisit.ng" className="mt-3 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4">
              Contact support <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationTypeStep;
