import React from 'react';

export const ReadOnlyField = ({ value, subtext, icon, multiline = false }) => {
  const displayValue = Array.isArray(value)
    ? (value.filter(Boolean).join('\n') || 'Not set')
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

// ADOPT-37: read-only chip row for fetched text[] columns (service_types).
// Same pill grammar as the console list markers; honest 'Not set' when empty.
export const ReadOnlyChips = ({ values }) => {
  const chips = Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));

  if (chips.length === 0) {
    return <p className="px-1 text-sm italic text-muted-foreground">Not set</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 px-1">
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center rounded-pill bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground"
        >
          {chip}
        </span>
      ))}
    </div>
  );
};

export const ReadOnlyStat = ({ value }) => (
  <div className="flex h-10 items-center rounded-inner bg-muted/30 pl-9 pr-3 text-sm font-semibold tabular-nums text-foreground">
    {value}
  </div>
);

export const HospitalSection = ({ children, title, icon }) => (
  <div className="rounded-card bg-foreground/[0.05] p-4 dark:bg-white/[0.07] sm:p-6">
    <div className="mb-4 flex items-center gap-3 sm:mb-6">
      <div className="rounded-icon bg-white/5 p-1.5 sm:p-2">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-primary' })}
      </div>
      <h3 className="text-sm font-semibold tracking-tight sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
