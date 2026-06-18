import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, AlertTriangle, Ambulance, Building } from 'lucide-react';

export const MapLayerControls = ({ showLayers, setShowLayers }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const layerConfig = {
		emergencies: { label: 'Emergencies', icon: AlertTriangle, color: 'text-red-500' },
		ambulances: { label: 'Ambulances', icon: Ambulance, color: 'text-blue-500' },
		hospitals: { label: 'Hospitals', icon: Building, color: 'text-green-500' }
	};

	const toggleLayer = (layer, e) => {
		e.stopPropagation(); // Prevent collapsing when clicking a layer
		setShowLayers(layer);
	};

	return (
		<div className="flex items-center justify-end">
			<motion.div
				initial={false}
				className="apple-glass-heavy rounded-full p-1 cursor-pointer flex flex-row-reverse items-center"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				{/* MASTER ICON (Always Visible - Now on the right) */}
				<div className="p-2 flex items-center justify-center">
					<Layers
						className={`h-5 w-5 transition-colors ${isExpanded ? 'text-primary' : 'text-foreground/60'}`}
					/>
				</div>

				{/* EXPANDABLE SECTION (Now appears to the left) */}
				<AnimatePresence>
					{isExpanded && (
						<motion.div
							initial={{ opacity: 0, width: 0, x: 20 }}
							animate={{ opacity: 1, width: 'auto', x: 0 }}
							exit={{ opacity: 0, width: 0, x: 20 }}
							className="flex items-center overflow-hidden"
						>
							<div className="flex items-center gap-2 pl-2 border-r border-foreground/10 mr-1">
								{Object.entries(layerConfig).map(([key, config]) => {
									const isVisible = showLayers[key];
									const Icon = config.icon;

									return (
										<motion.button
											key={key}
											layout
											initial={{ scale: 0.8, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											whileTap={{ scale: 0.9 }}
											onClick={(e) => toggleLayer(key, e)}
											className={`
                        h-10 w-10 flex items-center justify-center rounded-2xl transition-all
                        ${isVisible ? 'bg-primary text-white shadow-lg' : 'bg-foreground/5 text-foreground/40 hover:bg-foreground/10'}
                      `}
										>
											<Icon className={`h-4.5 w-4.5 ${isVisible ? 'text-white' : config.color}`} />
										</motion.button>
									);
								})}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
};