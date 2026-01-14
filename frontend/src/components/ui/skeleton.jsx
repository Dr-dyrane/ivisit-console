import { cn } from "@/lib/utils"

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "shimmer rounded-md bg-muted/50",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="squircle-lg glass shadow-premium p-6 border-0 space-y-4">
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
        <div key={i} className="squircle-lg glass shadow-premium p-6 border-0 space-y-4">
          <Skeleton className="w-10 h-10 squircle" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
};

export const AuthSkeleton = () => {
  return (
    <div className="min-h-screen bg-background overflow-y-auto overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-96 h-96 bg-secondary/6 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Logo Skeleton */}
          <div className="text-center">
            <Skeleton className="w-24 h-24 squircle-xl mx-auto mb-6" />
            <Skeleton className="h-10 w-48 mx-auto mb-3" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>

          {/* Auth Card Skeleton */}
          <div className="squircle-xl glass border-0 p-8 shadow-premium space-y-6">
            {/* Toggle Skeleton */}
            <div className="flex gap-2 p-1.5 bg-muted/20 squircle-xl">
              <Skeleton className="flex-1 h-12 squircle-lg" />
              <Skeleton className="flex-1 h-12 squircle-lg" />
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-5">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-14 squircle-lg" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-14 squircle-lg" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-14 squircle-lg" />
              </div>
            </div>

            {/* Button Skeleton */}
            <Skeleton className="w-full h-14 squircle-xl" />

            {/* Role Info Skeleton */}
            <div className="pt-6 border-t border-border/50">
              <Skeleton className="h-4 w-32 mx-auto mb-4" />
              <div className="flex justify-center gap-2">
                <Skeleton className="h-6 w-16 squircle-sm" />
                <Skeleton className="h-6 w-20 squircle-sm" />
                <Skeleton className="h-6 w-18 squircle-sm" />
                <Skeleton className="h-6 w-14 squircle-sm" />
              </div>
            </div>
          </div>

          {/* Demo Card Skeleton */}
          <div className="squircle-xl glass border-0 p-6 shadow-premium">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 squircle" />
              <Skeleton className="h-4 flex-1" />
            </div>
          </div>
        </div>
      </div>
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
    </div>
  );
};
