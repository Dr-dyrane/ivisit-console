"use client";

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Building2,
  CreditCard,
  Edit,
  FileText,
  Hash,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ModalShell } from '../ui/ModalShell';
import { CopyChip } from '../console/primitives';

// The view mode is reachable from desktop and mobile Details actions. Create/edit modes remain
// unreachable from the active page: every write intent is converted to the page's fail-closed
// organization-authority notice, and this modal imports no organization write service.
const EMPTY_FORM = {
  name: '',
  contact_email: '',
  ivisit_fee_percentage: '',
  is_active: true,
  stripe_account_id: '',
};
const formId = 'organization-modal-form';

// ADOPT-51/52 (read-surfacing): registry-identity and payout columns are proven in
// types/database.ts (organizations Row carries contact_phone, registration_number,
// state, fee_tier, stripe_account_id) and arrive via the page read's select('*').
// Population of the registry columns is unverified, so they hide when null -- no
// placeholder rows. The raw acct_ id stays modal-only (admin surface), never row/rail.
const toDisplayText = (value) => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
};

const formatTierLabel = (value) => {
  const text = toDisplayText(value);
  if (!text) return null;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ReadOnlyField = ({ label, value, icon: Icon, fallback = 'Not available', copyLabel, mono = false }) => (
  <div className="space-y-2">
    <p className="px-1 text-xs font-semibold text-muted-foreground">{label}</p>
    <div className="flex min-h-12 items-center gap-3 rounded-inner bg-foreground/[0.05] px-3 py-2.5 dark:bg-white/[0.06]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className={`min-w-0 break-words font-medium text-foreground ${mono && value ? 'font-mono text-xs' : 'text-sm'}`}>
        {value || fallback}
      </p>
      {value && copyLabel ? <CopyChip value={value} label={copyLabel} /> : null}
    </div>
  </div>
);

export const OrganizationModal = ({ isOpen, onClose, organization, mode = 'create', onSave }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        ...EMPTY_FORM,
        ...organization,
        name: organization.name || '',
        contact_email: organization.contact_email || '',
        ivisit_fee_percentage: organization.ivisit_fee_percentage ?? '',
        is_active: organization.is_active !== undefined ? organization.is_active : true,
        stripe_account_id: organization.stripe_account_id || '',
      });
    } else if (isCreate) {
      setFormData(EMPTY_FORM);
    }
  }, [organization, isCreate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave?.(event);
    } finally {
      setLoading(false);
    }
  };

  // ADOPT-51: operator re-key values (phone, raw acct_ id) render copyable in view mode.
  // ADOPT-52: registry identity (registration_number, state, fee_tier) is hide-when-null.
  const contactPhone = toDisplayText(organization?.contact_phone);
  const stripeAccountId = toDisplayText(organization?.stripe_account_id);
  const registrationNumber = toDisplayText(organization?.registration_number);
  const stateValue = toDisplayText(organization?.state);
  const feeTierLabel = formatTierLabel(organization?.fee_tier);

  const title = isView
    ? (formData.name || 'Organization details')
    : isCreate
      ? 'New organization'
      : 'Edit organization';
  const subtitle = isView
    ? 'Registry identity and payout-readiness evidence'
    : 'Organization changes are not available from this page.';
  const icon = isCreate
    ? <Plus className="h-5 w-5 text-sky-500" />
    : isEdit
      ? <Edit className="h-5 w-5 text-sky-500" />
      : <Building2 className="h-5 w-5 text-sky-500" />;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose()}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size="lg"
      managed
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose()}
            disabled={loading}
            className="h-11 rounded-button bg-muted/40 px-7 font-semibold active:scale-[0.96]"
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={formId}
              disabled={loading}
              aria-busy={loading}
              className="h-11 rounded-button bg-foreground px-8 font-semibold text-background hover:bg-foreground/90 active:scale-[0.96]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isCreate ? 'Create organization' : 'Save changes'}
            </Button>
          )}
        </div>
      )}
    >
      <form id={formId} onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
          {isView ? (
            <section className="grid gap-4 rounded-card bg-foreground/[0.035] p-4 dark:bg-white/[0.045] sm:grid-cols-2 sm:p-5">
              <ReadOnlyField label="Organization ID" value={organization?.display_id || organization?.id} icon={Hash} />
              <ReadOnlyField label="Status" value={formData.is_active ? 'Active' : 'Inactive'} icon={Activity} />
              {registrationNumber && (
                <ReadOnlyField label="Registration number" value={registrationNumber} icon={FileText} />
              )}
              {stateValue && (
                <ReadOnlyField label="State" value={stateValue} icon={MapPin} />
              )}
              <ReadOnlyField label="Contact email" value={formData.contact_email} icon={Mail} />
              <ReadOnlyField
                label="Contact phone"
                value={contactPhone}
                icon={Phone}
                copyLabel="Copy contact phone"
              />
              <ReadOnlyField
                label="Stripe account"
                value={stripeAccountId}
                icon={CreditCard}
                copyLabel="Copy Stripe account ID"
                mono
                fallback="Not connected"
              />
              {feeTierLabel && (
                <ReadOnlyField label="Fee tier" value={feeTierLabel} icon={Layers} />
              )}
              <ReadOnlyField
                label="Configured fee"
                value={formData.ivisit_fee_percentage === '' ? 'Not available' : `${formData.ivisit_fee_percentage}%`}
                icon={Percent}
              />
            </section>
          ) : (
            <section className="space-y-4 rounded-card bg-foreground/[0.035] p-4 dark:bg-white/[0.045] sm:p-5">
              <div className="space-y-2">
                <Label htmlFor="org-name" className="px-1 text-xs font-semibold text-muted-foreground">Name</Label>
                <Input
                  id="org-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="h-12 rounded-inner bg-foreground/[0.05] font-semibold shadow-none dark:bg-white/[0.06]"
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email" className="px-1 text-xs font-semibold text-muted-foreground">Contact email</Label>
                <Input
                  id="org-email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="h-12 rounded-inner bg-foreground/[0.05] shadow-none dark:bg-white/[0.06]"
                  placeholder="admin@org.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-stripe" className="px-1 text-xs font-semibold text-muted-foreground">Connected Stripe ID</Label>
                <Input
                  id="org-stripe"
                  name="stripe_account_id"
                  value={formData.stripe_account_id}
                  onChange={handleChange}
                  className="h-12 rounded-inner bg-foreground/[0.05] font-mono text-xs shadow-none dark:bg-white/[0.06]"
                  placeholder="acct_..."
                />
              </div>
            </section>
          )}
        </div>
      </form>
    </ModalShell>
  );
};

export default OrganizationModal;
