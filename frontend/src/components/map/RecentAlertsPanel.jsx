import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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
			case 'pending': return 'text-warning';
			case 'assigned': return 'text-info';
			case 'in_progress': return 'text-primary';
			case 'completed': return 'text-success';
			case 'cancelled': return 'text-destructive';
			default: return 'text-muted-foreground';
		}
	};

	return (
		<Card className="squircle-xl p-4 bg-background/50 backdrop-blur-xs border-0 shadow-premium backdrop-blur-xl bg-background/60">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-bold text-sm flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 text-warning" />
					Recent Alerts
				</h3>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="text-xs bg-background/50 border border-border/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
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
						className="group flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors"
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
								<Badge
									variant="secondary"
									className={`text-[9px] px-1.5 py-0 h-4 ${
										req.service_type === 'critical_care'
											? "bg-destructive/10 text-destructive"
											: req.service_type === 'ambulance'
												? "bg-primary/10 text-primary"
												: req.service_type === 'bed'
													? "bg-warning/10 text-warning"
													: "bg-muted/50 text-muted-foreground"
									}`}
								>
									{/* PULLBACK NOTE: Changed fallback text for better UX */}
									{/* OLD: "unknown" */}
									{/* NEW: "emergency" */}
									{req.service_type?.replace('_', ' ') || "emergency"}
								</Badge>
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
		</Card>
	);
};
