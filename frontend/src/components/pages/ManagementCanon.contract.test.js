import fs from 'fs';

// Locks the interactive-Cowork canon chrome-cleanup of the Page 15/16/17/18 surfaces
// (Organizations, Settings, Subscriptions, Pricing). These pages remain intake-only for
// backend authority + rendered proof; this guard only prevents the decorative chrome
// (glass, glow, blur, heavy shadow, non-canonical radius, borders) from returning.
const read = (p) => fs.readFileSync(p, 'utf8');

describe('Management pages canon chrome-clean contract', () => {
  const groups = {
    Organizations: [
      'src/components/pages/OrganizationsPage.jsx',
      'src/components/mobile/MobileOrganizations.jsx',
      'src/components/context/OrganizationsPanel.jsx',
      'src/components/views/OrganizationListView.jsx',
      'src/components/views/OrganizationTableView.jsx',
    ],
    Settings: [
      'src/components/pages/SettingsPage.jsx',
      'src/components/mobile/MobileSettings.jsx',
      'src/components/context/SettingsPanel.jsx',
    ],
    Subscriptions: [
      'src/components/pages/SubscriptionManagementPage.jsx',
      'src/components/mobile/MobileSubscriptions.jsx',
      'src/components/context/SubscriptionsPanel.jsx',
      'src/components/modals/SubscriptionModal.jsx',
      'src/components/views/SubscriptionListView.jsx',
      'src/components/views/SubscriptionTableView.jsx',
    ],
    Pricing: [
      'src/components/pages/PricingManagementPage.jsx',
      'src/components/mobile/MobilePricing.jsx',
      'src/components/context/PricingContextPanel.jsx',
      'src/components/views/PricingListView.jsx',
      'src/components/views/PricingTableView.jsx',
    ],
  };

  const banned = [
    'glass-card', 'hover-glow', 'hover-lift', 'blur-xl',
    'shadow-2xl', 'shadow-premium', 'rounded-2xl', 'rounded-3xl',
    'geo-sharp', 'squircle-lg', 'squircle-sm', 'border-0',
  ];

  for (const [name, files] of Object.entries(groups)) {
    it(`keeps ${name} surfaces canon chrome-clean (no glass/glow/blur/decorative shadow; canonical radius)`, () => {
      for (const file of files) {
        const src = read(file);
        for (const tok of banned) {
          expect({ file, tok, found: src.includes(tok) }).toEqual({ file, tok, found: false });
        }
      }
    });
  }

  it('keeps every mounted right-pane panel on card radius rather than modal radius', () => {
    const panels = [
      'src/components/context/AmbulancesPanel.jsx',
      'src/components/context/AnalyticsPanel.jsx',
      'src/components/context/DashboardPanel.jsx',
      'src/components/context/DoctorsPanel.jsx',
      'src/components/context/EmergencyPanel.jsx',
      'src/components/context/HealthNewsPanel.jsx',
      'src/components/context/HospitalsPanel.jsx',
      'src/components/context/InsurancePanel.jsx',
      'src/components/context/OrganizationsPanel.jsx',
      'src/components/context/PricingContextPanel.jsx',
      'src/components/context/SubscriptionsPanel.jsx',
      'src/components/context/MapPanel.jsx',
      'src/components/context/SettingsPanel.jsx',
      'src/components/context/SupportTicketsPanel.jsx',
      'src/components/context/UsersPanel.jsx',
      'src/components/context/VerificationPanel.jsx',
      'src/components/context/VisitsPanel.jsx',
      'src/components/context/WalletPanel.jsx',
    ];

    for (const file of panels) {
      const src = read(file);
      expect({ file, hasCardRadius: src.includes('rounded-card') }).toEqual({ file, hasCardRadius: true });
      expect({ file, hasModalRadius: src.includes('rounded-modal') }).toEqual({ file, hasModalRadius: false });
    }
  });
});
