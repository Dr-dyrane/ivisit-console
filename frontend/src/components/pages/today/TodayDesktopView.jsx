import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import { ConsoleModuleRail } from '../../common/ConsoleModuleRail';
import { SEOHead } from '../../common/SEOHead';
import { GlanceTile } from '../../console/GlanceTile';
import { CopilotActionButton } from '../../../features/copilot';

const statusClass = {
  danger: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  muted: 'bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06] dark:text-foreground/80',
};

const rowToneClass = {
  danger: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  muted: 'bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06] dark:text-foreground/80',
};

const AtlasLayer = () => (
  <div className="absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.34] dark:opacity-[0.28]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.07) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.055) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--primary) / 0.08) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          // Sanctioned ambient brand tint (canon): the low-opacity brand glow is the
          // page's atmosphere - decorative brand expression, not a state colour.
          'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.13), transparent 30%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.20), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const TodayCenter = ({ today, roleCopy, live, initialLoading, glanceItems, onAction, routingPath }) => {
  const Icon = today.icon || Activity;

  return (
    // Data regions never entrance-animate (MOTION canon section 3): the hero is
    // count-derived data, so it is simply present once mounted.
    <section
      className="relative z-10 flex min-h-[210px] min-w-0 flex-1 items-center px-6 pb-5 pt-7 md:min-h-[520px] md:px-12 md:py-10 lg:pl-24"
    >
      <div className="max-w-2xl">
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold md:mb-5 ${rowToneClass[today.tone] || rowToneClass.muted}`}
        >
          <Icon className="h-4 w-4" />
          {today.status}
        </div>
        <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
          {today.headline}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground md:mt-4 md:text-base">
          {today.subhead}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-6">
          <span className="rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
            {roleCopy.label}
          </span>
          {/* T3: a genuine first load is loading, not a failure -- no retry voice yet. */}
          {!live && !initialLoading && (
            <span className="rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
              Retry needed
            </span>
          )}
        </div>
        <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3 md:mt-7">
          {/* The glance tile is the console DS nav tile (donor: this page's
              GlanceCard, extracted verbatim); the page wires its domain only:
              tone map + the Today data attribute. */}
          {glanceItems.map((item) => (
            <GlanceTile
              key={item.label}
              item={item}
              onAction={onAction}
              routingPath={routingPath}
              toneClassMap={rowToneClass}
              dataAttr="data-today-glance"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const DetailRow = ({ row, expanded, onToggle, onAction, routingPath }) => {
  const StatusIcon = row.loading ? Loader2 : row.disabled ? LockKeyhole : row.done ? CheckCircle2 : CircleDashed;
  const isOpening = routingPath === row.path;
  const rowState = row.disabled ? 'unavailable' : isOpening ? 'opening' : expanded ? 'expanded' : 'idle';

  return (
    <div
      data-today-row={row.id}
      data-state={rowState}
      aria-disabled={row.disabled ? 'true' : undefined}
      className={`group w-full rounded-inner p-2 text-left transition-[background,transform] duration-200 active:scale-[0.99] md:rounded-card md:p-4 ${
        row.disabled
          ? 'bg-foreground/[0.035] text-muted-foreground dark:bg-white/[0.035]'
          : 'bg-foreground/[0.045] text-foreground hover:bg-foreground/[0.07] dark:bg-white/[0.055] dark:hover:bg-white/[0.085]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${row.label}: ${row.meta}${row.disabledReason ? `. ${row.disabledReason}` : ''}`}
        data-state={rowState}
        className="flex w-full items-center gap-2.5 rounded-inner text-left focus-visible:bg-foreground/10 md:gap-3"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-pill md:h-9 md:w-9 ${rowToneClass[row.tone] || rowToneClass.muted}`}>
          <StatusIcon className={`h-3 w-3 md:h-4 md:w-4 ${row.loading ? 'animate-spin' : ''}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold md:text-sm">{row.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground md:text-xs" title={row.meta}>{row.meta}</span>
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="ml-10 mt-3 text-xs leading-5 text-foreground/82 md:ml-12"
        >
          <p>{row.detail}</p>
          {row.disabledReason && (
            <p className="mt-2 text-muted-foreground">{row.disabledReason}</p>
          )}
          {row.path && row.actionLabel && (
            <button
              type="button"
              onClick={() => onAction(row.path)}
              data-state={isOpening ? 'opening' : 'idle'}
              aria-label={`${row.actionLabel}${isOpening ? ', opening' : ''}`}
              className="mt-3 inline-flex items-center gap-2 rounded-pill bg-foreground/[0.18] px-3 py-2 text-xs font-semibold text-foreground shadow-e2 transition-[background,transform] active:scale-[0.98] hover:bg-foreground/[0.22] focus-visible:bg-foreground/[0.26] dark:bg-white/[0.24] dark:hover:bg-white/[0.30]"
            >
              {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {isOpening ? 'Opening...' : row.actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

const TodaySheet = ({
  today,
  rows,
  expandedRow,
  onToggleRow,
  onPrimary,
  onRowAction,
  routingPath,
  copilotRequest,
}) => (
  // No entrance motion (MOTION canon section 3): the delayed y+scale pop made the sheet
  // arrive on a second clock after the hero - the banned stage-reveal/skew.
  <aside
    className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-3 text-foreground shadow-e3 backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

    <div className="rounded-modal bg-background/55 p-3 dark:bg-white/[0.05] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-pill px-3 py-1 text-[11px] font-semibold ${statusClass[today.tone] || statusClass.muted}`}>
            {today.status}
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight md:mt-4 md:text-2xl">{today.sheetTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{today.sheetHint}</p>
        </div>
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-pill bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06]">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      <button
        type="button"
        onClick={onPrimary}
        data-state={routingPath === today.path ? 'opening' : 'idle'}
        aria-label={`${today.primaryAction}${routingPath === today.path ? ', opening' : ''}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-button bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-e2-strong transition-[background,box-shadow,transform] hover:bg-foreground/90 focus-visible:shadow-e3 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-white/90 md:mt-5 md:py-3.5"
      >
        {routingPath === today.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {routingPath === today.path ? 'Opening...' : today.primaryAction}
      </button>
      <CopilotActionButton
        label="Explain today"
        request={copilotRequest}
        className="mt-2"
        compact
      />
    </div>

    <div className="mt-2 max-h-[112px] space-y-2 overflow-y-auto no-scrollbar sm:max-h-[148px] md:mt-3 md:max-h-none md:overflow-visible">
      {rows.map((row) => (
        <DetailRow
          key={row.id}
          row={row}
          expanded={expandedRow === row.id}
          onToggle={() => onToggleRow(row.id)}
          onAction={onRowAction}
          routingPath={routingPath}
        />
      ))}
    </div>
  </aside>
);


export const TodayDesktopView = ({
  visibleModuleRail,
  today,
  roleCopy,
  live,
  initialLoading,
  glanceItems,
  rows,
  expandedRow,
  onToggleRow,
  onPrimary,
  onAction,
  routingPath,
  copilotRequest,
}) => (
    <div className="min-h-[calc(100dvh-3rem)]">
      <SEOHead title="Today" description="Role-scoped home for iVisit Console." />

      <section className="relative flex min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground">
        <AtlasLayer />
        <ConsoleModuleRail
          items={visibleModuleRail}
          activePath="/"
          onNavigate={onAction}
          routingPath={routingPath}
        />

        <div className="relative z-10 flex min-h-full w-full min-w-0 flex-col lg:flex-row lg:items-center">
          <TodayCenter
            today={today}
            roleCopy={roleCopy}
            live={live}
            initialLoading={initialLoading}
            glanceItems={glanceItems}
            onAction={onAction}
            routingPath={routingPath}
          />
          <TodaySheet
            today={today}
            rows={rows}
            expandedRow={expandedRow}
            onToggleRow={onToggleRow}
            onPrimary={onPrimary}
            onRowAction={onAction}
            routingPath={routingPath}
            copilotRequest={copilotRequest}
          />
        </div>
      </section>
    </div>
);
