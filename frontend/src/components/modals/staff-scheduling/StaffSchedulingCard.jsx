import React from 'react';

export const StaffSchedulingCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-card bg-muted/20">
    {title && (
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-muted/40 rounded-icon">
          {icon}
        </div>
        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground/90">
          {title}
        </h3>
      </div>
    )}
    <div className="space-y-4 sm:space-y-6">
      {children}
    </div>
  </div>
);
