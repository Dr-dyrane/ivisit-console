import React from 'react';
import {
  Award,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  IdCard,
  Layers,
  Loader2,
  Mail,
  Phone,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { ModalShell } from '../../ui/ModalShell';
import { getInitials } from './doctorModalModel';

const fieldClassName = 'h-11 w-full rounded-inner bg-background/[0.72] px-4 text-sm font-medium text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_12px_28px_rgb(0_0_0/0.06)] transition-[background,box-shadow,transform] placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-60 focus:bg-background/[0.84] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.16),0_18px_38px_rgb(0_0_0/0.10)] dark:bg-white/[0.07] dark:focus:bg-white/[0.09]';

export const DoctorModalView = ({
  canManageStaff,
  closeModal,
  facilities,
  facilityError,
  facilityName,
  facilityOutOfScope,
  formData,
  handleSubmit,
  isAdminRole,
  isCreate,
  isOpen,
  isProfileLinked,
  isView,
  loadingFacilities,
  saving,
  selectedFacilityIsInScope,
  status,
  subtitle,
  title,
  updateField,
}) => (
  <ModalShell
    isOpen={isOpen}
    onClose={() => closeModal(false)}
    title={title}
    subtitle={subtitle}
    icon={<Stethoscope className="h-5 w-5 text-sky-600 dark:text-sky-200" />}
    badge={(
      <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${status.className}`}>
        {status.label}
      </span>
    )}
    size="lg"
    managed
    className="bg-background shadow-[0_28px_90px_rgb(0_0_0/0.24)] backdrop-blur-2xl dark:bg-background"
  >
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 pt-1 md:p-6 md:pt-2">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <section className="rounded-card bg-muted/22 p-4 shadow-[0_18px_54px_rgb(0_0_0/0.10)] md:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/14 text-lg font-semibold text-sky-700 dark:bg-sky-300/18 dark:text-sky-100">
                {getInitials(formData.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {formData.name || 'New staff'}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {formData.specialization || 'Specialty not set'}
                </span>
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <SummaryItem icon={Building2} label="Facility" value={facilityName} />
              <SummaryItem icon={IdCard} label="License" value={formData.license_number || 'Not set'} />
              <SummaryItem icon={Clock} label="Experience" value={formData.experience ? `${formData.experience} years` : 'Not set'} />
            </div>

            {!canManageStaff && !isView && (
              <div className="mt-4 rounded-inner bg-muted/30 p-3 text-xs font-medium text-muted-foreground">
                This role can view staff but cannot change records.
              </div>
            )}
          </section>

          <section className="rounded-card bg-background/58 p-4 shadow-[0_18px_54px_rgb(0_0_0/0.10)] dark:bg-white/[0.045] md:p-5">
            {isView ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadOnlyItem icon={UserRound} label="Name" value={formData.name} />
                <ReadOnlyItem icon={Award} label="Specialty" value={formData.specialization} />
                <ReadOnlyItem icon={Mail} label="Email" value={formData.email} />
                <ReadOnlyItem icon={Phone} label="Phone" value={formData.phone} />
                <ReadOnlyItem icon={Building2} label="Facility" value={facilityName} />
                <ReadOnlyItem icon={CheckCircle2} label="Status" value={status.label} />
                <ReadOnlyItem icon={IdCard} label="License" value={formData.license_number} />
                <ReadOnlyItem icon={Layers} label="Department" value={formData.department} />
                <ReadOnlyItem icon={Banknote} label="Consultation fee" value={formData.consultation_fee} />
                <ReadOnlyItem icon={FileText} label="Notes" value={formData.about} wide />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {isProfileLinked ? (
                  <ReadOnlyItem
                    icon={UserRound}
                    label="Full name"
                    value={formData.name}
                    hint="Synced from the linked account"
                  />
                ) : (
                  <Field label="Full name" htmlFor="doctor-full-name">
                    <input
                      id="doctor-full-name"
                      value={formData.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      required
                      placeholder="Name"
                      className={fieldClassName}
                    />
                  </Field>
                )}

                <Field label="Specialty" htmlFor="doctor-specialty">
                  <input
                    id="doctor-specialty"
                    value={formData.specialization}
                    onChange={(event) => updateField('specialization', event.target.value)}
                    required
                    placeholder="Primary care"
                    className={fieldClassName}
                  />
                </Field>

                {isProfileLinked ? (
                  <ReadOnlyItem
                    icon={Mail}
                    label="Email"
                    value={formData.email}
                    hint="Synced from the linked account"
                  />
                ) : (
                  <Field label="Email" htmlFor="doctor-email">
                    <input
                      id="doctor-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      required
                      placeholder="name@example.com"
                      className={fieldClassName}
                    />
                  </Field>
                )}

                {isProfileLinked ? (
                  <ReadOnlyItem
                    icon={Phone}
                    label="Phone"
                    value={formData.phone}
                    hint="Synced from the linked account"
                  />
                ) : (
                  <Field label="Phone" htmlFor="doctor-phone">
                    <input
                      id="doctor-phone"
                      value={formData.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="Phone"
                      className={fieldClassName}
                    />
                  </Field>
                )}

                <Field label="Facility" htmlFor="doctor-facility">
                  <select
                    id="doctor-facility"
                    value={selectedFacilityIsInScope ? formData.hospital_id : ''}
                    onChange={(event) => updateField('hospital_id', event.target.value)}
                    disabled={loadingFacilities}
                    required
                    className={fieldClassName}
                  >
                    <option value="">{loadingFacilities ? 'Loading facilities' : 'Select facility'}</option>
                    {isAdminRole && formData.hospital_id && !facilities.some((facility) => facility.id === formData.hospital_id) && (
                      <option value={formData.hospital_id}>{facilityName}</option>
                    )}
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name || 'Unnamed facility'}
                      </option>
                    ))}
                  </select>
                  {facilityError && (
                    <span className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-100">
                      {facilityError}
                    </span>
                  )}
                  {facilityOutOfScope && (
                    <span className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-100" role="alert">
                      This facility is outside your organization. Select an authorized facility before saving.
                    </span>
                  )}
                </Field>

                <ReadOnlyItem
                  icon={CheckCircle2}
                  label="Status"
                  value={status.label}
                  hint={isCreate
                    ? 'New staff starts available for assignment'
                    : 'Managed by the authorized availability workflow'}
                />

                <Field label="License" htmlFor="doctor-license">
                  <input
                    id="doctor-license"
                    value={formData.license_number}
                    onChange={(event) => updateField('license_number', event.target.value)}
                    placeholder="License"
                    className={fieldClassName}
                  />
                </Field>

                <Field label="Experience" htmlFor="doctor-experience">
                  <input
                    id="doctor-experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(event) => updateField('experience', event.target.value)}
                    placeholder="Years"
                    className={fieldClassName}
                  />
                </Field>

                {/* Display-only (ADOPT-43): department is service-writable but has
                    no console input; buildStaffPayload omits it entirely, so saves
                    never touch the stored value. */}
                <ReadOnlyItem
                  icon={Layers}
                  label="Department"
                  value={formData.department}
                  hint="Read-only in this form"
                />

                {/* Display-only: the stored fee round-trips through the payload
                    unchanged; an editable input here would be a new write surface. */}
                <ReadOnlyItem
                  icon={Banknote}
                  label="Consultation fee"
                  value={formData.consultation_fee}
                  hint="Read-only in this form"
                />

                <Field label="Notes" htmlFor="doctor-notes" wide>
                  <textarea
                    id="doctor-notes"
                    value={formData.about}
                    onChange={(event) => updateField('about', event.target.value)}
                    placeholder="Short note"
                    className={`${fieldClassName} min-h-[96px] resize-none py-3`}
                  />
                </Field>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 bg-background/62 p-4 shadow-[0_-18px_54px_rgb(0_0_0/0.08)] backdrop-blur-xl md:p-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => closeModal(false)}
          disabled={saving}
          className="h-11 rounded-button px-6 font-semibold transition-transform active:scale-[0.98]"
        >
          {isView ? 'Close' : 'Cancel'}
        </Button>

        {!isView && (
          <Button
            type="submit"
            disabled={saving || !canManageStaff || facilityOutOfScope}
            className="h-11 rounded-button bg-sky-600 px-7 font-semibold text-white shadow-[0_16px_36px_rgb(14_165_233/0.28)] transition-transform hover:bg-sky-500 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving' : isCreate ? 'Add staff' : 'Save changes'}
          </Button>
        )}
      </div>
    </form>
  </ModalShell>
);

const Field = ({ label, htmlFor, children, wide = false }) => (
  <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}>
    <Label htmlFor={htmlFor} className="ml-1 text-[11px] font-semibold text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

const SummaryItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-background/48 p-3 dark:bg-white/[0.045]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">
        {value || 'Not set'}
      </span>
    </span>
  </div>
);

const ReadOnlyItem = ({ icon: Icon, label, value, hint, wide = false }) => (
  <div className={`rounded-inner bg-muted/22 p-4 shadow-[0_12px_34px_rgb(0_0_0/0.07)] ${wide ? 'sm:col-span-2' : ''}`}>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
    </div>
    <p className="mt-2 text-sm font-semibold text-foreground">
      {value || 'Not set'}
    </p>
    {hint && (
      <p className="mt-1 text-xs text-muted-foreground">
        {hint}
      </p>
    )}
  </div>
);

export default DoctorModalView;
