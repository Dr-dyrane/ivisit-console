import React from 'react';
import { Hospital } from 'lucide-react';

export const HospitalAvatar = ({ hospital, size = 'h-9 w-9', iconSize = 'h-4 w-4' }) => (
  <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-pill bg-sky-500/10 text-sky-700 dark:text-sky-200`}>
    <Hospital className={iconSize} aria-hidden="true" />
    {hospital?.image && (
      <img
        src={hospital.image}
        alt=""
        className="absolute inset-0 h-full w-full rounded-pill object-cover"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    )}
  </span>
);
