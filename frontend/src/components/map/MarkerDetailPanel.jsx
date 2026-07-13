import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { AlertTriangle, Ambulance, Hospital, Phone, Send, CheckCheck, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { toast } from 'sonner';
// PULLBACK NOTE: Added imports for patient data standardization and location display
// NEW: import { getStandardizedPatient } from '../../utils/patientUtils";
// NEW: import { LocationCell } from '../ui/LocationCell';
import { getStandardizedPatient } from '../../utils/patientUtils';
import { LocationCell } from '../ui/LocationCell';

const statusLabel = (value, fallback = '') => {
	const text = String(value || fallback).replace(/[_-]+/g, ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
};

export const MarkerDetailPanel = ({ selectedMarker, setSelectedMarker, onRefresh }) => {
	const { isAdmin, isOrgAdmin } = useAuth();
	const [mapCommand, setMapCommand] = useState(null);
	const [confirmClose, setConfirmClose] = useState(false);

	useEffect(() => {
		setMapCommand(null);
		setConfirmClose(false);
	}, [selectedMarker?.type, selectedMarker?.data?.id]);

	if (!selectedMarker) return null;

	// PULLBACK NOTE: NEW - Get standardized patient data for emergencies
	// OLD: Used selectedMarker.data.name directly
	// NEW: Uses getStandardizedPatient for consistent patient info across app
	const patientData = selectedMarker.type === "emergency" ? getStandardizedPatient(selectedMarker.data) : null;
	const commandBusy = mapCommand !== null;

	const runMapCommand = async (command, loadingCopy, successCopy, fallbackCopy, action) => {
		const toastId = `map-marker-${command}`;
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
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, x: 20, scale: 0.95 }}
				animate={{ opacity: 1, x: 0, scale: 1 }}
				exit={{ opacity: 0, x: 20, scale: 0.95 }}
				className="absolute top-4 right-4 z-[400] w-80"
			>
				<div className="overflow-hidden rounded-card bg-card/68 p-0 shadow-e3 backdrop-blur-2xl">
					{/* Header Image/Color */}
					<div
						className={`h-24 relative ${selectedMarker.type === "emergency"
							? "bg-destructive/20"
							: selectedMarker.type === "ambulance"
								? "bg-emerald-500/20"
								: "bg-sky-500/20"
							}`}
					>
						<div className="absolute inset-0 flex items-center justify-center">
							{selectedMarker.type === "emergency" && (
								<AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
							)}
							{selectedMarker.type === "ambulance" && (
								<Ambulance className="h-10 w-10 text-emerald-600 opacity-50 dark:text-emerald-300" />
							)}
							{selectedMarker.type === "hospital" && (
								<Hospital className="h-10 w-10 text-sky-600 opacity-50 dark:text-sky-300" />
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSelectedMarker(null)}
							className="absolute right-2 top-2 h-8 w-8 rounded-button p-0 hover:bg-black/10"
							aria-label="Close details"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<div className="p-5 -mt-6 relative z-10">
						<div className="mb-4 flex items-center justify-between rounded-inner bg-background p-4 shadow-e1">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									{selectedMarker.type}
								</p>
								<h3 className="font-bold text-xl truncate w-48">
									{/* PULLBACK NOTE: Changed to use patient data first */}
									{/* OLD: selectedMarker.data.name */}
									{/* NEW: patientData?.name || selectedMarker.data.name */}
									{patientData?.name ||
										selectedMarker.data.name ||
										selectedMarker.data.call_sign ||
										`#${selectedMarker.data.id?.slice(-6)}`}
								</h3>
							</div>
						</div>

						{selectedMarker.type === "emergency" && (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<span
										className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${selectedMarker.data.priority === "critical"
											? "bg-destructive text-destructive-foreground"
											: selectedMarker.data.priority === "high"
												? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
												: "bg-sky-500/10 text-sky-700 dark:text-sky-200"
											}`}
									>
										{selectedMarker.data.priority || "medium"}
									</span>
									<span className="inline-flex rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
										{selectedMarker.data.status}
									</span>
								</div>

								{patientData?.phone && (
									<div className="p-3 rounded-inner bg-muted/30">
										<div className="flex items-start gap-2 text-sm">
											<Phone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
											<span className="font-normal">
												{patientData.phone}
											</span>
										</div>
									</div>
								)}

								{/* PULLBACK NOTE: Replaced raw location display with LocationCell */}
								{/* OLD: <MapPin> + selectedMarker.data.location */}
								{/* NEW: LocationCell with PostGIS geometry support */}
								<div className="p-3 rounded-inner bg-muted/30">
									<LocationCell
										location={selectedMarker.data.patient_location}
										pickupLocation={selectedMarker.data.pickup_location}
										responderLocation={selectedMarker.data.responder_location}
									/>
								</div>

								<div className="flex gap-2">
									{/* Send unit for unassigned emergencies */}
									{(isAdmin() || isOrgAdmin()) &&
										(selectedMarker.data.status === 'pending' || selectedMarker.data.status === 'in_progress') &&
										!selectedMarker.data.ambulance_id && (
											<Button
										className="flex-1 rounded-button bg-emerald-600 font-semibold text-white shadow-e2 hover:bg-emerald-500"
												size="lg"
												disabled={commandBusy}
												aria-busy={mapCommand === "send"}
												onClick={async () => {
													await runMapCommand("send", "Sending unit...", "Unit sent", "Could not send unit", async () => {
														const result = await dispatchEmergency(selectedMarker.data.id, selectedMarker.data);
														if (result?.assignments?.ambulance?.type) {
															toast.info(`Unit: ${result.assignments.ambulance.type}`);
														}
														setSelectedMarker(null);
														if (onRefresh) await onRefresh();
													});
												}}
											>
												{mapCommand === "send" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
												{mapCommand === "send" ? "Sending" : "Send unit"}
											</Button>
										)}

									{/* Close completed emergencies */}
									{(isAdmin() || isOrgAdmin()) &&
										(selectedMarker.data.status === 'accepted' || selectedMarker.data.ambulance_id) &&
										selectedMarker.data.status !== 'completed' && (
											<Button
										className="flex-1 rounded-button bg-sky-600 font-semibold text-white shadow-e2 hover:bg-sky-500"
												size="lg"
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
														if (onRefresh) await onRefresh();
													});
												}}
											>
												{mapCommand === "close" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}
												{mapCommand === "close" ? "Closing" : confirmClose ? "Confirm close" : "Close request"}
											</Button>
										)}
								</div>
							</div>
						)}

						{selectedMarker.type === "ambulance" && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<div className="p-3 rounded-inner bg-muted/30 text-center">
										<p className="text-xs text-muted-foreground font-semibold">
											Status
										</p>
										<p
											className={`font-bold ${selectedMarker.data.status === "available"
												? "text-emerald-600 dark:text-emerald-300"
												: "text-amber-600 dark:text-amber-300"
												}`}
										>
											{statusLabel(selectedMarker.data.status, 'Not recorded')}
										</p>
									</div>
									<div className="p-3 rounded-inner bg-muted/30 text-center">
										<p className="text-xs text-muted-foreground font-semibold">
											Type
										</p>
										<p className="font-bold">
											{selectedMarker.data.type || "BLS"}
										</p>
									</div>
								</div>
								<div className="p-3 rounded-inner bg-muted/30 flex justify-between items-center">
									<span className="text-sm font-medium text-muted-foreground">
										Vehicle No.
									</span>
									<span className="font-semibold font-mono">
										{selectedMarker.data.vehicle_number}
									</span>
								</div>
							</div>
						)}

						{selectedMarker.type === "hospital" && (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground leading-snug">
									{selectedMarker.data.address}
								</p>
								<div className="grid grid-cols-2 gap-3">
									<div className="p-3 rounded-inner bg-muted/30">
										<p className="text-xs text-muted-foreground font-semibold mb-1">
											Beds
										</p>
										<p className="font-bold text-2xl text-sky-600 dark:text-sky-300">
											{selectedMarker.data.available_beds || 0}
										</p>
									</div>
									<div className="p-3 rounded-inner bg-muted/30">
										<p className="text-xs text-muted-foreground font-semibold mb-1">
											Fleet
										</p>
										<p className="font-bold text-2xl">
											{selectedMarker.data.ambulances_count || 0}
										</p>
									</div>
								</div>
								{selectedMarker.data.phone && (
									<Button asChild variant="ghost" className="w-full rounded-button bg-muted/30 font-semibold hover:bg-muted/50" size="sm">
										<a href={`tel:${selectedMarker.data.phone}`}>
											<Phone className="mr-2 h-4 w-4" />
											Call facility
										</a>
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
