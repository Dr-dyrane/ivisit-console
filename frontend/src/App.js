import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BentoHome } from './components/pages/BentoHome';
import { GodModeMap } from './components/pages/GodModeMap';
import { VerificationQueue } from './components/pages/VerificationQueue';
import { Analytics } from './components/pages/Analytics';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BentoHome />} />
        <Route path="/map" element={<GodModeMap />} />
        <Route path="/verification" element={<VerificationQueue />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/hospitals" element={<ComingSoon title="Hospitals Management" />} />
        <Route path="/ambulances" element={<ComingSoon title="Fleet Management" />} />
        <Route path="/users" element={<ComingSoon title="User Management" />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
  );
}

const ComingSoon = ({ title }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">This module is under construction</p>
      <button 
        onClick={() => window.history.back()} 
        className="px-6 py-3 bento bg-primary text-primary-foreground hover-lift"
      >
        Go Back
      </button>
    </div>
  </div>
);

export default App;
