import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 squircle" />
        <Skeleton className="w-16 h-6 squircle-sm" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 squircle bg-muted/20">
          <Skeleton className="w-12 h-12 squircle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="w-24 h-8 squircle" />
        </div>
      ))}
    </div>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 space-y-4">
          <Skeleton className="w-10 h-10 squircle" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
};

export const BentoSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 md:gap-6 auto-rows-[140px]">
      <div className="col-span-1 md:col-span-3 lg:col-span-4 row-span-3">
        <Skeleton className="h-full squircle-lg" />
      </div>
      <div className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2">
        <Skeleton className="h-full squircle-lg" />
      </div>
      <div className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2">
        <Skeleton className="h-full squircle-lg" />
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2">
        <Skeleton className="h-full squircle-lg" />
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2">
        <Skeleton className="h-full squircle-lg" />
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2">
        <Skeleton className="h-full squircle-lg" />
      </div>
    </div>
  );
};
