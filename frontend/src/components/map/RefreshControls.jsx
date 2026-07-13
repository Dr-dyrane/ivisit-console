import React from 'react';
import { RefreshCw } from 'lucide-react';

export const RefreshControls = ({ fetchAllData, loading }) => {
	return (
		<button
			type="button"
			onClick={fetchAllData}
			disabled={loading}
			className="group relative rounded-button bg-background/50 p-2.5 shadow-e2 backdrop-blur-xs transition-colors hover:bg-foreground/10 disabled:opacity-50"
			title={loading ? "Refreshing data..." : "Refresh map data"}
			aria-label={loading ? "Refreshing map data" : "Refresh map data"}
			aria-busy={loading}
		>
			<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-500`} />
			{loading && (
				<div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-pill bg-sky-600" />
			)}
		</button>
	);
};
