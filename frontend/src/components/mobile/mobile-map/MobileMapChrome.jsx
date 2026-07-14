import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  MapLayerControls,
  MapLoadingState,
  MapViewportSummary,
} from '../../map';
import mobileMotion from '../mobileMotion';

export const MobileMapChrome = ({
  activeRoutes,
  controller,
  focusSource,
  isSwitchingMap,
  locationStatus,
  mapData,
  mapLens,
  toggleLayer,
  driverMode = false,
}) => {
  const {
    error,
    handleFilter,
    handleRefresh,
    hasMapPoints,
    isRefreshing,
    loading,
    mapKPIs,
    mapNotice,
    selectedMarker,
    showInitialLoading,
    showRefreshState,
  } = controller;
  const { showLayers } = mapData;
  const hasStatusBanner = Boolean(showRefreshState || error || (!loading && !hasMapPoints));

  return (
    <>
      {showInitialLoading && <MapLoadingState mobile />}

      {!driverMode && (
        <div className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[80] mx-auto max-w-2xl pointer-events-auto">
          <div className="chrome-glass rounded-card p-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {mapKPIs.map((item) => {
                const isActive = (mapData?.filter || 'all') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleFilter(item)}
                    disabled={isSwitchingMap}
                    aria-pressed={isActive}
                    aria-label={`${item.label} requests, ${item.value}`}
                    className={`min-h-12 min-w-[5.2rem] rounded-button px-3 py-2 text-left transition-all active:scale-[0.96] disabled:opacity-50 ${isActive ? 'bg-foreground text-background shadow-e2' : 'bg-foreground/[0.05] text-foreground/78'}`}
                  >
                    <span className="block text-[11px] font-medium opacity-70">{item.label}</span>
                    <span className="block text-lg font-semibold leading-none">{item.value}</span>
                  </button>
                );
              })}
            </div>
            <MapViewportSummary
              compact
              lens={mapLens}
              locationStatus={locationStatus}
              focusSource={focusSource}
              routeCount={activeRoutes.length}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {(showRefreshState || error || (!loading && !hasMapPoints)) && (
          <motion.div
            key={error ? 'error' : showRefreshState ? 'refreshing' : 'empty'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className={`pointer-events-auto absolute left-3 right-3 z-[75] mx-auto max-w-2xl ${driverMode ? 'top-[calc(env(safe-area-inset-top)+3.5rem)]' : 'top-[calc(env(safe-area-inset-top)+10.75rem)]'}`}
          >
            <div className="chrome-glass flex min-h-12 items-center gap-3 rounded-card px-4 py-3 shadow-e3">
              {!error && showRefreshState && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground/70" />
              )}
              {error && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
              <p
                className="min-w-0 flex-1 text-xs font-medium text-foreground/80"
                role={error ? 'alert' : 'status'}
                aria-live="polite"
              >
                {error
                  ? 'Map data could not be refreshed.'
                  : showRefreshState
                    ? 'Updating map data'
                    : 'No map points are available in this scope.'}
              </p>
              {error && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="min-h-10 rounded-button bg-foreground/[0.08] px-3 text-xs font-semibold text-foreground active:scale-[0.96] disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mapNotice && !error && !loading && !isRefreshing && (
        <p className="sr-only" role="status" aria-live="polite">{mapNotice}</p>
      )}

      <div
        className="absolute right-4 z-[100] flex flex-col items-end gap-3 transition-[bottom] duration-200"
        style={{
          bottom: driverMode
            ? 'auto'
            : selectedMarker
              ? 'calc(env(safe-area-inset-bottom) + 44dvh + 6.25rem)'
              : 'calc(env(safe-area-inset-bottom) + 6rem)',
          top: driverMode
            ? `calc(env(safe-area-inset-top) + ${hasStatusBanner ? '7.5rem' : '4rem'})`
            : 'auto',
        }}
      >
        <motion.button
          whileTap={mobileMotion.press.control}
          onClick={(event) => {
            event.stopPropagation();
            handleRefresh();
          }}
          disabled={loading || isRefreshing}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-button chrome-glass disabled:opacity-60"
          aria-label={loading || isRefreshing ? 'Refreshing map' : 'Refresh map'}
          aria-busy={loading || isRefreshing}
        >
          <RefreshCw
            size={20}
            className={`${loading || isRefreshing ? 'animate-spin' : ''} text-foreground/70`}
          />
        </motion.button>

        <MapLayerControls showLayers={showLayers} setShowLayers={toggleLayer} />
      </div>
    </>
  );
};
