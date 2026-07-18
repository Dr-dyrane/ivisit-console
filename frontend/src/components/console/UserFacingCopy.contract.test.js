import fs from 'fs';

const USER_FACING_SURFACES = [
  'src/components/modals/EmergencyDetailsModal.jsx',
  'src/components/modals/SupportTicketModal.jsx',
  'src/components/modals/VerificationModal.jsx',
  'src/components/modals/emergency-request/useEmergencyRequestModalController.js',
  'src/components/pages/health-news/HealthNewsDetailRail.jsx',
  'src/components/pages/health-news/healthNewsPageModel.js',
  'src/components/pages/hospitals/HospitalDetailRail.jsx',
  'src/components/pages/hospitals/HospitalsPageView.jsx',
  'src/components/pages/requests/emergencyLifecyclePresentation.js',
  'src/components/pages/requests/useEmergencyRequestCommands.js',
  'src/components/pages/support/SupportDetailRail.jsx',
  'src/components/pages/support/supportTicketsModel.js',
];

const INTERNAL_COPY = [
  /backend (?:authority|detail|enforced|evidence|ticket truth|truth)/i,
  /receiver (?:is|pass|proof|stays|until)/i,
  /canonical lifecycle/i,
  /payment row/i,
  /read-only evidence/i,
];

describe('user-facing copy hygiene', () => {
  it.each(USER_FACING_SURFACES)('%s keeps implementation language out of product copy', (file) => {
    const source = fs.readFileSync(file, 'utf8');

    INTERNAL_COPY.forEach((pattern) => {
      expect({ file, pattern: pattern.toString(), matches: pattern.test(source) })
        .toEqual({ file, pattern: pattern.toString(), matches: false });
    });
  });
});
