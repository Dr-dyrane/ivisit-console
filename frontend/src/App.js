import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Overview } from './components/pages/Overview';
import { GodModeMap } from './components/pages/GodModeMap';
import { VerificationQueue } from './components/pages/VerificationQueue';
import { Analytics } from './components/pages/Analytics';
import './App.css';

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/map" element={<GodModeMap />} />
          <Route path="/verification" element={<VerificationQueue />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/hospitals" element={<ComingSoon title="Hospitals Management" />} />
          <Route path="/ambulances" element={<ComingSoon title="Fleet Management" />} />
          <Route path="/users" element={<ComingSoon title="User Management" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

const ComingSoon = ({ title }) => (
  <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">This feature is coming soon</p>
    </div>
  </div>
);

export default App;
