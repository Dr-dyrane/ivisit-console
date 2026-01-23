import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, Ambulance, Hospital, MapPin, Phone, Send, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dispatchEmergency, completeEmergency } from '../../services/emergencyResponseService';
import { toast } from 'sonner';

export const MarkerDetailPanel = ({ selectedMarker, setSelectedMarker, onRefresh }) => {
	const { isAdmin, isOrgAdmin } = useAuth();
	if (!selectedMarker) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, x: 20, scale: 0.95 }}
				animate={{ opacity: 1, x: 0, scale: 1 }}
				exit={{ opacity: 0, x: 20, scale: 0.95 }}
				className="absolute top-4 right-4 z-[400] w-80"
			>
				<Card className="squircle-xl p-0 overflow-hidden bg-background/50 backdrop-blur-xs border-0 shadow-premium backdrop-blur-xl bg-background/60">
					{/* Header Image/Color */}
					<div
						className={`h-24 relative ${selectedMarker.type === "emergency"
							? "bg-destructive/20"
							: selectedMarker.type === "ambulance"
								? "bg-success/20"
								: "bg-info/20"
							}`}
					>
						<div className="absolute inset-0 flex items-center justify-center">
							{selectedMarker.type === "emergency" && (
								<AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
							)}
							{selectedMarker.type === "ambulance" && (
								<Ambulance className="h-10 w-10 text-success opacity-50" />
							)}
							{selectedMarker.type === "hospital" && (
								<Hospital className="h-10 w-10 text-info opacity-50" />
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSelectedMarker(null)}
							className="absolute top-2 right-2 rounded-full hover:bg-black/10 h-8 w-8 p-0"
						>
							×
						</Button>
					</div>

					<div className="p-5 -mt-6 relative z-10">
						<div className="squircle-lg bg-background shadow-lg p-4 mb-4 flex items-center justify-between">
							<div>
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									{selectedMarker.type}
								</p>
								<h3 className="font-bold text-xl truncate w-48">
									{selectedMarker.data.name ||
										selectedMarker.data.call_sign ||
										`#${selectedMarker.data.id?.slice(-6)}`}
								</h3>
							</div>
						</div>

						{selectedMarker.type === "emergency" && (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<Badge
										className={`squircle font-semibold ${selectedMarker.data.priority === "critical"
											? "bg-destructive text-destructive-foreground"
											: selectedMarker.data.priority === "high"
												? "bg-warning text-warning-foreground"
												: "bg-info text-info-foreground"
											}`}
									>
										{selectedMarker.data.priority || "medium"}
									</Badge>
									<Badge
										className="squircle bg-muted"
										variant="secondary"
									>
										{selectedMarker.data.status}
									</Badge>
								</div>

								<div className="p-3 squircle bg-muted/30">
									<div className="flex items-start gap-2 text-sm">
										<MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
										<span className="font-normal">
											{selectedMarker.data.location || "Location shared"}
										</span>
									</div>
								</div>

								<div className="flex gap-2">
									{/* Dispatch button for unassigned emergencies */}
									{(isAdmin() || isOrgAdmin()) &&
										(selectedMarker.data.status === 'pending' || selectedMarker.data.status === 'in_progress') &&
										!selectedMarker.data.ambulance_id && (
											<Button
												className="flex-1 squircle bg-success hover:bg-success/90 shadow-glow font-semibold"
												size="lg"
												onClick={async () => {
													try {
														toast.loading('Dispatching...', { id: 'map-dispatch' });
														const result = await dispatchEmergency(selectedMarker.data.id, selectedMarker.data);
														toast.success('Emergency dispatched!', { id: 'map-dispatch' });
														toast.info(`Ambulance: ${result.assignments.ambulance?.type || 'Assigned'}`);
														setSelectedMarker(null);
														if (onRefresh) onRefresh();
													} catch (error) {
														toast.error('Dispatch failed', { id: 'map-dispatch' });
													}
												}}
											>
												<Send className="h-4 w-4 mr-2" />
												Dispatch Unit
											</Button>
										)}

									{/* Complete button for dispatched emergencies */}
									{(isAdmin() || isOrgAdmin()) &&
										(selectedMarker.data.status === 'accepted' || selectedMarker.data.ambulance_id) &&
										selectedMarker.data.status !== 'completed' && (
											<Button
												className="flex-1 squircle bg-info hover:bg-info/90 shadow-glow font-semibold"
												size="lg"
												onClick={async () => {
													if (!confirm('Mark as completed?')) return;
													try {
														await completeEmergency(selectedMarker.data.id);
														toast.success('Emergency completed!');
														setSelectedMarker(null);
														if (onRefresh) onRefresh();
													} catch (error) {
														toast.error('Failed to complete');
													}
												}}
											>
												<CheckCheck className="h-4 w-4 mr-2" />
												Mark Complete
											</Button>
										)}
								</div>
							</div>
						)}

						{selectedMarker.type === "ambulance" && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<div className="p-3 squircle bg-muted/30 text-center">
										<p className="text-xs text-muted-foreground font-semibold">
											STATUS
										</p>
										<p
											className={`font-bold ${selectedMarker.data.status === "available"
												? "text-success"
												: "text-warning"
												}`}
										>
											{selectedMarker.data.status?.toUpperCase()}
										</p>
									</div>
									<div className="p-3 squircle bg-muted/30 text-center">
										<p className="text-xs text-muted-foreground font-semibold">
											TYPE
										</p>
										<p className="font-bold">
											{selectedMarker.data.type || "BLS"}
										</p>
									</div>
								</div>
								<div className="p-3 squircle bg-muted/30 flex justify-between items-center">
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
									<div className="p-3 squircle bg-muted/30">
										<p className="text-xs text-muted-foreground font-semibold mb-1">
											BEDS
										</p>
										<p className="font-bold text-2xl text-primary">
											{selectedMarker.data.available_beds || 0}
										</p>
									</div>
									<div className="p-3 squircle bg-muted/30">
										<p className="text-xs text-muted-foreground font-semibold mb-1">
											FLEET
										</p>
										<p className="font-bold text-2xl">
											{selectedMarker.data.ambulances_count || 0}
										</p>
									</div>
								</div>
								{selectedMarker.data.phone && (
									<Button
										variant="outline"
										className="w-full squircle font-semibold"
										size="sm"
									>
										<Phone className="h-4 w-4 mr-2" />
										Call Facility
									</Button>
								)}
							</div>
						)}
					</div>
				</Card>
			</motion.div>
		</AnimatePresence>
	);
};
