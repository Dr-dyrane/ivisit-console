import React from 'react';
import { AlertCircle } from 'lucide-react';

export const HealthNewsProjectionStatsNotice = ({ className = '' }) => (
  <p
    className={`flex items-start gap-2 rounded-inner bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 ${className}`}
    role="status"
    aria-live="polite"
  >
    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>Health News statistics are unavailable. Counts use the loaded rows; the list remains current.</span>
  </p>
);
