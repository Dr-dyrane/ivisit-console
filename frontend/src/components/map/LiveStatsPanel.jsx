import React from 'react';
import { Card } from '../ui/card';
import { Activity } from 'lucide-react';

export const LiveStatsPanel = ({ emergencyRequests, ambulances, hospitals }) => {
	return (
		<Card className="p-3 rounded-card bg-card/68 backdrop-blur-2xl shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
			<div className="flex items-center gap-2 mb-3">
				<Activity className="h-4 w-4 text-muted-foreground" />
				<span className="font-bold text-sm">Live</span>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<div className="text-center p-2 rounded-inner bg-destructive/5">
					<div className="text-lg font-bold text-destructive">
						{emergencyRequests.length}
					</div>
					<div className="text-xs text-muted-foreground">Active</div>
				</div>

				<div className="text-center p-2 rounded-inner bg-emerald-500/10">
					<div className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
						{ambulances.filter((a) => a.status === "available").length}
					</div>
					<div className="text-xs text-muted-foreground">Ready</div>
				</div>

				<div className="text-center p-2 rounded-inner bg-sky-500/10">
					<div className="text-lg font-bold text-sky-600 dark:text-sky-300">
						{hospitals.length}
					</div>
					<div className="text-xs text-muted-foreground">Sites</div>
				</div>
			</div>
		</Card>
	);
};
