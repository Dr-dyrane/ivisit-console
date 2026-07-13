import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

export const MobileGlanceTile = ({
  item,
  onPress = null,
  routingPath = null,
  toneClassMap,
  dataAttr = 'data-mobile-glance',
}) => {
  const actionKey = item.path || item.actionKey;
  const interactive = Boolean(onPress && actionKey);
  const isOpening = interactive && Boolean(routingPath) && routingPath === actionKey;
  const tone = toneClassMap[item.tone] || toneClassMap.muted;
  const Icon = item.icon;
  const Component = interactive ? motion.button : motion.div;

  return (
    <Component
      {...(interactive ? {
        type: 'button',
        onClick: (event) => onPress(event, actionKey),
        whileTap: { scale: 0.988 },
        'aria-label': `${item.label}: ${item.value}${isOpening ? ', opening' : ''}`,
      } : {})}
      {...{ [dataAttr]: String(item.label || '').toLowerCase() }}
      data-state={isOpening ? 'opening' : 'idle'}
      className={`surface-card flex min-h-[72px] items-start justify-between gap-2 rounded-inner px-4 py-3 text-left ${interactive
        ? 'transition-colors active:bg-foreground/[0.08] dark:active:bg-white/[0.10]'
        : ''}`}
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-muted-foreground">{item.label}</span>
        <span className="mt-1 block text-[15px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
          {item.value}
        </span>
      </span>
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${tone}`}>
        {isOpening ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : interactive ? (
          <ArrowRight className="h-3.5 w-3.5" />
        ) : Icon ? (
          <Icon className="h-3.5 w-3.5" />
        ) : null}
      </span>
    </Component>
  );
};
