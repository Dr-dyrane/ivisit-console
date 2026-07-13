import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { MobileHeading, SkeletonGroupList } from '../canon';
import { MobileKPIStrip } from '../MobileKPIStrip';

export const MobileWalletAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--spark) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(var(--spark) / 0.09), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const WalletSkeleton = () => (
  <div className="space-y-3" aria-label="Loading payments">
    <section className="px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-28 rounded-inner bg-muted/25 shimmer" />
        <div className="h-11 w-11 rounded-icon bg-muted/20 shimmer" />
      </div>
      <div className="mt-4 h-9 w-44 rounded-inner bg-muted/25 shimmer" />
      <div className="mt-2 h-4 w-28 rounded-inner bg-muted/20 shimmer" />
    </section>
    <section className="flex gap-2 px-4 py-3">
      <div className="h-9 w-28 rounded-pill bg-muted/20 shimmer" />
      <div className="h-9 w-28 rounded-pill bg-muted/20 shimmer" />
      <div className="h-9 w-32 rounded-pill bg-muted/20 shimmer" />
    </section>
    <section className="px-4">
      <div className="mb-3 h-11 w-full rounded-inner bg-muted/20 shimmer" />
      <div className="mb-3 flex items-center gap-2">
        <div className="h-9 flex-1 rounded-inner bg-muted/20 shimmer" />
        <div className="h-9 w-9 rounded-button bg-muted/20 shimmer" />
        <div className="h-9 w-9 rounded-button bg-muted/20 shimmer" />
      </div>
      <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
    </section>
  </div>
);

export const WalletBalanceVisibilityButton = ({ showBalance, setShowBalance }) => (
  <button
    type="button"
    onClick={() => setShowBalance((current) => !current)}
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-muted-foreground transition-colors hover:bg-foreground/[0.06] active:scale-[0.96]"
    aria-label={showBalance ? 'Hide balance' : 'Show balance'}
    aria-pressed={!showBalance}
  >
    {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
  </button>
);

export const MobileWalletHeader = ({
  paymentsCount,
  readState,
  showBalance,
  setShowBalance,
  compactBalance,
  kpis,
  ledgerScopeLabel,
}) => (
  <>
    <MobileHeading
      title="Payments"
      noun="payment"
      count={paymentsCount}
      hideSummary
      trailing={(
        <WalletBalanceVisibilityButton
          showBalance={showBalance}
          setShowBalance={setShowBalance}
        />
      )}
    >
      <p className="mt-3 text-3xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
        {['ready', 'stale'].includes(readState?.wallet)
          ? showBalance ? compactBalance : 'Balance hidden'
          : 'Balance unavailable'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Recorded balance</p>
    </MobileHeading>

    <MobileKPIStrip
      kpis={kpis}
      interactive={false}
      ariaLabel="Wallet ledger totals"
      loading={false}
      loadingCount={2}
      animateOnMount={false}
    />
    <p className="px-4 text-[11px] font-medium text-muted-foreground">{ledgerScopeLabel}</p>
  </>
);
