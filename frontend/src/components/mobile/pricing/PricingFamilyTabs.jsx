import React from 'react';

const PRICING_FAMILY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'services', label: 'Services' },
  { id: 'rooms', label: 'Rooms' },
];

export const PricingFamilyTabs = ({ activeTab, setActiveTab }) => (
  <div
    className="mb-3 grid grid-cols-3 gap-1 rounded-inner bg-muted/20 p-1"
    role="tablist"
    aria-label="Pricing family"
  >
    {PRICING_FAMILY_TABS.map((tab) => {
      const selected = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          onClick={() => setActiveTab(tab.id)}
          aria-selected={selected}
          className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
