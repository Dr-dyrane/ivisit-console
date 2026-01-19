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
		<div className="flex items-center">
			<motion.div
				layout
				initial={false}
				transition={{ type: "spring", stiffness: 400, damping: 30 }}
				className="ios-action-pill rounded-full p-1 cursor-pointer"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				{/* MASTER ICON (Always Visible) */}
				<div className="p-1.5 flex items-center justify-center">
					<Layers
						className={`h-4 w-4 transition-colors ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`}
					/>
				</div>

				{/* EXPANDABLE SECTION */}
				<AnimatePresence>
					{isExpanded && (
						<motion.div
							initial={{ opacity: 0, width: 0 }}
							animate={{ opacity: 1, width: 'auto' }}
							exit={{ opacity: 0, width: 0 }}
							className="flex items-center overflow-hidden"
						>
							{/* Vertical Divider */}
							<div className="w-px h-4 bg-foreground/10 mx-1" />

							<div className="flex items-center gap-1 pr-1">
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
                        h-9 w-9 flex items-center justify-center rounded-full transition-all
                        ${isVisible ? 'ios-icon-active' : 'bg-foreground/5 hover:bg-foreground/10'}
                      `}
										>
											<Icon className={`h-4 w-4 ${isVisible ? 'text-white' : config.color}`} />
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