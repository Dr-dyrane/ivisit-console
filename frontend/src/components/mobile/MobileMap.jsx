import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw,
    Navigation,
    AlertTriangle,
    Ambulance,
    Hospital as HospitalIcon,
    Phone,
    Send,
    CheckCheck,
    Loader2,
    X
} from 'lucide-react';
import { Button } from '../ui/button';
import {
    GoogleMapsRenderer,
    LeafletMapRenderer,
    MapErrorBoundary,
    MapFallback,
    MapLayerControls
} from '../map';
import { getStandardizedPatient } from '../../utils/patientUtils';
import { LocationCell } from '../ui/LocationCell';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import mobileMotion from './mobileMotion';

/**
 * MobileMap
 * Mobile map surface for small screens.
 * Canon #9: Stress-Ready
 * Canon #20: Premium Lightness
 */

// Sentence-case a raw status token ('in_progress' -> 'In progress').
// Status values render sentence-case, not .toUpperCase().
const statusLabel = (value, fallback = '') => {
    const text = String(value || fallback).replace(/[_-]+/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatRequestTime = (value) => {
    if (!value) return 'Time not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time not recorded';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ambulanceStatusTone = (value) => {
    const status = String(value || '').toLowerCase();
    if (status === 'available') return 'text-emerald-600 dark:text-emerald-300';
    if (['assigned', 'busy', 'en_route', 'in_use'].includes(status)) return 'text-amber-600 dark:text-amber-300';
    return 'text-foreground/70';
};

export const MobileMap = ({
    mapData,
    toggleLayer,
    setFilter,
    setSelectedMarker,
    refresh,
    userLocation,
    mapProvider,
    mapStyles,
    allMarkers,
    activeRoutes,
    processedAmbulances,
    processedHospitals,
    filteredRequests,
    simulatedSessionId,
    getPriorityColor,
    getStatusColor,
    routePrimaryColor,
    theme,
    isSwitchingMap,
    setMapProvider,
    setIsSwitchingMap,
    fallbackMap
}) => {
    const { selectedMarker, showLayers, loading, error } = mapData;
    const { isAdmin, isOrgAdmin } = useAuth();
    const canManageRequests = Boolean(isAdmin?.() || isOrgAdmin?.());
    const [mapCommand, setMapCommand] = useState(null);
    const [confirmClose, setConfirmClose] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mapNotice, setMapNotice] = useState('');

    // These controls filter request service types. Their counts intentionally mirror
    // the route-owned MapPanel contract instead of unrelated map entity totals.
    const mapKPIs = useMemo(() => {
        const requests = Array.isArray(mapData?.emergencyRequests) ? mapData.emergencyRequests : [];
        return [
            { id: 'all', label: 'All', value: requests.length },
            { id: 'ambulance', label: 'Ambulance', value: requests.filter((item) => item?.service_type === 'ambulance').length },
            { id: 'bed', label: 'Bed', value: requests.filter((item) => item?.service_type === 'bed').length },
            { id: 'critical_care', label: 'Critical care', value: requests.filter((item) => item?.service_type === 'critical_care').length },
        ];
    }, [mapData?.emergencyRequests]);

    // Format selected marker for the sheet
    const patientData = selectedMarker?.type === "emergency" ? getStandardizedPatient(selectedMarker.data) : null;
    const commandBusy = mapCommand !== null;

    useEffect(() => {
        setMapCommand(null);
        setConfirmClose(false);
    }, [selectedMarker?.type, selectedMarker?.data?.id]);

    const runMapCommand = async (command, loadingCopy, successCopy, fallbackCopy, action) => {
        const toastId = `mobile-map-${command}`;
        setMapCommand(command);
        toast.loading(loadingCopy, { id: toastId });
        try {
            await action();
            toast.success(successCopy, { id: toastId });
        } catch (error) {
            toast.error(error?.message || fallbackCopy, { id: toastId });
        } finally {
            setMapCommand(null);
        }
    };

    const handleRefresh = async () => {
        if (isRefreshing || loading) return;
        setIsRefreshing(true);
        setMapNotice('Updating map data');
        try {
            await refresh?.();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilter = (item) => {
        setFilter?.(item.id);
        setMapNotice(`${item.label} requests shown`);
    };

    const hasMapPoints = allMarkers.length > 0;
    const showInitialLoading = loading && !hasMapPoints;
    const showRefreshState = (loading || isRefreshing) && hasMapPoints;

    return (
        <div className="fixed inset-0 z-[20] bg-background overflow-hidden">
            {/* 1. Main map layer */}
            <div className="absolute inset-0 pt-12">
                {isSwitchingMap && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite">
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-foreground/70" />
                        <h3 className="text-sm font-semibold">Switching map</h3>
                    </div>
                )}

                <div className="absolute inset-0">
                    <MapErrorBoundary
                        fallback={fallbackMap || (
                            <MapFallback
                                filteredRequests={filteredRequests}
                                ambulances={processedAmbulances}
                                hospitals={processedHospitals}
                                activeRoutes={activeRoutes}
                                showLayers={showLayers}
                                userLocation={userLocation}
                                selectedMarker={selectedMarker}
                                setSelectedMarker={setSelectedMarker}
                            />
                        )}
                        onError={() => {
                            if (!isSwitchingMap) {
                                setIsSwitchingMap(true);
                                setMapProvider("leaflet");
                                setTimeout(() => setIsSwitchingMap(false), 2000);
                            }
                        }}
                    >
                        {mapProvider === "google" ? (
                            <GoogleMapsRenderer
                                theme={theme}
                                mapStyles={mapStyles}
                                userLocation={userLocation}
                                allMarkers={allMarkers}
                                activeRoutes={activeRoutes}
                                showLayers={showLayers}
                                filteredRequests={filteredRequests}
                                ambulances={processedAmbulances}
                                hospitals={processedHospitals}
                                simulatedSessionId={simulatedSessionId}
                                getPriorityColor={getPriorityColor}
                                getStatusColor={getStatusColor}
                                routePrimaryColor={routePrimaryColor}
                                setSelectedMarker={setSelectedMarker}
                                selectedMarker={selectedMarker}
                                fallback={fallbackMap || (
                                    <MapFallback
                                        filteredRequests={filteredRequests}
                                        ambulances={processedAmbulances}
                                        hospitals={processedHospitals}
                                        activeRoutes={activeRoutes}
                                        showLayers={showLayers}
                                        userLocation={userLocation}
                                        selectedMarker={selectedMarker}
                                        setSelectedMarker={setSelectedMarker}
                                    />
                                )}
                            />
                        ) : (
                            <LeafletMapRenderer
                                center={userLocation || { lat: 6.5244, lng: 3.3792 }}
                                zoom={12}
                                emergencies={filteredRequests}
                                ambulances={processedAmbulances}
                                hospitals={processedHospitals}
                                routes={activeRoutes}
                                userLocation={userLocation}
                                markers={allMarkers}
                                showLayers={showLayers}
                                onMarkerClick={(type, data) => setSelectedMarker({ type, data })}
                                getStatusColor={getStatusColor}
                                getPriorityColor={getPriorityColor}
                                theme={theme}
                            />
                        )}
                    </MapErrorBoundary>
                </div>

            </div>

            <div className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[80] pointer-events-auto">
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
                                    className={`min-h-12 min-w-[5.2rem] rounded-inner px-3 py-2 text-left transition-all active:scale-[0.96] disabled:opacity-50 ${isActive ? 'bg-foreground text-background shadow-[0_12px_32px_rgb(0_0_0/0.22)]' : 'bg-foreground/[0.05] text-foreground/78'}`}
                                >
                                    <span className="block text-[11px] font-medium opacity-70">
                                        {item.label}
                                    </span>
                                    <span className="block text-lg font-semibold leading-none">
                                        {item.value}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {(showInitialLoading || showRefreshState || error || (!loading && !hasMapPoints)) && (
                    <motion.div
                        key={error ? 'error' : showInitialLoading ? 'loading' : showRefreshState ? 'refreshing' : 'empty'}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                        className="pointer-events-auto absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+8.5rem)] z-[75]"
                    >
                        <div className="chrome-glass flex min-h-12 items-center gap-3 rounded-card px-4 py-3 shadow-[0_12px_32px_rgb(0_0_0/0.16)]">
                            {!error && (showInitialLoading || showRefreshState) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground/70" />}
                            {error && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
                            <p className="min-w-0 flex-1 text-xs font-medium text-foreground/80" role={error ? 'alert' : 'status'} aria-live="polite">
                                {error
                                    ? 'Map data could not be refreshed.'
                                    : showInitialLoading
                                        ? 'Loading map data'
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

            {/* 3. Floating map controls */}
            <div
                className="absolute right-4 z-[100] flex flex-col items-end gap-3 transition-[bottom] duration-200"
                style={{ bottom: selectedMarker ? 'calc(env(safe-area-inset-bottom) + 44dvh + 6.25rem)' : 'calc(env(safe-area-inset-bottom) + 6rem)' }}
            >
                <motion.button
                    whileTap={mobileMotion.press.control}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRefresh();
                    }}
                    disabled={loading || isRefreshing}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-button chrome-glass disabled:opacity-60"
                    aria-label={loading || isRefreshing ? 'Refreshing map' : 'Refresh map'}
                    aria-busy={loading || isRefreshing}
                >
                    <RefreshCw size={20} className={`${loading || isRefreshing ? 'animate-spin' : ''} text-foreground/70`} />
                </motion.button>

                <motion.button
                    whileTap={mobileMotion.press.control}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (userLocation) {
                            toast.info("Centering map...");
                            window.dispatchEvent(new CustomEvent('recenter-map'));
                        } else {
                            toast.info("Location not ready");
                        }
                    }}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-button chrome-glass"
                    aria-label="Center map"
                >
                    <Navigation size={20} className="text-foreground/60" />
                </motion.button>

                <MapLayerControls
                    showLayers={showLayers}
                    setShowLayers={toggleLayer}
                />
            </div>

            {/* 4. Adaptive detail sheet */}
            <AnimatePresence>
                {selectedMarker && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={mobileMotion.spring}
                        className="fixed left-3 right-3 z-40"
                        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
                    >
                        <div className="chrome-glass relative max-h-[44dvh] overflow-y-auto rounded-sheet p-0 overscroll-contain">
                            {/* Drag Handle */}
                            <div className="w-12 h-1.5 bg-foreground/20 rounded-pill mx-auto my-3" />

                            <button
                                onClick={() => setSelectedMarker(null)}
                                className="absolute right-5 top-4 flex h-9 w-9 items-center justify-center rounded-pill text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.96]"
                                aria-label="Close details"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="px-6 pb-8">
                                <header className="flex items-center gap-4 mb-5">
                                    <div
                                        className={`w-12 h-12 rounded-button flex items-center justify-center shadow-inner ${selectedMarker.type === 'emergency' ? 'bg-destructive/10' : selectedMarker.type === 'ambulance' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`}
                                    >
                                        {selectedMarker.type === "emergency" && <AlertTriangle className="text-destructive" />}
                                        {selectedMarker.type === "ambulance" && <Ambulance className="text-emerald-600 dark:text-emerald-300" />}
                                        {selectedMarker.type === "hospital" && <HospitalIcon className="text-sky-600 dark:text-sky-300" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="eyebrow">
                                            {selectedMarker.type} - {selectedMarker.data.status || 'Active'}
                                        </p>
                                        <h3 className="text-lg font-semibold tracking-tight truncate">
                                            {patientData?.name || selectedMarker.data.name || selectedMarker.data.call_sign || (selectedMarker.data.id ? `#${selectedMarker.data.id.slice(-6)}` : 'Map point')}
                                        </h3>
                                    </div>
                                </header>

                                {/* Content Grid */}
                                <div className="space-y-4">
                                    {selectedMarker.type === 'emergency' && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex rounded-pill px-2.5 py-1 font-semibold text-[11px] ${String(selectedMarker.data.priority || '').toLowerCase() === "critical" ? "bg-destructive text-white" : "bg-sky-500/15 text-sky-700 dark:text-sky-200"
                                                    }`}>
                                                    {statusLabel(selectedMarker.data.priority, 'Not recorded')}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-medium">
                                                    Requested: {formatRequestTime(selectedMarker.data.created_at)}
                                                </span>
                                            </div>

                                            <div className="bg-muted/20 p-4 rounded-card space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <Phone size={14} className="text-muted-foreground" />
                                                    <span className="text-sm font-medium">{patientData?.phone || 'No phone recorded'}</span>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <LocationCell
                                                        location={selectedMarker.data.patient_location}
                                                        pickupLocation={selectedMarker.data.pickup_location}
                                                        responderLocation={selectedMarker.data.responder_location}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                {canManageRequests && !selectedMarker.data.ambulance_id && (
                                                    <Button
                                                        className="flex-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 rounded-button h-14 font-semibold tracking-tight"
                                                        disabled={commandBusy}
                                                        aria-busy={mapCommand === "send"}
                                                        onClick={async () => {
                                                            await runMapCommand("send", "Sending unit...", "Unit sent", "Could not send unit", async () => {
                                                                await dispatchEmergency(selectedMarker.data.id, selectedMarker.data);
                                                                setSelectedMarker(null);
                                                                await refresh();
                                                            });
                                                        }}
                                                    >
                                                        {mapCommand === "send" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                        {mapCommand === "send" ? "Sending" : "Send unit"}
                                                    </Button>
                                                )}
                                                {canManageRequests && selectedMarker.data.ambulance_id && (
                                                    <Button
                                                        className="flex-1 bg-sky-500/15 text-sky-700 dark:text-sky-200 rounded-button h-14 font-semibold tracking-tight"
                                                        disabled={commandBusy}
                                                        aria-busy={mapCommand === "close"}
                                                        data-confirming={confirmClose ? "true" : "false"}
                                                        onClick={async () => {
                                                            if (!confirmClose) {
                                                                setConfirmClose(true);
                                                                toast.info("Confirm close to finish");
                                                                return;
                                                            }

                                                            await runMapCommand("close", "Closing request...", "Request closed", "Could not close request", async () => {
                                                                await completeEmergency(selectedMarker.data.id);
                                                                setSelectedMarker(null);
                                                                await refresh();
                                                            });
                                                        }}
                                                    >
                                                        {mapCommand === "close" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                                                        {mapCommand === "close" ? "Closing" : confirmClose ? "Confirm close" : "Close request"}
                                                    </Button>
                                                )}
                                                {!canManageRequests && (
                                                    <div className="flex-1 rounded-button bg-muted/25 px-4 py-3 text-xs font-medium text-muted-foreground">
                                                        Request actions are available to authorized operators.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {selectedMarker.type === 'ambulance' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-muted/20 rounded-card text-center">
                                                <p className="eyebrow mb-1">Status</p>
                                                <p className={`text-sm font-semibold ${ambulanceStatusTone(selectedMarker.data.status)}`}>
                                                    {statusLabel(selectedMarker.data.status, 'Not recorded')}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-muted/20 rounded-card text-center">
                                                <p className="eyebrow mb-1">Vehicle</p>
                                                <p className="text-sm font-semibold">{selectedMarker.data.vehicle_number || 'Not recorded'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedMarker.type === 'hospital' && (
                                        <>
                                            <div className="p-4 bg-muted/20 rounded-card">
                                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                    {selectedMarker.data.address || 'No address recorded'}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 bg-sky-500/[0.08] rounded-card">
                                                    <p className="eyebrow mb-1">Beds</p>
                                                    <p className={`${selectedMarker.data.available_beds == null ? 'text-sm' : 'text-xl'} font-semibold text-sky-600 dark:text-sky-300`}>{selectedMarker.data.available_beds ?? 'Not recorded'}</p>
                                                </div>
                                                <div className="p-4 bg-muted/20 rounded-card">
                                                    <p className="eyebrow mb-1">Fleet</p>
                                                    <p className={`${selectedMarker.data.ambulances_count == null ? 'text-sm' : 'text-xl'} font-semibold`}>{selectedMarker.data.ambulances_count ?? 'Not recorded'}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
