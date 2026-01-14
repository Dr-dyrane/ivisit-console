import React from 'react';
import ParticleSystem from '../ui/particle-system';

// Test component to verify particle system
const TestPage = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <ParticleSystem className="opacity-30" />
      <div className="relative z-10 flex items-center justify-center p-8">
        <div className="bg-surface-1 backdrop-blur-md rounded-[32px] p-8 shadow-premium border border-surface-border">
          <h1 className="text-2xl font-medium tracking-tight mb-4">Particle System Test</h1>
          <p className="text-muted-foreground">Interactive particle system with mouse tracking</p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
