import React from 'react';
import { Loader2 } from 'lucide-react';

export const ConsoleModuleRail = ({
  items,
  activePath = '/',
  routingPath,
  onNavigate,
}) => (
  <nav className="hidden lg:flex absolute left-5 top-1/2 z-20 -translate-y-1/2 flex-col gap-3 rounded-pill bg-card/70 p-2 shadow-[0_18px_50px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-white/[0.06]">
    {items.map(({ id, icon: Icon, label, path }) => {
      const isOpening = routingPath === path;
      const isActive = activePath === path;

      return (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={`${label}${isOpening ? ', opening' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          data-console-rail={id}
          data-state={isOpening ? 'opening' : 'idle'}
          onClick={() => onNavigate(path)}
          className={`h-[38px] w-[38px] rounded-pill flex items-center justify-center transition-[background,color,transform] duration-200 focus-visible:bg-primary/15 focus-visible:text-foreground active:scale-[0.96] ${
            isActive
              ? 'bg-primary text-white shadow-[0_10px_30px_hsl(var(--primary)/0.28)]'
              : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.10]'
          }`}
        >
          {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </button>
      );
    })}
  </nav>
);

export default ConsoleModuleRail;
