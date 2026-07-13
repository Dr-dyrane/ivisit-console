import React from 'react';

import { Label } from '../../ui/label';

export const AmbulanceModalCard = ({ children, title, icon }) => (
  <section className="rounded-card bg-muted/30 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.06)] sm:p-6">
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-icon bg-background/60 text-primary shadow-sm">
        {React.cloneElement(icon, { size: 17 })}
      </span>
      <h3 className="text-sm font-semibold tracking-normal text-foreground sm:text-base">{title}</h3>
    </div>
    {children}
  </section>
);

export const AmbulanceFieldGroup = ({ children, label, htmlFor }) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor} className="px-1 text-xs font-semibold text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

export const AmbulanceReadOnlyField = ({ value, subtext, icon }) => (
  <div className="flex min-h-12 items-center gap-3 rounded-inner bg-background/55 px-3 py-3 text-sm shadow-sm md:min-h-14">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-muted/50 text-muted-foreground">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium text-foreground">{String(value || 'Not set')}</span>
      {subtext && (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtext}</span>
      )}
    </span>
  </div>
);

export const AmbulanceUnavailableNote = ({ title, text }) => (
  <div className="rounded-inner bg-background/55 p-4 shadow-sm">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
  </div>
);
