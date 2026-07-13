import React, { useState } from 'react';
import { AlertTriangle, Clock, Activity } from 'lucide-react';
import { LocationCell } from '../ui/LocationCell';

export const RecentAlertsPanel = ({ emergencyRequests, setSelectedMarker }) => {
	const [statusFilter, setStatusFilter] = useState('all');

	const filteredRequests = emergencyRequests.filter(req => {
		if (statusFilter === 'all') return true;
		return req.status === statusFilter;
	});

	const getStatusIcon = (status) => {
		// PULLBACK NOTE: Updated status icons to match new emergency schema
		// OLD: pending, dispatched, en_route
		// NEW: pending, assigned, in_progress, completed, cancelled
		switch (status) {
			case 'pending': return <Clock className="h-3 w-3" />;
			case 'assigned': return <Activity className="h-3 w-3" />;
			case 'in_progress': return <Activity className="h-3 w-3" />;
			case 'completed': return <AlertTriangle className="h-3 w-3" />;
			default: return <AlertTriangle className="h-3 w-3" />;
		}
	};

	const getStatusColor = (status) => {
		// PULLBACK NOTE: Updated status colors to match new emergency schema
		// OLD: pending, dispatched, en_route, arrived
		// NEW: pending, assigned, in_progress, completed, cancelled
		switch (status) {
			case 'pending': return 'text-amber-600 dark:text-amber-300';
			case 'assigned': return 'text-cyan-600 dark:text-cyan-300';
			case 'in_progress': return 'text-sky-600 dark:text-sky-300';
			case 'completed': return 'text-emerald-600 dark:text-emerald-300';
			case 'cancelled': return 'text-destructive';
			default: return 'text-muted-foreground';
		}
	};

	return (
		<section className="rounded-card bg-card/68 p-4 shadow-e3 backdrop-blur-2xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-bold text-sm flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
					Recent Alerts
				</h3>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="text-xs bg-muted/40 rounded-inner px-2 py-1 focus-visible:bg-muted/60"
				>
					<option value="all">All</option>
					{/* PULLBACK NOTE: Updated status options to match new emergency schema */}
					{/* OLD: pending, dispatched, en_route, arrived */}
					{/* NEW: pending, assigned, in_progress, completed, cancelled */}
					<option value="pending">Pending</option>
					<option value="assigned">Assigned</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			{/* Alerts List - Apple-style minimal */}
			<div className="space-y-1 max-h-48 overflow-y-auto">
				{filteredRequests.slice(0, 4).map((req) => (
					<div
						key={req.id}
						className="group flex items-center gap-3 p-2 rounded-inner hover:bg-muted/40 cursor-pointer transition-colors"
						onClick={() =>
							setSelectedMarker({ type: "emergency", data: req })
						}
					>
						{/* Status Icon */}
						<div className={`shrink-0 ${getStatusColor(req.status)}`}>
							{getStatusIcon(req.status)}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between mb-1">
								<span className="font-normal text-xs text-muted-foreground truncate">
									#{req.id?.slice(-6)}
								</span>
								<span
									className={`inline-flex items-center rounded-pill text-[9px] px-1.5 h-4 ${
										req.service_type === 'critical_care'
											? "bg-destructive/10 text-destructive"
											: req.service_type === 'ambulance'
												? "bg-sky-500/10 text-sky-700 dark:text-sky-200"
												: req.service_type === 'bed'
													? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
													: "bg-muted/50 text-muted-foreground"
									}`}
								>
									{/* PULLBACK NOTE: Changed fallback text for better UX */}
									{/* OLD: "unknown" */}
									{/* NEW: "emergency" */}
									{req.service_type?.replace('_', ' ') || "emergency"}
								</span>
							</div>
							<div className="text-xs text-muted-foreground truncate">
								{req.hospital_name || (
									<LocationCell 
										location={req.patient_location} 
										pickupLocation={req.pickup_location}
										responderLocation={req.responder_location}
									/>
								) || "Emergency request"}
							</div>
						</div>
					</div>
				))}
				{filteredRequests.length === 0 && (
					<div className="text-center py-6 text-muted-foreground/60">
						<AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-40" />
						<p className="text-xs">No {statusFilter !== 'all' ? statusFilter : ''} alerts</p>
					</div>
				)}
			</div>
		</section>
	);
};
