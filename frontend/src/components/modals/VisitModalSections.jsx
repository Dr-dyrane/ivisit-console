import React from 'react';
import { Clock, FileText, Hospital, Siren } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export const GlassCard = ({ children, title, icon }) => (
  <div className="rounded-card bg-muted/30 p-4 sm:p-6">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="rounded-icon bg-muted/50 p-1.5 sm:p-2">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

export const ReadOnlyField = ({ value, subtext, icon, multiline = false }) => {
  const displayValue = Array.isArray(value)
    ? value.filter(Boolean).join('\n')
    : String(value || 'Not set');

  return (
    <div className={`flex gap-3 rounded-inner bg-muted/30 px-3 py-3 text-sm ${multiline ? 'min-h-[88px] items-start' : 'min-h-12 items-center md:min-h-14'}`}>
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/50 text-muted-foreground">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block font-medium text-foreground ${multiline ? 'whitespace-pre-wrap leading-6' : 'truncate'}`}>
          {displayValue}
        </span>
        {subtext && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {subtext}
          </span>
        )}
      </span>
    </div>
  );
};

export const VisitLogisticsCard = ({
  formData,
  handleChange,
  insuranceLabel,
  isView,
  setFormData,
}) => (
  <GlassCard icon={<Clock className="text-primary" />} title="Logistics & Billing">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="room_number" className="text-xs font-semibold text-muted-foreground uppercase">Room Number</Label>
        {isView ? (
          <ReadOnlyField value={formData.room_number || 'No room'} icon={<Hospital className="h-4 w-4" />} />
        ) : (
          <Input
            id="room_number"
            name="room_number"
            value={formData.room_number || ''}
            onChange={handleChange}
            className="h-12 rounded-inner bg-muted/30 font-mono focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            placeholder="e.g. 405-B"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="estimated_duration" className="text-xs font-semibold text-muted-foreground uppercase">Duration</Label>
        {isView ? (
          <ReadOnlyField value={formData.estimated_duration || 'Not set'} icon={<Clock className="h-4 w-4" />} />
        ) : (
          <Input
            id="estimated_duration"
            name="estimated_duration"
            value={formData.estimated_duration || ''}
            onChange={handleChange}
            className="h-12 rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            placeholder="e.g. 30 mins"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cost" className="text-xs font-semibold text-muted-foreground uppercase">Cost</Label>
        {isView ? (
          <ReadOnlyField value={formData.cost || 'Not set'} icon={<FileText className="h-4 w-4" />} />
        ) : (
          <Input
            id="cost"
            name="cost"
            value={formData.cost || ''}
            onChange={handleChange}
            className="h-12 rounded-inner bg-muted/30 font-mono focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            placeholder="e.g. $150"
          />
        )}
      </div>
      <div className="space-y-2 flex flex-col justify-center">
        <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2">Insurance</Label>
        {isView ? (
          <ReadOnlyField value={insuranceLabel} icon={<FileText className="h-4 w-4" />} />
        ) : (
          <div className="flex items-center gap-2 rounded-inner bg-muted/30 p-3 transition-colors hover:bg-primary/5">
            <input
              type="checkbox"
              checked={formData.insurance_covered === true}
              onChange={(event) => setFormData((current) => ({
                ...current,
                insurance_covered: event.target.checked,
              }))}
              className="h-5 w-5 rounded-button text-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
            <span className="text-sm font-medium">Covered by Insurance</span>
          </div>
        )}
      </div>
    </div>
  </GlassCard>
);

export const VisitNotesCard = ({ formData, handleChange, isView }) => (
  <GlassCard icon={<FileText className="text-primary" />} title="Preparation & Notes">
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="preparation" className="text-xs font-semibold text-muted-foreground uppercase">Preparation Instructions</Label>
        {isView ? (
          <ReadOnlyField value={formData.preparation || 'No preparation notes'} multiline icon={<FileText className="h-4 w-4" />} />
        ) : (
          <Textarea
            id="preparation"
            name="preparation"
            value={formData.preparation || ''}
            onChange={handleChange}
            placeholder="One instruction per line..."
            className="min-h-[80px] resize-none rounded-inner bg-muted/30 p-4 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</Label>
        {isView ? (
          <ReadOnlyField value={formData.notes || 'No clinical notes'} multiline icon={<FileText className="h-4 w-4" />} />
        ) : (
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            className="min-h-[100px] resize-none rounded-inner bg-muted/30 p-4 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            placeholder="Add notes here..."
          />
        )}
      </div>
    </div>
  </GlassCard>
);

export const VisitIncidentContextCard = ({ emergencyContext, loadingContext, onClose }) => {
  if (loadingContext) {
    return (
      <GlassCard icon={<Siren className="text-red-500" />} title="Loading Incident Context">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-pulse rounded-pill bg-red-500/20" />
        </div>
      </GlassCard>
    );
  }
  if (!emergencyContext) return null;

  return (
    <GlassCard icon={<Siren className="text-red-500" />} title="Incident Context">
      <div className="space-y-4">
        <div className="rounded-inner bg-red-500/5 p-4">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Original Situation Report</p>
          <p className="text-sm leading-relaxed italic">&quot;{emergencyContext.emergency?.description || 'No description provided'}&quot;</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Service Type</p>
            <p className="text-xs font-semibold">{emergencyContext.emergency?.serviceType || 'Emergency'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
            <p className="text-xs font-semibold">{emergencyContext.emergency?.status || 'Unknown'}</p>
          </div>
        </div>
        {emergencyContext.patient && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient</p>
              <p className="text-xs font-semibold">{emergencyContext.patient.fullName || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Contact</p>
              <p className="text-xs font-semibold">{emergencyContext.patient.phone || 'N/A'}</p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-button text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/5"
          onClick={() => {
            const event = new CustomEvent('openEmergencyDetails', { detail: emergencyContext.emergency });
            window.dispatchEvent(event);
            onClose(false);
          }}
        >
          View Full Incident Log
        </Button>
      </div>
    </GlassCard>
  );
};
