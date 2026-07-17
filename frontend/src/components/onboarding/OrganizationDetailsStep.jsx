'use client';

import React, { useEffect } from 'react';
import { Building2, Hash, Mail, MapPin, Phone } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Field = ({ id, icon: Icon, label, ...inputProps }) => (
  <label htmlFor={id} className="block">
    <span className="sr-only">{label}</span>
    <span className="relative block rounded-inner bg-foreground/[0.045] transition-colors focus-within:bg-foreground/[0.07] dark:bg-white/[0.06] dark:focus-within:bg-white/[0.09]">
      <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input id={id} className="h-14 w-full bg-transparent pl-12 pr-4 text-base placeholder:text-muted-foreground/60" {...inputProps} />
    </span>
  </label>
);

export const OrganizationDetailsStep = () => {
  const { formData, updateFormData, setStepValid } = useOnboarding();

  const isValid = (
    formData.organizationName.trim().length >= 2
    && formData.address.trim().length >= 4
    && formData.city.trim().length >= 2
    && formData.state.trim().length >= 2
    && emailPattern.test(formData.contactEmail.trim())
  );

  useEffect(() => {
    setStepValid('essentials', isValid);
  }, [isValid, setStepValid]);

  return (
    <div className="space-y-4">
      {formData.organizationMode === 'existing' && (
        <>
          <div className="rounded-inner bg-sky-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase text-sky-800 dark:text-sky-200">Facility claim</p>
            <p className="mt-1 text-sm font-semibold">{formData.existingFacilityName}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{formData.existingFacilityAddress}</p>
          </div>
          <Field
            id="organization-legal-name"
            icon={Building2}
            label="Organization legal name"
            type="text"
            value={formData.organizationName}
            onChange={(event) => updateFormData({ organizationName: event.target.value })}
            placeholder="Organization legal name"
            autoComplete="organization"
          />
        </>
      )}

      <Field
        id="registration-number"
        icon={Hash}
        label="Registration number"
        type="text"
        value={formData.registrationNumber}
        onChange={(event) => updateFormData({ registrationNumber: event.target.value })}
        placeholder="Registration number (optional)"
        autoComplete="off"
      />

      <Field
        id="organization-email"
        icon={Mail}
        label="Organization email"
        type="email"
        value={formData.contactEmail}
        onChange={(event) => updateFormData({ contactEmail: event.target.value })}
        placeholder="Organization email"
        autoComplete="email"
      />

      <Field
        id="organization-phone"
        icon={Phone}
        label="Organization phone"
        type="tel"
        value={formData.phone}
        onChange={(event) => updateFormData({ phone: event.target.value })}
        placeholder="Phone (optional)"
        autoComplete="tel"
      />

      <Field
        id="organization-address"
        icon={Building2}
        label="Street address"
        type="text"
        value={formData.address}
        onChange={(event) => updateFormData({ address: event.target.value })}
        placeholder="Street address"
        autoComplete="street-address"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="organization-city"
          icon={MapPin}
          label="City"
          type="text"
          value={formData.city}
          onChange={(event) => updateFormData({ city: event.target.value })}
          placeholder="City"
          autoComplete="address-level2"
        />
        <Field
          id="organization-state"
          icon={MapPin}
          label="State"
          type="text"
          value={formData.state}
          onChange={(event) => updateFormData({ state: event.target.value })}
          placeholder="State"
          autoComplete="address-level1"
        />
      </div>

      {formData.organizationMode === 'existing' && (
        <label htmlFor="facility-claim-note" className="block">
          <span className="sr-only">Ownership context</span>
          <textarea
            id="facility-claim-note"
            value={formData.claimNote}
            onChange={(event) => updateFormData({ claimNote: event.target.value.slice(0, 1000) })}
            placeholder="Your relationship to this facility (optional)"
            rows={3}
            className="w-full resize-none rounded-inner bg-foreground/[0.045] px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:bg-foreground/[0.07] dark:bg-white/[0.06]"
          />
        </label>
      )}
    </div>
  );
};

export default OrganizationDetailsStep;
