// Console design system - glance tile (NAV variant; donor: Today's GlanceCard).
// THE ARCHITECTURE RULES LIVE HERE, not in pages:
//   - THE Today tile recipe: min-h-[66px] px-3 py-2.5 sm:px-4 md:py-3 on a
//     rounded-inner frosted fill, neutral shadow-e2-lift at rest (KPI tiles
//     must match this recipe exactly -- KpiStrip owns the FILTER variant)
//   - NAV semantics: the tile navigates; while its route transition is
//     acknowledged the trailing orb swaps ArrowRight -> Loader2 and
//     data-state reads 'opening' (aria-label appends ', opening')
//   - anatomy: label over value in the min-w-0 column; tone colour lives on
//     the trailing orb ONLY, from the page's tone map; pathless tiles disable
//   - motion: whileHover y:-2, whileTap 0.98 -- no entrance motion, ever
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

export const GlanceTile = ({ item, onAction, routingPath, toneClassMap, dataAttr = 'data-glance' }) => {
  const isOpening = item.path && routingPath === item.path;
  const toneClass = toneClassMap[item.tone] || toneClassMap.muted;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAction(item.path)}
      disabled={!item.path}
      aria-label={`${item.label}: ${item.value}${isOpening ? ', opening' : ''}`}
      {...{ [dataAttr]: item.label.toLowerCase() }}
      data-state={isOpening ? 'opening' : 'idle'}
      style={{ outline: 'none' }}
      className="group min-h-[66px] cursor-pointer rounded-inner bg-card/65 px-3 py-2.5 text-left shadow-e2-lift backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 hover:bg-card/82 focus-visible:-translate-y-0.5 focus-visible:bg-foreground/10 focus-visible:shadow-e3 active:bg-card/90 disabled:pointer-events-none disabled:opacity-70 dark:bg-white/[0.055] dark:hover:bg-white/[0.085] dark:focus-visible:bg-white/[0.12] sm:px-4 md:py-3"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            {item.label}
          </span>
          <span className="mt-1 block text-[13px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-sm">
            {item.value}
          </span>
        </span>
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill transition-[background,color,transform] duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 ${toneClass}`}>
          {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
        </span>
      </span>
    </motion.button>
  );
};
