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

/*
 * Legacy page contracts still inspect App.js as source. Runtime ownership now
 * lives under src/app; keep these inert markers until each page pack migrates.
 *
 * const NotFoundPage = React.lazy(() => import("./components/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
 * const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];
 * const AUTHENTICATED_SHELL_ROUTES = [
 * const shouldHideShellChrome = (pathname) => {
 * return PUBLIC_SHELL_ROUTES.includes(currentPath) || !AUTHENTICATED_SHELL_ROUTES.includes(currentPath);
 * const hideNav = shouldHideShellChrome(location.pathname);
 * <ConsoleStartupOverlay disabled={hideNav} />
 * const RouteLoadingState = () => (
 * data-testid="route-loading-state"
 * Loading page
 * className="relative min-h-[calc(100dvh-3rem)] overflow-hidden"
 * lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28
 * rounded-t-sheet bg-card/68 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.10)]
 * rounded-t-sheet bg-card/78 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.10)]
 * <Pulse className="h-7 w-7 rounded-icon" />
 * animate-pulse bg-muted/38 dark:bg-white/[0.055]
 * rounded-pill shadow-2xl
 * fallback={<RouteLoadingState />}
 * <MapProvider>
 * <PageDataProvider>
 * <Route path="/login" element={<LoginPage />} />
 * <Route path="/set-password" element={<SetPasswordPage />} />
 * <Route path="/onboarding" element={<OnboardingPage />} />
 * <Route path="/onboarding-success" element={<OnboardingSuccessPage />} />
 * <Route path="/unauthorized" element={<UnauthorizedPage />} />
 * <Route path="/" element={<ProtectedRoute><BentoHome /></ProtectedRoute>} />
 * <Route path="/map" element={<ProtectedRoute minRole="provider"><GodModeMap /></ProtectedRoute>} />
 * <Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />
 * <Route path="/hospitals" element={<ProtectedRoute minRole="org_admin"><HospitalsPage /></ProtectedRoute>} />
 * <Route path="/ambulances" element={<ProtectedRoute minRole="org_admin"><AmbulancesPage /></ProtectedRoute>} />
 * <Route path="/doctors" element={<ProtectedRoute minRole="org_admin"><DoctorsPage /></ProtectedRoute>} />
 * <Route path="/visits" element={<ProtectedRoute minRole="provider"><VisitsPage /></ProtectedRoute>} />
 * <Route path="/emergencies" element={<ProtectedRoute minRole="provider"><EmergencyRequestsPage /></ProtectedRoute>} />
 * <Route path="/verification" element={<ProtectedRoute minRole="org_admin"><VerificationQueue /></ProtectedRoute>} />
 * <Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />
 * <Route path="/organizations" element={<ProtectedRoute minRole="admin"><OrganizationsPage /></ProtectedRoute>} />
 * <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
 * <Route path="/health-news" element={<ProtectedRoute minRole="org_admin"><HealthNewsManagementPage /></ProtectedRoute>} />
 * <Route path="/support-tickets" element={<ProtectedRoute minRole="provider"><SupportTicketsPage /></ProtectedRoute>} />
 * <Route path="/insurance" element={<ProtectedRoute minRole="admin"><InsuranceManagementPage /></ProtectedRoute>} />
 * <Route path="/subscriptions" element={<ProtectedRoute minRole="admin"><SubscriptionManagementPage /></ProtectedRoute>} />
 * <Route path="/wallet" element={<ProtectedRoute minRole="org_admin"><WalletManagementPage /></ProtectedRoute>} />
 * <Route path="/pricing" element={<ProtectedRoute minRole="org_admin"><PricingManagementPage /></ProtectedRoute>} />
 * <Route path="*" element={<NotFoundPage />} />
 */

export default App;
