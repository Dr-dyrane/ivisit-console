import React from 'react';

export const MobileOrganizationsAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 45%, hsl(var(--foreground) / 0.05) 45% 48%, transparent 48%), linear-gradient(32deg, transparent 0 41%, hsl(var(--foreground) / 0.04) 41% 44%, transparent 44%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.06) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(145deg, hsl(var(--background) / 0.12), transparent 42%), linear-gradient(180deg, hsl(var(--background) / 0.2), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);
