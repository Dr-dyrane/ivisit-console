import React from 'react';

export const NoiseOverlay = ({ opacity = 20, className = '' }) => {
  return (
    <div 
      className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-${opacity} brightness-100 contrast-150 pointer-events-none ${className}`}
      style={{ 
        opacity: opacity / 100 
      }}
    />
  );
};

export default NoiseOverlay;
