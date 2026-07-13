import React from 'react';
import { MapPin } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const MarkerSkeleton = ({ className }) => (
  <Skeleton className={`absolute h-10 w-10 rounded-pill shadow-e2 ${className}`} />
);

export const MapLoadingState = ({ mobile = false }) => (
  <div
    className="absolute inset-0 z-[130] overflow-hidden bg-background"
    role="status"
    aria-live="polite"
    aria-label="Loading live map"
  >
    <div className="absolute inset-0 bg-muted/20" />
    <div className="absolute inset-0 opacity-40 [background-size:4rem_4rem] [background-image:linear-gradient(to_right,hsl(var(--muted-foreground)/0.08)_0.0625rem,transparent_0.0625rem),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.08)_0.0625rem,transparent_0.0625rem)]" />

    <MarkerSkeleton className="left-[24%] top-[36%]" />
    <MarkerSkeleton className="left-[58%] top-[28%]" />
    <MarkerSkeleton className="left-[68%] top-[56%]" />
    <MarkerSkeleton className="left-[38%] top-[66%]" />

    <div className={`absolute ${mobile ? 'left-3 right-3 top-[calc(env(safe-area-inset-top)+3.5rem)]' : 'left-6 top-6 w-[18rem]'} rounded-card bg-card/72 p-3 shadow-e3 backdrop-blur-xl`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground/75">
        <MapPin className="h-4 w-4" />
        Loading live map
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Skeleton className="h-12 rounded-button" />
        <Skeleton className="h-12 rounded-button" />
        <Skeleton className="h-12 rounded-button" />
      </div>
    </div>

    {mobile ? (
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-3 right-3 rounded-sheet bg-card/72 p-5 shadow-e3 backdrop-blur-xl">
        <Skeleton className="mx-auto mb-5 h-1.5 w-12 rounded-pill" />
        <Skeleton className="mb-3 h-5 w-2/5" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    ) : (
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <Skeleton className="h-12 w-12 rounded-button shadow-e2" />
        <Skeleton className="h-12 w-12 rounded-button shadow-e2" />
      </div>
    )}
  </div>
);
