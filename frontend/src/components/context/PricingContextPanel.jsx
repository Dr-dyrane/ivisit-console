import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  Download,
  DollarSign,
  Plus,
} from 'lucide-react';

const SOURCE_PENDING_LABEL = 'Source pending';
const PRICING_UNAVAILABLE_MESSAGE = 'Pricing actions unavailable until facility scope is verified.';

const pricingSignals = [
  { label: 'Facility prices', Icon: Building2 },
  { label: 'Room prices', Icon: DollarSign },
  { label: 'Quote impact', Icon: BarChart3 },
];

export const PricingContextPanel = () => {
  const [panelNotice, setPanelNotice] = useState('Pricing scope pending.');

  const handleUnavailableAction = useCallback(() => {
    setPanelNotice(PRICING_UNAVAILABLE_MESSAGE);
  }, []);

  return (
    <div className="space-y-4">
      {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
      <div className="space-y-2">
        <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Pricing scope</h3>

        <div className="flex items-start gap-3 rounded-card bg-muted/20 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-icon bg-muted/35">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold">Facility scope needed</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Price actions need a selected facility before they can run.
            </p>
          </div>
        </div>

        {pricingSignals.map(({ label, Icon }) => (
          <div key={label} className="flex items-center justify-between rounded-card bg-muted/15 p-4 transition-colors hover:bg-muted/25 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-icon bg-muted/30">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold">{label}</span>
            </div>
            <span className="rounded-pill bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {SOURCE_PENDING_LABEL}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="ml-1 text-sm font-semibold text-muted-foreground">Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <PanelAction icon={Plus} label="Add item" onClick={handleUnavailableAction} />
          <PanelAction icon={BarChart3} label="Reports" onClick={handleUnavailableAction} />
          <PanelAction icon={Download} label="Bulk sync" onClick={handleUnavailableAction} wide />
        </div>
        <p role="status" aria-live="polite" className="px-1 text-xs leading-5 text-muted-foreground">
          {panelNotice}
        </p>
      </div>
    </div>
  );
};

const PanelAction = ({ icon: Icon, label, onClick, wide = false }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    aria-disabled="true"
    data-state="unavailable"
    title={PRICING_UNAVAILABLE_MESSAGE}
    className={`${wide ? 'col-span-2' : ''} flex flex-col items-center justify-center gap-2 rounded-card bg-muted/25 p-4 text-muted-foreground transition-colors hover:bg-muted/35`}
  >
    <Icon className="h-5 w-5" />
    <span className="text-xs font-semibold">{label}</span>
  </motion.button>
);
