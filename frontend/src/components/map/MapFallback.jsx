import React from 'react';
import { AlertTriangle, Ambulance, Hospital, MapPin } from 'lucide-react';

export const MapFallback = () => (
	<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
		{/* Simulated map grid */}
		<div className="absolute inset-0 opacity-20">
			{[...Array(10)].map((_, i) => (
				<div
					key={`h-${i}`}
					className="absolute w-full h-px bg-border"
					style={{ top: `${i * 10}%` }}
				/>
			))}
			{[...Array(10)].map((_, i) => (
				<div
					key={`v-${i}`}
					className="absolute h-full w-px bg-border"
					style={{ left: `${i * 10}%` }}
				/>
			))}
		</div>

		{/* Simulated markers */}
		<div className="absolute" style={{ top: "30%", left: "40%" }}>
			<div className="w-8 h-8 rounded-full bg-destructive/80 flex items-center justify-center animate-pulse">
				<AlertTriangle className="h-4 w-4 text-white" />
			</div>
		</div>
		<div className="absolute" style={{ top: "50%", left: "60%" }}>
			<div className="w-8 h-8 rounded-full bg-success/80 flex items-center justify-center">
				<Ambulance className="h-4 w-4 text-white" />
			</div>
		</div>
		<div className="absolute" style={{ top: "40%", left: "55%" }}>
			<div className="w-9 h-9 squircle bg-info/80 flex items-center justify-center">
				<Hospital className="h-5 w-5 text-white" />
			</div>
		</div>

		<div className="text-center z-10 bg-background/35 backdrop-blur-xs squircle-lg p-8">
			<MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
			<p className="font-black text-lg mb-2">Map Preview Mode</p>
			<p className="text-sm text-muted-foreground max-w-xs">
				Google Maps API requires domain authorization. Using simulated view for
				preview.
			</p>
		</div>
	</div>
);
