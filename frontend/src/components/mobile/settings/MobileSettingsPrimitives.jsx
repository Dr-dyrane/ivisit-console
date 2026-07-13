import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { TapCard } from '../canon/Tap';

export const SettingsSection = ({ label, children }) => (
  <section className="px-4">
    <h2 className="mb-2 px-1 text-[13px] font-bold leading-[17px] text-muted-foreground">
      {label}
    </h2>
    <div className="rounded-inner bg-foreground/[0.06] px-3 py-1.5 dark:bg-white/[0.08]">
      {children}
    </div>
  </section>
);

export const SettingsActionRow = ({
  icon: Icon,
  title,
  detail,
  onClick,
  toneClass = 'bg-muted/40 text-muted-foreground',
  pending = false,
  disabled = false,
  destructive = false,
}) => (
  <TapCard
    onClick={pending || disabled ? undefined : onClick}
    disabled={pending || disabled}
    feedbackVariant={destructive ? FEEDBACK_TYPES.DESTRUCTIVE : FEEDBACK_TYPES.CLICK}
    feedbackColor={destructive ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
    data-state={pending ? 'pending' : 'idle'}
    data-availability={disabled ? 'unavailable' : 'available'}
    aria-busy={pending}
    aria-disabled={disabled || undefined}
    className="flex min-h-[56px] w-full items-center gap-3 rounded-inner px-2 py-3 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-70 dark:active:bg-white/[0.08]"
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass}`}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block text-[15px] font-medium leading-5 ${destructive ? 'text-destructive' : 'text-foreground'}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-xs leading-[17px] text-muted-foreground">
        {detail}
      </span>
    </span>
    {!pending && !disabled && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
  </TapCard>
);

export const SettingsInfoRow = ({ icon: Icon, title, value, toneClass }) => (
  <div className="flex min-h-[56px] items-center gap-3 px-2 py-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-medium leading-5 text-foreground">{title}</span>
      <span className="mt-0.5 block truncate text-xs leading-[17px] text-muted-foreground">{value}</span>
    </span>
  </div>
);
