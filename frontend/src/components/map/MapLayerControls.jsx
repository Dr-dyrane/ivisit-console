import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, AlertTriangle, Ambulance, Building } from 'lucide-react';

export const MapLayerControls = ({ showLayers, setShowLayers }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const layerConfig = {
		emergencies: { label: 'Emergencies', icon: AlertTriangle, color: 'text-rose-500' },
		ambulances: { label: 'Ambulances', icon: Ambulance, color: 'text-sky-500' },
		hospitals: { label: 'Hospitals', icon: Building, color: 'text-emerald-500' }
	};

	const toggleLayer = (layer, e) => {
		e.stopPropagation();
		setShowLayers(layer);
	};

	return (
		<div className="flex items-center justify-end">
			<motion.div
				initial={false}
				className="flex flex-row-reverse items-center rounded-pill bg-card/68 p-1 shadow-e3 backdrop-blur-2xl"
			>
				<button
					type="button"
					className="flex items-center justify-center rounded-button p-2 transition-all hover:bg-foreground/[0.04] active:scale-[0.98] focus-visible:bg-foreground/[0.06]"
					onClick={() => setIsExpanded(prev => !prev)}
					aria-label={isExpanded ? "Hide map layers" : "Show map layers"}
					aria-expanded={isExpanded}
				>
					<Layers
						className={`h-5 w-5 transition-colors ${isExpanded ? 'text-foreground' : 'text-foreground/60'}`}
					/>
				</button>

				<AnimatePresence>
					{isExpanded && (
						<motion.div
							initial={{ opacity: 0, width: 0, x: 20 }}
							animate={{ opacity: 1, width: 'auto', x: 0 }}
							exit={{ opacity: 0, width: 0, x: 20 }}
							className="flex items-center overflow-hidden"
						>
							<div className="flex items-center gap-2 pl-2 pr-1 mr-1 bg-foreground/[0.03] rounded-pill">
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
											aria-label={`${isVisible ? 'Hide' : 'Show'} ${config.label.toLowerCase()}`}
											aria-pressed={isVisible}
											className={`
                        h-10 w-10 flex items-center justify-center rounded-button transition-all
                        ${isVisible ? 'bg-foreground text-background shadow-e2' : 'bg-foreground/5 text-foreground/40 hover:bg-foreground/10'}
                      `}
										>
											<Icon className={`h-4.5 w-4.5 ${isVisible ? 'text-background' : config.color}`} />
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
