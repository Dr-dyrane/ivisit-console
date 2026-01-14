import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { IslandNavigation } from './components/common/IslandNavigation';
import { BentoHome } from './components/pages/BentoHome';
import { GodModeMap } from './components/pages/GodModeMap';
import { VerificationQueue } from './components/pages/VerificationQueue';
import { Analytics } from './components/pages/Analytics';
import { HospitalsPage } from './components/pages/HospitalsPage';
import { AmbulancesPage } from './components/pages/AmbulancesPage';
import { UsersPage } from './components/pages/UsersPage';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <IslandNavigation />
        <Routes>
          <Route path="/" element={<BentoHome />} />
          <Route path="/map" element={<GodModeMap />} />
          <Route path="/verification" element={<VerificationQueue />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/ambulances" element={<AmbulancesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </Router>
    </AuthProvider>
  );
}

const ComingSoon = ({ title }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">This module is under construction</p>
      <button 
        onClick={() => window.history.back()} 
        className="px-6 py-3 squircle bg-primary text-primary-foreground hover-lift font-bold"
      >
        Go Back
      </button>
    </div>
  </div>
);

export default App;
