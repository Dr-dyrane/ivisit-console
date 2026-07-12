import React, { useCallback, useState } from 'react';
import { BarChart3, BadgeDollarSign, Building2, Download, Globe, Plus } from 'lucide-react';

const PRICING_UNAVAILABLE_MESSAGE = 'Pricing actions unavailable until facility scope is verified.';
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (item) => new Intl.NumberFormat('en-US', { style: 'currency', currency: item?.currency || 'USD' }).format(Number(item?.amount ?? item?.base_price ?? item?.price_per_night ?? 0) || 0);
const isGlobal = (item) => !item?.hospital_id && !item?.hospitalId;

const Action = ({ icon: Icon, label, onClick, wide }) => <button type="button" onClick={onClick} aria-disabled="true" data-state="unavailable" title={PRICING_UNAVAILABLE_MESSAGE} className={`${wide ? 'col-span-2' : ''} flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-inner bg-background/45 p-3 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.97] dark:bg-white/[0.04]`}><Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span></button>;

export const PricingContextPanel = ({ pricingContext = null }) => {
  const [notice, setNotice] = useState('Pricing scope pending.');
  const rows = pricingContext?.recentPricing || pricingContext?.pricing || [];
  const summary = pricingContext?.summary || {};
  const focused = pricingContext?.focusedPrice || rows[0] || null;
  const unavailable = useCallback(() => setNotice(PRICING_UNAVAILABLE_MESSAGE), []);
  if (pricingContext?.loading && rows.length === 0) return <div className="space-y-3 py-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}</div>;

  return <div className="space-y-5">
    {pricingContext?.error && <div className="rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{pricingContext.error}</div>}
    <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Pricing scope</h3><span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{number(pricingContext?.totalCount)}</span></div><div className="grid grid-cols-2 gap-2"><div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><Globe className="mb-2 h-4 w-4 text-sky-700 dark:text-sky-200" /><p className="text-sm font-semibold">{number(summary.globalFallbackCount)}</p><p className="text-xs text-muted-foreground">Platform</p></div><div className="rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><Building2 className="mb-2 h-4 w-4 text-emerald-700 dark:text-emerald-200" /><p className="text-sm font-semibold">{number(summary.facilityPriceCount)}</p><p className="text-xs text-muted-foreground">Facility</p></div></div></section>
    {focused && <section className="rounded-card bg-background/45 p-4 dark:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-muted-foreground">Current rule</p><h3 className="mt-2 truncate text-base font-semibold">{focused.name || focused.service_name || focused.room_name || 'Pricing rule'}</h3><p className="mt-1 text-xs text-muted-foreground">{money(focused)} · {isGlobal(focused) ? 'Platform fallback' : focused.facilityName || 'Facility price'}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-icon ${isGlobal(focused) ? 'bg-sky-500/10 text-sky-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{isGlobal(focused) ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</span></div><p className="mt-4 rounded-inner bg-muted/25 px-3 py-2 text-xs text-muted-foreground">Read-only pricing evidence</p></section>}
    <section><h3 className="mb-3 text-sm font-semibold">Actions</h3><div className="grid grid-cols-2 gap-2"><Action icon={Plus} label="Add item" onClick={unavailable} /><Action icon={BarChart3} label="Reports" onClick={unavailable} /><Action icon={Download} label="Bulk sync" onClick={unavailable} wide /></div><p role="status" aria-live="polite" className="mt-2 px-1 text-xs text-muted-foreground">{notice}</p></section>
    <section><h3 className="mb-3 text-sm font-semibold">Recent rules</h3><div className="space-y-2">{rows.slice(0, 4).map((item) => <div key={`${item.family || item._pricingType}-${item.id}`} className="flex items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${isGlobal(item) ? 'bg-sky-500/10 text-sky-700' : 'bg-emerald-500/10 text-emerald-700'}`}><BadgeDollarSign className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name || item.service_name || item.room_name || 'Pricing rule'}</p><p className="mt-1 text-xs text-muted-foreground">{money(item)} · {isGlobal(item) ? 'Platform' : 'Facility'}</p></div></div>)}{rows.length === 0 && <p className="py-3 text-sm text-muted-foreground">No pricing rules in this scope.</p>}</div></section>
  </div>;
};
