import React from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { SIDEBAR_LAYOUT_OPTIONS } from './islandNavigationModel';

export const SidebarLayoutDialog = ({ onOpenChange, onSelectMode, open, sidebarMode }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="sm:max-w-[400px] p-0 overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl shadow-2xl rounded-modal"
      style={{ borderWidth: 0 }}
    >
      <DialogHeader className="pt-6 px-6">
        <DialogTitle className="text-center text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sidebar Layout
        </DialogTitle>
        <DialogDescription className="sr-only">
          Choose how the desktop sidebar opens and stays visible.
        </DialogDescription>
      </DialogHeader>

      <div className="px-3 pb-6 pt-2">
        <div className="flex flex-col gap-1">
          {SIDEBAR_LAYOUT_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={sidebarMode === item.id}
              onClick={() => onSelectMode(item.id)}
              className={`
                relative flex items-center gap-4 p-3 rounded-inner transition-all duration-200 group
                ${sidebarMode === item.id
                  ? 'bg-white/40 dark:bg-white/10 shadow-sm'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]'}
              `}
            >
              <div className={`
                w-10 h-10 rounded-icon flex items-center justify-center transition-colors
                ${sidebarMode === item.id
                  ? 'bg-[hsl(var(--spark)/0.88)] text-black dark:text-zinc-950 shadow-[0_14px_30px_-18px_hsl(var(--spark)/0.65)]'
                  : 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}
              `}
              >
                <item.icon className="w-5 h-5" strokeWidth={2.2} />
              </div>

              <div className="flex-1 text-left">
                <h4 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                  {item.title}
                </h4>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {item.desc}
                </p>
              </div>

              {sidebarMode === item.id && (
                <div className="mr-2">
                  <Check className="w-4 h-4 text-[hsl(var(--spark)/0.92)]" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
