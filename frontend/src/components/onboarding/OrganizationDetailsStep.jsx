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
    formData.address.trim().length >= 4
    && formData.city.trim().length >= 2
    && formData.state.trim().length >= 2
    && emailPattern.test(formData.contactEmail.trim())
  );

  useEffect(() => {
    setStepValid('essentials', isValid);
  }, [isValid, setStepValid]);

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default OrganizationDetailsStep;
