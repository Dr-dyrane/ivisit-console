import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useConsoleCopilot } from '../ConsoleCopilotContext';

export const CopilotActionButton = ({
  label,
  request,
  className = '',
  compact = false,
  onBeforeOpen,
}) => {
  const { available, openCopilot, isPreparing } = useConsoleCopilot();

  return (
    <Button
      type="button"
      variant="ghost"
      className={`${compact ? 'h-10 text-sm' : 'h-11 text-sm'} w-full rounded-button bg-muted/25 font-semibold text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:text-foreground active:scale-[0.99] active:bg-foreground/15 ${className}`}
      onClick={() => {
        onBeforeOpen?.();
        openCopilot(request);
      }}
      disabled={!available}
      aria-busy={isPreparing}
      title={available ? undefined : 'Copilot is unavailable on this surface.'}
      data-copilot-trigger="true"
    >
      {isPreparing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {isPreparing ? 'Preparing' : label}
    </Button>
  );
};
