import { cn } from "@/lib/utils"

const isMobileViewport = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1279px)").matches;
};

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "shimmer rounded-inner bg-muted/50",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="rounded-card bg-background/35 backdrop-blur-xs shadow-premium p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-icon" />
        <Skeleton className="w-16 h-6 rounded-pill" />
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
        <div key={i} className="flex items-center gap-4 p-4 rounded-inner bg-muted/20">
          <Skeleton className="w-12 h-12 rounded-icon" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="w-24 h-8 rounded-button" />
        </div>
      ))}
    </div>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-card bg-background/35 backdrop-blur-xs shadow-premium p-6 space-y-4">
          <Skeleton className="w-10 h-10 rounded-icon" />
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
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Logo Skeleton */}
          <div className="text-center">
            <Skeleton className="w-24 h-24 rounded-card mx-auto mb-6" />
            <Skeleton className="h-10 w-48 mx-auto mb-3" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>

          {/* Auth Card Skeleton */}
          <div className="rounded-card bg-background/35 backdrop-blur-xs p-8 shadow-premium space-y-6">
            {/* Toggle Skeleton */}
            <div className="flex gap-2 p-1.5 bg-muted/20 rounded-inner">
              <Skeleton className="flex-1 h-12 rounded-button" />
              <Skeleton className="flex-1 h-12 rounded-button" />
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-5">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-14 rounded-inner" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-14 rounded-inner" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-14 rounded-inner" />
              </div>
            </div>

            {/* Button Skeleton */}
            <Skeleton className="w-full h-14 rounded-button" />

            {/* Role Info Skeleton */}
            <div className="relative pt-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[hsl(var(--muted-foreground)/0.08)]">
              <Skeleton className="h-4 w-32 mx-auto mb-4" />
              <div className="flex justify-center gap-2">
                <Skeleton className="h-6 w-16 rounded-pill" />
                <Skeleton className="h-6 w-20 rounded-pill" />
                <Skeleton className="h-6 w-18 rounded-pill" />
                <Skeleton className="h-6 w-14 rounded-pill" />
              </div>
            </div>
          </div>

          {/* Demo Card Skeleton */}
          <div className="rounded-card bg-background/35 backdrop-blur-xs p-6 shadow-premium">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-icon" />
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
        <Skeleton className="h-full rounded-card" />
      </div>
      <div className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2">
        <Skeleton className="h-full rounded-card" />
      </div>
      <div className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2">
        <Skeleton className="h-full rounded-card" />
      </div>
    </div>
  );
};

export const DashboardLayoutSkeleton = () => {
  return (
    <div className="min-h-screen bg-background overflow-y-auto overflow-x-hidden">
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <Skeleton className="h-10 w-48 mb-3" />
            <Skeleton className="h-5 w-96" />
          </div>

          <BentoSkeleton />
        </div>
      </div>
    </div>
  );
};

export const TableLayoutSkeleton = () => {
  return (
    <div className="min-h-screen bg-background overflow-y-auto overflow-x-hidden">
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-10 w-40 mb-3" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-24 rounded-button" />
          </div>

          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-40 rounded-button" />
            <Skeleton className="h-10 w-32 rounded-button" />
          </div>

          <TableSkeleton rows={8} />
        </div>
      </div>
    </div>
  );
};

export const MapLayoutSkeleton = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-40 mb-3" />
            <Skeleton className="h-5 w-60" />
          </div>
        </div>
        <div className="flex-1">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export const DynamicAuthSkeleton = ({ pathname = "/" }) => {
  const MobileAppSplash = () => (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,hsl(var(--primary)/0.12),transparent_42%),radial-gradient(circle_at_84%_18%,hsl(var(--spark)/0.09),transparent_45%),radial-gradient(circle_at_50%_88%,hsl(var(--secondary)/0.08),transparent_58%)]" />
        <div className="absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_82%)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%,rgba(255,255,255,0.015)_58%,transparent)]" />
        <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_50%_45%,black,transparent_68%)] bg-[conic-gradient(from_210deg_at_50%_45%,transparent_0deg,hsl(var(--primary)/0.06)_70deg,transparent_130deg,hsl(var(--spark)/0.05)_220deg,transparent_300deg)]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
            <div className="absolute inset-0 rounded-pill opacity-70 blur-2xl bg-[radial-gradient(circle,hsl(var(--primary)/0.22),transparent_70%)]" />
            <div className="absolute inset-2 rounded-pill opacity-40 blur-xl bg-[radial-gradient(circle,hsl(var(--spark)/0.20),transparent_72%)]" />

            <div className="relative w-28 h-28">
              <img
                src="/icon.png"
                alt="iVisit"
                className="absolute inset-0 z-10 w-full h-full object-contain select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                draggable="false"
              />
              <img
                src="/icon.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 z-20 w-full h-full object-contain select-none grayscale contrast-125 brightness-95 opacity-80"
                draggable="false"
              />

              <img
                src="/icon.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 z-[25] w-full h-full object-contain select-none shimmer opacity-70"
                draggable="false"
                style={{
                  WebkitMaskImage: 'linear-gradient(115deg, transparent 2%, black 34%, black 66%, transparent 98%)',
                  maskImage: 'linear-gradient(115deg, transparent 2%, black 34%, black 66%, transparent 98%)'
                }}
              />

              <div className="absolute inset-0 z-30 pointer-events-none shimmer opacity-45 [mask-image:linear-gradient(115deg,transparent_10%,black_42%,black_58%,transparent_90%)] bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.9),transparent)]" />
              <div className="absolute inset-0 z-[5] opacity-18 [mask-image:radial-gradient(circle_at_50%_45%,black,transparent_70%)] bg-white" />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="h-5 w-28 mx-auto rounded-pill bg-muted/20 shimmer" />
            <div className="h-3 w-40 mx-auto rounded-pill bg-muted/15 shimmer" />
          </div>

          <div className="mt-6 w-full h-1.5 rounded-pill bg-muted/15 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="h-full w-1/2 rounded-pill shimmer bg-[linear-gradient(90deg,hsl(var(--primary)/0.22),hsl(var(--spark)/0.18))]" />
          </div>
        </div>
      </div>
    </div>
  );

  const getSkeletonForPath = () => {
    if (isMobileViewport() && !["/login", "/unauthorized"].includes(pathname)) {
      return <MobileAppSplash />;
    }

    if (pathname === "/login" || pathname === "/unauthorized") {
      return <AuthSkeleton />;
    }

    if (pathname === "/" || pathname === "/analytics") {
      return <DashboardLayoutSkeleton />;
    }

    if (pathname === "/map") {
      return <MapLayoutSkeleton />;
    }

    if (
      [
        "/hospitals",
        "/ambulances",
        "/doctors",
        "/visits",
        "/users",
        "/emergencies",
        "/verification",
        "/settings",
      ].includes(pathname)
    ) {
      return <TableLayoutSkeleton />;
    }

    return <DashboardLayoutSkeleton />;
  };

  return getSkeletonForPath();
};
