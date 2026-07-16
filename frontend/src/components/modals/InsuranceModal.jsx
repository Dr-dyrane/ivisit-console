"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  CreditCard,
  FileImage,
  FileText,
  ReceiptText,
  Shield,
} from 'lucide-react';
import {
  EMPTY_INSURANCE_BILLING_REFERENCES,
  getInsuranceBillingOutcomes,
  resolveInsuranceBillingReferences,
} from '../../services/insuranceService';
import { resolveVital } from '../../constants/vitalTracks';
import { CopyChip } from '../console/primitives';
import { formatInsuranceLinkedPayment } from '../pages/insurance/insurancePageModel';

const formatText = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatRaw = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString();
};

const formatMoney = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return 'Not set';
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString()}` : 'Not set';
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}%` : 'Not recorded';
};

const shortenUuid = (value) => {
  const text = String(value || '').trim();
  return text.length > 12 ? `${text.slice(0, 8)}...` : text;
};

export const InsuranceModal = ({
  isOpen,
  policy,
  mode,
  onClose,
}) => {
  const [billingOutcomes, setBillingOutcomes] = useState([]);
  const [billingReferences, setBillingReferences] = useState(
    EMPTY_INSURANCE_BILLING_REFERENCES
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const isBlockedCommand = mode === 'create' || mode === 'edit';
  const title = isBlockedCommand ? 'Policy changes unavailable' : 'Policy details';
  const subtitle = isBlockedCommand
    ? 'Policy changes are not available from this page.'
    : formatRaw(policy?.provider_name, 'Review policy record.');
  const policyVital = resolveVital('insurance', policy?.status || 'unknown');
  const status = policyVital?.pill?.label || formatText(policy?.status || 'unknown', 'Unknown');
  const statusBadge = policy ? (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold ${policyVital?.pill?.className || 'bg-muted/30 text-muted-foreground'}`}>
        {status}
      </span>
      {policy.is_default === true && (
        <span className="inline-flex items-center rounded-pill bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
          Default policy
        </span>
      )}
    </span>
  ) : null;

  useEffect(() => {
    if (!isOpen || !policy?.id) {
      setBillingOutcomes([]);
      setBillingReferences(EMPTY_INSURANCE_BILLING_REFERENCES);
      setBillingError(null);
      setBillingLoading(false);
      return undefined;
    }

    let isActive = true;
    const fetchBillingOutcomes = async () => {
      try {
        setBillingLoading(true);
        setBillingError(null);
        setBillingReferences(EMPTY_INSURANCE_BILLING_REFERENCES);
        const page = await getInsuranceBillingOutcomes({
          policyId: policy.id,
          limit: 5,
          sortKey: 'created_at',
          sortDirection: 'desc',
          quiet: true,
        });

        if (!isActive) return;
        if (page.denied) {
          setBillingOutcomes([]);
          setBillingError('Billing outcomes are unavailable for this role.');
          return;
        }
        if (page.failed) {
          setBillingError('Billing outcomes could not load.');
          return;
        }

        const outcomes = page.data || [];
        setBillingOutcomes(outcomes);

        // Read-only label resolution runs AFTER the billing window lands; an
        // unresolved reference keeps the truncated UUID fallback below.
        const references = await resolveInsuranceBillingReferences(outcomes);
        if (!isActive) return;
        setBillingReferences(references);
      } catch {
        if (!isActive) return;
        setBillingOutcomes([]);
        setBillingError('Billing outcomes could not load.');
      } finally {
        if (isActive) setBillingLoading(false);
      }
    };

    fetchBillingOutcomes();

    return () => {
      isActive = false;
    };
  }, [isOpen, policy?.id]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={title}
      subtitle={subtitle}
      icon={<Shield className="h-5 w-5 text-muted-foreground" />}
      badge={statusBadge}
      size="lg"
      managed
      className="bg-background"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 md:px-6 pb-4 md:pb-6 space-y-4">
          <Notice
            icon={isBlockedCommand ? AlertTriangle : FileText}
            tone={isBlockedCommand ? 'warning' : 'muted'}
            title={isBlockedCommand ? 'Changes unavailable' : 'Policy record'}
            text={
              isBlockedCommand
                ? 'Policy changes, verification, deletion, and card uploads are not available here.'
                : 'Review the policy details and billing outcomes recorded for this account.'
            }
          />

          {policy ? (
            <>
              <Section icon={<Building />} title="Member and provider">
                <Field label="Policy holder" value={formatRaw(policy.policy_holder_name)} />
                <Field label="Provider" value={formatRaw(policy.provider_name)} />
                <Field label="Policy number" value={formatRaw(policy.policy_number)} mono />
                <Field label="Group number" value={formatRaw(policy.group_number)} mono />
              </Section>

              <Section icon={<Calendar />} title="Coverage">
                <Field label="Plan type" value={formatText(policy.policy_type || policy.coverage_type || policy.plan_type)} />
                <Field label="Coverage percentage" value={formatPercentage(policy.coverage_percentage)} />
                <Field label="Start date" value={formatDate(policy.start_date)} />
                <Field label="End date" value={formatDate(policy.end_date)} />
                <Field label="Linked payment" value={formatInsuranceLinkedPayment(policy.linked_payment_method)} />
              </Section>

              <Section icon={<CheckCircle />} title="Review state">
                <Field label="Status" value={status} />
                <Field label="Verified" value={policy.verified ? 'Verified' : 'Not verified'} />
                <Field label="Created" value={formatDate(policy.created_at)} />
                <Field label="Updated" value={formatDate(policy.updated_at)} />
              </Section>

              <BillingOutcomeSection
                outcomes={billingOutcomes}
                references={billingReferences}
                loading={billingLoading}
                error={billingError}
              />

              <Section icon={<FileImage />} title="Insurance card">
                <CardImage label="Front" src={policy.front_image_url} />
                <CardImage label="Back" src={policy.back_image_url} />
              </Section>
            </>
          ) : (
            <div className="rounded-card bg-muted/25 p-6 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-base font-semibold">No policy selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a policy from the list to review its details.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 bg-muted/15 px-4 md:px-6 py-4 flex justify-end">
          <Button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-button px-6"
          >
            Close
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

const Section = ({ icon, title, children }) => (
  <section className="rounded-card bg-muted/25 p-4 md:p-5">
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-icon bg-muted p-2 text-muted-foreground">
        {React.cloneElement(icon, { className: 'h-4 w-4' })}
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {children}
    </div>
  </section>
);

const BillingOutcomeSection = ({ outcomes, references, loading, error }) => (
  <Section icon={<ReceiptText />} title="Billing outcomes">
    <div className="md:col-span-2 space-y-3">
      {loading && (
        <div className="rounded-inner bg-background/45 p-3 text-sm text-muted-foreground">
          Loading billing outcomes
        </div>
      )}

      {!loading && error && (
        <div className="rounded-inner bg-background/45 p-3 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!loading && !error && outcomes.length === 0 && (
        <div className="rounded-inner bg-background/45 p-3 text-sm text-muted-foreground">
          No billing outcomes are linked to this policy yet.
        </div>
      )}

      {!loading && !error && outcomes.map((outcome) => (
        <div key={outcome.id} className="rounded-inner bg-background/45 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {outcome.claim_number || `Claim ${String(outcome.id || '').slice(0, 8)}`}
              </div>
              <div className="text-xs text-muted-foreground">
                Billed {formatDate(outcome.billing_date || outcome.created_at)}
              </div>
            </div>
            <span className={`inline-flex shrink-0 items-center rounded-pill px-3 py-1 text-xs font-semibold ${getBillingStatusClass(outcome.status)}`}>
              {formatText(outcome.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Field label="Total" value={formatMoney(outcome.total_amount)} />
            <Field label="Insurance" value={formatMoney(outcome.insurance_amount)} />
            <Field label="Patient" value={formatMoney(outcome.user_amount)} />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="Applied coverage" value={formatPercentage(outcome.coverage_percentage)} />
            <Field label="Paid date" value={formatDate(outcome.paid_date)} />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <ReferenceField
              label="Member"
              id={outcome.user_id}
              resolvedLabel={references?.memberNamesById?.[outcome.user_id]}
              missingText="Not recorded"
              copyLabel="Copy member ID"
            />
            <ReferenceField
              label="Request"
              id={outcome.emergency_request_id}
              resolvedLabel={references?.requestDisplayIdsById?.[outcome.emergency_request_id]}
              missingText="Not linked"
              copyLabel="Copy request ID"
              mono
            />
            <ReferenceField
              label="Hospital"
              id={outcome.hospital_id}
              resolvedLabel={references?.hospitalNamesById?.[outcome.hospital_id]}
              missingText="Not linked"
              copyLabel="Copy hospital ID"
            />
          </div>
        </div>
      ))}
    </div>
  </Section>
);

const getBillingStatusClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
    case 'approved':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-200';
    case 'rejected':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
  }
};

const Field = ({ label, value, mono = false }) => (
  <div className="rounded-inner bg-background/45 p-3">
    <div className="text-xs font-semibold text-muted-foreground">
      {label}
    </div>
    <div className={`mt-1 text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
      {value}
    </div>
  </div>
);

// Billing reference cell: resolved human label when the batched read-only
// lookup found one, otherwise the truncated UUID with a copy affordance.
// A missing reference renders honest absence -- never a fabricated name.
const ReferenceField = ({ label, id, resolvedLabel, missingText, copyLabel, mono = false }) => {
  if (!id) return <Field label={label} value={missingText} />;
  if (resolvedLabel) return <Field label={label} value={resolvedLabel} mono={mono} />;

  return (
    <div className="rounded-inner bg-background/45 p-3">
      <div className="text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="truncate font-mono text-sm font-medium text-foreground" title={String(id)}>
          {shortenUuid(id)}
        </span>
        <CopyChip value={id} label={copyLabel} />
      </div>
    </div>
  );
};

const CardImage = ({ label, src }) => {
  const hasImageReference = Boolean(String(src || '').trim());

  return (
    <div className="rounded-inner bg-background/45 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">
          {label}
        </div>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex aspect-video flex-col items-center justify-center rounded-inner bg-muted/30 px-4 text-center">
        <FileImage className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">
          {hasImageReference ? 'Image reference on file' : 'No card image'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasImageReference
            ? 'Preview stays unavailable until the storage path is verified.'
            : 'No stored card reference is available.'}
        </p>
      </div>
    </div>
  );
};

const Notice = ({ icon: Icon, tone, title, text }) => {
  const toneClass = tone === 'warning'
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
    : 'bg-muted/25 text-muted-foreground';

  return (
    <div className={`rounded-card p-4 ${toneClass}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default InsuranceModal;
