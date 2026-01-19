import React from 'react';
import { Card } from '../ui/card';
import { Activity } from 'lucide-react';

export const LiveStatsPanel = ({ emergencyRequests, ambulances, hospitals }) => {
	return (
		<Card className="p-3 bg-background/50 backdrop-blur-xs border-0 shadow-premium backdrop-blur-xl bg-background/60">
			<div className="flex items-center gap-2 mb-3">
				<Activity className="h-4 w-4 text-primary" />
				<span className="font-black text-sm">Live</span>
			</div>
			
			<div className="grid grid-cols-3 gap-2">
				<div className="text-center p-2 rounded-lg bg-destructive/5">
					<div className="text-lg font-black text-destructive">
						{emergencyRequests.length}
					</div>
					<div className="text-xs text-muted-foreground">Active</div>
				</div>
				
				<div className="text-center p-2 rounded-lg bg-success/5">
					<div className="text-lg font-black text-success">
						{ambulances.filter((a) => a.status === "available").length}
					</div>
					<div className="text-xs text-muted-foreground">Ready</div>
				</div>
				
				<div className="text-center p-2 rounded-lg bg-info/5">
					<div className="text-lg font-black text-info">
						{hospitals.length}
					</div>
					<div className="text-xs text-muted-foreground">Sites</div>
				</div>
			</div>
		</Card>
	);
};
