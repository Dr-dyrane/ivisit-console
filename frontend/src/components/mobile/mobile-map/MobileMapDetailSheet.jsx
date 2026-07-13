import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Ambulance,
  CheckCheck,
  Hospital as HospitalIcon,
  Phone,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { LocationCell } from '../../ui/LocationCell';
import mobileMotion from '../mobileMotion';
import {
  ambulanceStatusTone,
  formatRequestTime,
  statusLabel,
} from './mobileMapPresentation';

export const MobileMapDetailSheet = ({ controller, setSelectedMarker }) => {
  const {
    canManageRequests,
    commandBusy,
    confirmClose,
    emergencyActionState,
    handleComplete,
    handleDispatch,
    mapCommand,
    patientData,
    selectedMarker,
  } = controller;

  return (
    <AnimatePresence>
      {selectedMarker && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={mobileMotion.spring}
          className="fixed left-3 right-3 z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
        >
          <div className="chrome-glass relative max-h-[44dvh] overflow-y-auto rounded-sheet p-0 overscroll-contain">
            <div className="w-12 h-1.5 bg-foreground/20 rounded-pill mx-auto my-3" />

            <button
              onClick={() => setSelectedMarker(null)}
              className="absolute right-5 top-4 flex h-9 w-9 items-center justify-center rounded-button text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.96]"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-8">
              <header className="flex items-center gap-4 mb-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-icon shadow-inner ${selectedMarker.type === 'emergency' ? 'bg-destructive/10' : selectedMarker.type === 'ambulance' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`}
                >
                  {selectedMarker.type === 'emergency' && <AlertTriangle className="text-destructive" />}
                  {selectedMarker.type === 'ambulance' && (
                    <Ambulance className="text-emerald-600 dark:text-emerald-300" />
                  )}
                  {selectedMarker.type === 'hospital' && (
                    <HospitalIcon className="text-sky-600 dark:text-sky-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {selectedMarker.type} - {statusLabel(selectedMarker.data.status, 'Status not recorded')}
                  </p>
                  <h3 className="truncate text-lg font-semibold">
                    {patientData?.name
                      || selectedMarker.data.name
                      || selectedMarker.data.call_sign
                      || (selectedMarker.data.id
                        ? `#${selectedMarker.data.id.slice(-6)}`
                        : 'Map point')}
                  </h3>
                </div>
              </header>

              <div className="space-y-4">
                {selectedMarker.type === 'emergency' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-pill px-2.5 py-1 font-semibold text-[11px] ${String(selectedMarker.data.priority || '').toLowerCase() === 'critical' ? 'bg-destructive text-white' : 'bg-sky-500/15 text-sky-700 dark:text-sky-200'}`}>
                        {statusLabel(selectedMarker.data.priority, 'Not recorded')}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Requested: {formatRequestTime(selectedMarker.data.created_at)}
                      </span>
                    </div>

                    <div className="space-y-3 rounded-inner bg-muted/20 p-4">
                      <div className="flex items-center gap-3">
                        <Phone size={14} className="text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {patientData?.phone || 'No phone recorded'}
                        </span>
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
                      {canManageRequests && emergencyActionState?.canDispatch && (
                        <Button
                          className="h-14 flex-1 rounded-button bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-200"
                          disabled={commandBusy}
                          aria-busy={mapCommand === "send"}
                          onClick={handleDispatch}
                        >
                          {mapCommand === 'send'
                            ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            : <Send className="mr-2 h-4 w-4" />}
                          {mapCommand === 'send' ? 'Sending' : 'Send unit'}
                        </Button>
                      )}
                      {canManageRequests && emergencyActionState?.canComplete && (
                        <Button
                          className="h-14 flex-1 rounded-button bg-sky-500/15 font-semibold text-sky-700 dark:text-sky-200"
                          disabled={commandBusy}
                          aria-busy={mapCommand === "close"}
                          data-confirming={confirmClose ? "true" : "false"}
                          onClick={handleComplete}
                        >
                          {mapCommand === 'close'
                            ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            : <CheckCheck className="mr-2 h-4 w-4" />}
                          {mapCommand === 'close'
                            ? 'Closing'
                            : confirmClose
                              ? 'Confirm close'
                              : 'Close request'}
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
                    <div className="rounded-inner bg-muted/20 p-4 text-center">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">Status</p>
                      <p className={`text-sm font-semibold ${ambulanceStatusTone(selectedMarker.data.status)}`}>
                        {statusLabel(selectedMarker.data.status, 'Not recorded')}
                      </p>
                    </div>
                    <div className="rounded-inner bg-muted/20 p-4 text-center">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">Vehicle</p>
                      <p className="text-sm font-semibold">
                        {selectedMarker.data.vehicle_number || 'Not recorded'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedMarker.type === 'hospital' && (
                  <>
                    <div className="rounded-inner bg-muted/20 p-4">
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        {selectedMarker.data.address || 'No address recorded'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-inner bg-sky-500/[0.08] p-4">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Beds</p>
                        <p className={`${selectedMarker.data.available_beds == null ? 'text-sm' : 'text-xl'} font-semibold text-sky-600 dark:text-sky-300`}>
                          {selectedMarker.data.available_beds ?? 'Not recorded'}
                        </p>
                      </div>
                      <div className="rounded-inner bg-muted/20 p-4">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Fleet</p>
                        <p className={`${selectedMarker.data.ambulances_count == null ? 'text-sm' : 'text-xl'} font-semibold`}>
                          {selectedMarker.data.ambulances_count ?? 'Not recorded'}
                        </p>
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
  );
};
