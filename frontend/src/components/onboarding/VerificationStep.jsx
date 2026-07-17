'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, FileText, Mail, MapPin, Plus, Trash2, Upload } from 'lucide-react';
import { ONBOARDING_DOCUMENT_RULES } from '../../services/onboardingService';
import { useOnboarding } from '../../contexts/OnboardingContext';

const formatSize = (bytes) => `${Math.max(bytes / (1024 * 1024), 0.01).toFixed(1)} MB`;

const SUMMARY_ROWS = [
  { key: 'organization', icon: Building2, label: 'Organization' },
  { key: 'email', icon: Mail, label: 'Contact' },
  { key: 'address', icon: MapPin, label: 'Address' },
];

export const VerificationStep = () => {
  const { formData, updateFormData, setStepValid } = useOnboarding();
  const inputRef = useRef(null);
  const [documentError, setDocumentError] = useState('');

  const documentsValid = formData.documents.length > 0 && formData.documents.every(({ file }) => (
    ONBOARDING_DOCUMENT_RULES.acceptedTypes.includes(file?.type)
    && file.size > 0
    && file.size <= ONBOARDING_DOCUMENT_RULES.maxDocumentSize
  ));
  const isValid = formData.termsAccepted && documentsValid;

  useEffect(() => {
    setStepValid('review', isValid);
  }, [isValid, setStepValid]);

  const summaryValues = {
    organization: `${formData.organizationName} - ${String(formData.organizationType || '').replace('_', ' ')}`,
    email: formData.contactEmail,
    address: [formData.address, formData.city, formData.state].filter(Boolean).join(', '),
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    const next = [...formData.documents];
    for (const file of selected) {
      if (next.length >= ONBOARDING_DOCUMENT_RULES.maxDocuments) {
        setDocumentError(`Choose no more than ${ONBOARDING_DOCUMENT_RULES.maxDocuments} documents.`);
        break;
      }
      if (!ONBOARDING_DOCUMENT_RULES.acceptedTypes.includes(file.type) || file.size > ONBOARDING_DOCUMENT_RULES.maxDocumentSize) {
        setDocumentError('Use PDF, JPG, or PNG files up to 10 MB each.');
        continue;
      }
      next.push({ file, documentType: next.length === 0 ? 'registration' : 'license' });
      setDocumentError('');
    }
    updateFormData({ documents: next });
  };

  const updateDocumentType = (index, documentType) => {
    updateFormData({
      documents: formData.documents.map((item, itemIndex) => (
        itemIndex === index ? { ...item, documentType } : item
      )),
    });
  };

  const removeDocument = (index) => {
    updateFormData({ documents: formData.documents.filter((_, itemIndex) => itemIndex !== index) });
    setDocumentError('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {SUMMARY_ROWS.map(({ key, icon: Icon, label }) => (
          <div key={key} className="flex items-start gap-3 rounded-inner bg-foreground/[0.035] px-4 py-3 dark:bg-white/[0.05]">
            <Icon className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
              <p className="mt-0.5 break-words text-sm font-medium capitalize">{summaryValues[key]}</p>
            </div>
          </div>
        ))}
      </div>

      <section aria-labelledby="verification-documents-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 id="verification-documents-title" className="text-sm font-semibold">Verification documents</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Required for review. Add registration, license, or identity evidence (up to 3 files).
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={formData.documents.length >= ONBOARDING_DOCUMENT_RULES.maxDocuments}
            className="flex h-10 items-center justify-center gap-2 rounded-button bg-foreground/[0.055] px-3 text-sm font-semibold hover:bg-foreground/[0.09] disabled:opacity-45"
          >
            {formData.documents.length ? <Plus className="h-4 w-4" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            Add file
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleFiles}
            className="sr-only"
          />
        </div>

        {formData.documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {formData.documents.map(({ file, documentType }, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-inner bg-foreground/[0.035] p-3 dark:bg-white/[0.05]">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-icon bg-background text-muted-foreground shadow-e1">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <label className="sr-only" htmlFor={`document-type-${index}`}>Document type</label>
                <select
                  id={`document-type-${index}`}
                  value={documentType}
                  onChange={(event) => updateDocumentType(index, event.target.value)}
                  className="h-9 max-w-28 rounded-button bg-background px-2 text-xs font-semibold shadow-e1"
                >
                  <option value="registration">Registration</option>
                  <option value="license">License</option>
                  <option value="identity">Identity</option>
                  <option value="other">Other</option>
                </select>
                <button type="button" onClick={() => removeDocument(index)} aria-label={`Remove ${file.name}`} className="flex h-9 w-9 flex-none items-center justify-center rounded-button text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {documentError && <p role="alert" className="mt-2 text-xs font-medium text-destructive">{documentError}</p>}
        {!formData.documents.length && (
          <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            Add at least one document before submitting.
          </p>
        )}
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-inner bg-foreground/[0.035] p-4 dark:bg-white/[0.05]">
        <input
          type="checkbox"
          checked={formData.termsAccepted}
          onChange={(event) => updateFormData({ termsAccepted: event.target.checked })}
          className="mt-0.5 h-4 w-4 accent-foreground"
        />
        <span className="text-sm leading-5 text-muted-foreground">
          I confirm these details are accurate and accept the{' '}
          <a href="https://www.ivisit.ng/terms" target="_blank" rel="noreferrer" className="font-semibold text-foreground underline underline-offset-4">terms</a>
          {' '}and{' '}
          <a href="https://www.ivisit.ng/privacy" target="_blank" rel="noreferrer" className="font-semibold text-foreground underline underline-offset-4">privacy policy</a>.
        </span>
      </label>
    </div>
  );
};

export default VerificationStep;
