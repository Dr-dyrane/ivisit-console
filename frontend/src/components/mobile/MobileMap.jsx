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
    X
} from 'lucide-react';
import { Badge } from '../ui/badge';
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

/**
 * MobileMap
 * Mobile map surface for small screens.
 * Canon #9: Stress-Ready
 * Canon #20: Premium Lightness
 */
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
    const { selectedMarker, showLayers, loading } = mapData;
    const { isAdmin, isOrgAdmin } = useAuth();
    const canManageRequests = Boolean(isAdmin?.() || isOrgAdmin?.());
    const [mapCommand, setMapCommand] = useState(null);
    const [confirmClose, setConfirmClose] = useState(false);

    // Compact map filters for the top overlay.
    const mapKPIs = useMemo(() => [
        {
            id: 'all',
            label: 'Emergencies',
            value: filteredRequests.length,
            color: 'hsl(var(--destructive))'
        },
        {
            id: 'ambulance',
            label: 'Units Ready',
            value: processedAmbulances.filter(a => a.status === 'available').length,
            color: 'hsl(var(--success))'
        },
        {
            id: 'bed',
            label: 'Hospitals',
            value: processedHospitals.length,
            color: 'hsl(var(--info))'
        },
        {
            id: 'routes',
            label: 'Routes',
            value: activeRoutes.length,
            color: 'hsl(var(--primary))'
        },
        {
            id: 'markers',
            label: 'Markers',
            value: allMarkers.length,
            color: 'hsl(var(--secondary))'
        }
    ], [filteredRequests, processedAmbulances, processedHospitals, activeRoutes.length, allMarkers.length]);

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

    return (
        <div className="fixed inset-0 z-[20] bg-background overflow-hidden">
            {/* 1. Main map layer */}
            <div className="absolute inset-0 pt-12">
                {isSwitchingMap && (
                    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
                        <h3 className="text-xl font-medium mb-2">Syncing Map...</h3>
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

            <div className="absolute left-3 right-3 top-14 z-[80] pointer-events-auto">
                <div className="apple-glass-heavy rounded-[28px] p-2 shadow-premium">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {mapKPIs.slice(0, 4).map((item) => {
                            const isActive = (mapData?.filter || 'all') === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setFilter?.(item.id || 'all')}
                                    className={`min-w-[5.2rem] rounded-[22px] px-3 py-2 text-left transition-all active:scale-[0.98] ${isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-foreground/[0.04] text-foreground/78'}`}
                                >
                                    <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">
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

            {/* 3. Floating map controls */}
            <div className={`absolute right-4 flex flex-col items-end gap-3 z-[100] transition-all ${selectedMarker ? 'bottom-[25rem]' : 'bottom-24'}`}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        refresh();
                    }}
                    className="w-12 h-12 rounded-2xl apple-glass-heavy flex items-center justify-center shadow-lg pointer-events-auto"
                    aria-label="Refresh map"
                >
                    <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''} text-primary`} />
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (userLocation) {
                            toast.info("Centering map...");
                            window.dispatchEvent(new CustomEvent('recenter-map'));
                        } else {
                            toast.info("Location not ready");
                        }
                    }}
                    className="w-12 h-12 rounded-2xl apple-glass-heavy flex items-center justify-center shadow-lg pointer-events-auto"
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
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-20 left-4 right-4 z-40"
                    >
                        <div className="apple-glass-heavy rounded-[2.5rem] p-0 overflow-hidden shadow-2xl relative">
                            {/* Drag Handle */}
                            <div className="w-12 h-1 bg-foreground/10 rounded-full mx-auto my-3" />

                            <button
                                onClick={() => setSelectedMarker(null)}
                                className="absolute right-5 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground active:scale-95"
                                aria-label="Close details"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="px-6 pb-8">
                                <header className="flex items-center gap-4 mb-5">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                                        style={{
                                            background: `rgba(var(--${selectedMarker.type === 'emergency' ? 'destructive' : selectedMarker.type === 'ambulance' ? 'success' : 'info'}), 0.1)`
                                        }}
                                    >
                                        {selectedMarker.type === "emergency" && <AlertTriangle className="text-destructive" />}
                                        {selectedMarker.type === "ambulance" && <Ambulance className="text-success" />}
                                        {selectedMarker.type === "hospital" && <HospitalIcon className="text-info" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                                            {selectedMarker.type} - {selectedMarker.data.status || 'Active'}
                                        </p>
                                        <h3 className="text-lg font-semibold tracking-tight truncate">
                                            {patientData?.name || selectedMarker.data.name || selectedMarker.data.call_sign || `#${selectedMarker.data.id?.slice(-6)}`}
                                        </h3>
                                    </div>
                                </header>

                                {/* Content Grid */}
                                <div className="space-y-4">
                                    {selectedMarker.type === 'emergency' && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`squircle-sm font-black tracking-widest text-[9px] ${selectedMarker.data.priority === "critical" ? "bg-destructive text-white" : "bg-info text-white"
                                                    }`}>
                                                    {selectedMarker.data.priority?.toUpperCase()}
                                                </Badge>
                                                <span className="text-[11px] text-muted-foreground font-medium">
                                                    Requested: {new Date(selectedMarker.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className="bg-white/[0.03] p-4 rounded-3xl space-y-3">
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
                                                        className="flex-1 apple-glass-heavy bg-success/20 text-success rounded-2xl h-14 font-semibold tracking-tight"
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
                                                        className="flex-1 apple-glass-heavy bg-info/20 text-info rounded-2xl h-14 font-semibold tracking-tight"
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
                                                    <div className="flex-1 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs font-medium text-muted-foreground">
                                                        Review this request from Requests.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {selectedMarker.type === 'ambulance' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-white/[0.03] rounded-3xl text-center">
                                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                                                <p className={`text-sm font-semibold ${selectedMarker.data.status === 'available' ? 'text-success' : 'text-warning'}`}>
                                                    {selectedMarker.data.status?.toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-white/[0.03] rounded-3xl text-center">
                                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Vehicle</p>
                                                <p className="text-sm font-semibold">{selectedMarker.data.vehicle_number}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedMarker.type === 'hospital' && (
                                        <>
                                            <div className="p-4 bg-white/[0.03] rounded-3xl">
                                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                    {selectedMarker.data.address}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 bg-primary/[0.04] rounded-3xl">
                                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Beds</p>
                                                    <p className="text-xl font-semibold text-primary">{selectedMarker.data.available_beds || 0}</p>
                                                </div>
                                                <div className="p-4 bg-white/[0.03] rounded-3xl">
                                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Fleet</p>
                                                    <p className="text-xl font-semibold">{selectedMarker.data.ambulances_count || 0}</p>
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
