import React from 'react';
import { RefreshCw } from 'lucide-react';

export const RefreshControls = ({ fetchAllData, loading }) => {
	return (
		<button
			onClick={fetchAllData}
			disabled={loading}
			className="p-2.5 bg-background/50 backdrop-blur-xs rounded-lg border-0 shadow-premium hover:bg-primary/10 transition-colors disabled:opacity-50 group relative"
			title={loading ? "Refreshing data..." : "Refresh map data"}
		>
			<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-500`} />
			{loading && (
				<div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
			)}
		</button>
	);
};
