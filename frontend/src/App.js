import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import { FocusedRecordProvider } from "./contexts/FocusedRecordContext";
import { PageActionsProvider } from "./contexts/PageActionsContext";
import { PWAProvider } from "./contexts/PWAContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { queryClient } from "./lib/queryClient";
import { AppRoutes } from "./app/AppRoutes";
import "./App.css";

const PWADebugTracker = () => (
	<div
		data-modal-chrome="true"
		className="fixed bottom-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
	>
		<div className="bg-white/[0.02] backdrop-blur-md px-2 py-0.5 rounded-pill shadow-2xl flex items-center justify-center">
			<span className="text-[8px] font-medium leading-none text-zinc-500/50">
				v1.0.33
			</span>
		</div>
	</div>
);

function App() {
	const showQueryDevtools = process.env.NODE_ENV === 'development' && process.env.REACT_APP_QUERY_DEVTOOLS === 'true';

	return (
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary>
				<ThemeProvider>
					<PageActionsProvider>
						<PWAProvider>
							<FeedbackProvider>
								<FocusedRecordProvider>
									<Router>
										<AppRoutes />
										<Toaster position="top-right" richColors />
										<PWADebugTracker />
									</Router>
								</FocusedRecordProvider>
							</FeedbackProvider>
						</PWAProvider>
					</PageActionsProvider>
				</ThemeProvider>
			</ErrorBoundary>
			{showQueryDevtools && (
				<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
			)}
		</QueryClientProvider>
	);
}

export default App;
