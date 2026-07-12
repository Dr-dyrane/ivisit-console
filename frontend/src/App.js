import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { PageDataProvider } from "./contexts/PageDataContext";
import { MapProvider } from "./contexts/MapContext";
import { IslandNavigation } from "./components/common/IslandNavigation";
import { ContextPanelShell } from "./components/navigation/ResponsiveSidebar";
import { LayoutProvider, useLayout } from "./contexts/LayoutContext";
import { SmartHeader } from "./components/navigation/SmartHeader";
import { SmartFooter } from "./components/navigation/SmartFooter";
import { ContextAwareFAB } from "./components/navigation/ContextAwareFAB";
import { DynamicBottomBar } from "./components/navigation/DynamicBottomBar";
import { ProtectedRoute, UnauthorizedPage } from "./components/common/ProtectedRoute";
import { ConsoleStartupOverlay } from "./components/common/ConsoleStartupOverlay";
import { Toaster } from "./components/ui/sonner";
import { motion } from "framer-motion";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { PWAProvider } from "./contexts/PWAContext";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import { PageActionsProvider } from "./contexts/PageActionsContext";
import { FocusedRecordProvider } from "./contexts/FocusedRecordContext";
// PULLBACK NOTE: Pass A1 - TanStack Query foundation
// OLD: no QueryClientProvider, no server data caching
// NEW: QueryClientProvider wraps full tree; ReactQueryDevtools in dev only
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import "./App.css";

// PULLBACK NOTE: Pass A2 - lazy route imports for code splitting
// OLD: all 20 pages eagerly imported at startup (bloats initial bundle)
// NEW: React.lazy + Suspense - each page loads only when navigated to
const BentoHome = React.lazy(() => import("./components/pages/BentoHome").then(m => ({ default: m.BentoHome })));
const GodModeMap = React.lazy(() => import("./components/pages/GodModeMap").then(m => ({ default: m.GodModeMap })));
const VerificationQueue = React.lazy(() => import("./components/pages/VerificationQueue").then(m => ({ default: m.VerificationQueue })));
const Analytics = React.lazy(() => import("./components/pages/Analytics").then(m => ({ default: m.Analytics })));
const HospitalsPage = React.lazy(() => import("./components/pages/HospitalsPage").then(m => ({ default: m.HospitalsPage })));
const AmbulancesPage = React.lazy(() => import("./components/pages/AmbulancesPage").then(m => ({ default: m.AmbulancesPage })));
const OrganizationsPage = React.lazy(() => import("./components/pages/OrganizationsPage").then(m => ({ default: m.OrganizationsPage })));
const UsersPage = React.lazy(() => import("./components/pages/UsersPage").then(m => ({ default: m.UsersPage })));
const DoctorsPage = React.lazy(() => import("./components/pages/DoctorsPage").then(m => ({ default: m.DoctorsPage })));
const VisitsPage = React.lazy(() => import("./components/pages/VisitsPage").then(m => ({ default: m.VisitsPage })));
const EmergencyRequestsPage = React.lazy(() => import("./components/pages/EmergencyRequestsPage").then(m => ({ default: m.EmergencyRequestsPage })));
const LoginPage = React.lazy(() => import("./components/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SetPasswordPage = React.lazy(() => import("./components/pages/SetPasswordPage").then(m => ({ default: m.SetPasswordPage })));
const SettingsPage = React.lazy(() => import("./components/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const NotFoundPage = React.lazy(() => import("./components/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const HealthNewsManagementPage = React.lazy(() => import("./components/pages/HealthNewsManagementPage").then(m => ({ default: m.HealthNewsManagementPage })));
const SupportTicketsPage = React.lazy(() => import("./components/pages/SupportTicketsPage").then(m => ({ default: m.SupportTicketsPage })));
const InsuranceManagementPage = React.lazy(() => import("./components/pages/InsuranceManagementPage").then(m => ({ default: m.InsuranceManagementPage })));
const SubscriptionManagementPage = React.lazy(() => import("./components/pages/SubscriptionManagementPage").then(m => ({ default: m.SubscriptionManagementPage })));
const WalletManagementPage = React.lazy(() => import("./components/pages/WalletManagementPage").then(m => ({ default: m.WalletManagementPage })));
const PricingManagementPage = React.lazy(() => import("./components/pages/PricingManagementPage").then(m => ({ default: m.PricingManagementPage })));
const OnboardingPage = React.lazy(() => import("./components/pages/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const OnboardingSuccessPage = React.lazy(() => import("./components/pages/OnboardingSuccessPage").then(m => ({ default: m.OnboardingSuccessPage })));

const PUBLIC_SHELL_ROUTES = ["/login", "/unauthorized", "/set-password", "/onboarding", "/onboarding-success"];
const AUTHENTICATED_SHELL_ROUTES = [
	"/",
	"/map",
	"/analytics",
	"/hospitals",
	"/ambulances",
	"/doctors",
	"/visits",
	"/emergencies",
	"/verification",
	"/users",
	"/organizations",
	"/settings",
	"/health-news",
	"/support-tickets",
	"/insurance",
	"/subscriptions",
	"/wallet",
	"/pricing",
];

const normalizeShellPath = (pathname) => {
	if (!pathname) return "/";
	if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
	return pathname;
};

const shouldHideShellChrome = (pathname) => {
	const currentPath = normalizeShellPath(pathname);
	return PUBLIC_SHELL_ROUTES.includes(currentPath) || !AUTHENTICATED_SHELL_ROUTES.includes(currentPath);
};

// Route-level Suspense fallback. Full-bleed replica of the canonical two-rail
// page workspace (see EmergencyRequestsPage's RequestsDesktopWorkspace) so the
// layout does NOT jump when the real page mounts. Renders inside the app shell,
// so it mirrors the page CONTENT shape only. Zero borders/rings, canonical
// squircle radii, no red, reduced shadow scale.
const Pulse = ({ className }) => (
	<div className={`animate-pulse bg-muted/38 dark:bg-white/[0.055] ${className}`} />
);

const RouteLoadingState = () => (
	<section
		role="status"
		aria-live="polite"
		data-testid="route-loading-state"
		className="relative min-h-[calc(100dvh-3rem)] overflow-hidden"
	>
		<span className="sr-only">Loading page</span>

		<div className="flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col gap-5 px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28">
			{/* LEFT: signal panel + KPI row + handled sheet */}
			<section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
				<div className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]">
					<div className="w-full min-w-0 space-y-4">
						<Pulse className="h-8 w-36 rounded-pill" />
						<Pulse className="h-12 w-3/4 rounded-card md:h-[72px]" />
						<Pulse className="h-5 w-1/2 rounded-inner" />

						<div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
							{[0, 1, 2].map((item) => (
								<div
									key={item}
									className="flex min-h-[66px] items-start justify-between gap-2 rounded-inner bg-card/65 px-3 py-2.5 backdrop-blur-xl sm:px-4 md:py-3"
								>
									<div className="min-w-0 space-y-2">
										<Pulse className="h-3 w-16 rounded-pill" />
										<Pulse className="h-6 w-9 rounded-inner" />
									</div>
									<Pulse className="h-7 w-7 rounded-icon" />
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
					<div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
					<div className="mt-3 min-h-0 flex-1 space-y-2 rounded-card bg-background/30 p-3 dark:bg-black/[0.08]">
						{[0, 1, 2, 3, 4, 5, 6].map((item) => (
							<Pulse key={item} className="h-[78px] rounded-card" />
						))}
					</div>
				</div>
			</section>

			{/* RIGHT: detail rail aside */}
			<aside className="relative z-20 mt-auto rounded-t-sheet bg-card/78 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
				<div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

				<div className="space-y-2">
					<Pulse className="h-4 w-24 rounded-pill" />
					<Pulse className="h-6 w-2/3 rounded-inner" />
				</div>

				<div className="mt-5 flex items-center gap-3">
					<Pulse className="h-14 w-14 rounded-pill" />
					<div className="min-w-0 flex-1 space-y-2">
						<Pulse className="h-4 w-1/2 rounded-pill" />
						<Pulse className="h-3 w-2/3 rounded-pill" />
					</div>
				</div>

				<div className="mt-5 space-y-2">
					{[0, 1, 2, 3].map((item) => (
						<Pulse key={item} className="h-[52px] rounded-inner" />
					))}
				</div>

				<div className="mt-5 space-y-2">
					<Pulse className="h-12 w-full rounded-button" />
					<div className="grid grid-cols-2 gap-2">
						<Pulse className="h-11 rounded-button" />
						<Pulse className="h-11 rounded-button" />
					</div>
				</div>
			</aside>
		</div>
	</section>
);

// --- PWA DEBUG TRACKER ---
const PWADebugTracker = () => {
	return (
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
};

const AppShell = ({ children }) => {
	const location = useLocation();
	const { isScrolledDown, sidebarWidth, pageShellConfig } = useLayout();
	const hideNav = shouldHideShellChrome(location.pathname);
	const isMobile = window.innerWidth < 768;
	const isBleedPage = !hideNav && pageShellConfig?.bleed;

	return (
		<div className="relative h-screen w-full text-foreground overflow-hidden flex flex-col">

			{/* A11y: skip link — first focusable element, visually hidden until focused */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-[0_20px_64px_rgb(0_0_0/0.14)] focus:backdrop-blur-xl"
			>
				Skip to content
			</a>

			{!hideNav && <SmartHeader />}

			<div className="flex-1 flex relative overflow-hidden">
				{/* LEFT NAVIGATION - Highest Z-index */}
				{!hideNav && (
					<div className="flex-none z-50 hidden md:block">
						<IslandNavigation />
					</div>
				)}

				<main
					id="main-content"
					className={`flex-1 bg-background dark:bg-background relative overflow-y-auto overflow-x-hidden scroll-smooth ${(isMobile || isBleedPage) ? 'no-scrollbar' : 'custom-scrollbar'} transition-all duration-300 ${!hideNav ? (isMobile ? "pt-12 md:pt-16" : "pt-16") : ""}`}
				>

					<motion.div
						layout
						initial={false}
						animate={{
							// Push content by Sidebar Width + 24px gap.
							paddingLeft: hideNav ? 0 : (window.innerWidth >= 768 ? sidebarWidth + (isBleedPage ? 20 : 48) : 0),
							// Right padding - 24px for consistency.
							paddingRight: (isMobile || isBleedPage) ? 0 : 48,
							// Top padding when scrolled - 16px.
							paddingTop: isMobile ? 0 : (isBleedPage ? 0 : (isScrolledDown ? 0 : 16)),
							// Bottom padding - Respect iOS Safe Areas + Base clearance (Stable Restore)
							paddingBottom: 'calc(16px + var(--safe-bottom))'
						}}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className="relative z-10"
					>			{/* Simple Static Dot Grid - Apple-level simplicity */}

						<div className={isBleedPage ? "" : "md:p-6"}>
							{children}
						</div>
					</motion.div>
				</main>

				{!hideNav && (
					<div className="flex-none z-40">
						<ContextPanelShell />
					</div>
				)}
			</div>

			{!hideNav && (
				<>
					<SmartFooter />
					{!pageShellConfig?.hideFab && <ContextAwareFAB />}
					<DynamicBottomBar />
				</>
			)}

			<ConsoleStartupOverlay disabled={hideNav} />
		</div>
	);
};

const AppLayout = ({ children }) => (
	<MapProvider>
		<PageDataProvider>
			<NavigationProvider>
				<LayoutProvider>
					<AppShell>
						{children}
					</AppShell>
				</LayoutProvider>
			</NavigationProvider>
		</PageDataProvider>
	</MapProvider>
);

function AppRoutes() {
	const location = useLocation();
	return (
		<AuthProvider pathname={location.pathname}>
			<AppLayout>
				<React.Suspense fallback={<RouteLoadingState />}>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/set-password" element={<SetPasswordPage />} />
					<Route path="/onboarding" element={<OnboardingPage />} />
					<Route path="/onboarding-success" element={<OnboardingSuccessPage />} />
					<Route path="/unauthorized" element={<UnauthorizedPage />} />
					<Route path="/" element={<ProtectedRoute><BentoHome /></ProtectedRoute>} />
					<Route path="/map" element={<ProtectedRoute minRole="provider"><GodModeMap /></ProtectedRoute>} />
					<Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />
					<Route path="/hospitals" element={<ProtectedRoute minRole="org_admin"><HospitalsPage /></ProtectedRoute>} />
					<Route path="/ambulances" element={<ProtectedRoute minRole="org_admin"><AmbulancesPage /></ProtectedRoute>} />
					<Route path="/doctors" element={<ProtectedRoute minRole="org_admin"><DoctorsPage /></ProtectedRoute>} />
					<Route path="/visits" element={<ProtectedRoute minRole="provider"><VisitsPage /></ProtectedRoute>} />
					<Route path="/emergencies" element={<ProtectedRoute minRole="provider"><EmergencyRequestsPage /></ProtectedRoute>} />
					<Route path="/verification" element={<ProtectedRoute minRole="org_admin"><VerificationQueue /></ProtectedRoute>} />
					<Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />
					<Route path="/organizations" element={<ProtectedRoute minRole="admin"><OrganizationsPage /></ProtectedRoute>} />
					<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
					<Route path="/health-news" element={<ProtectedRoute minRole="org_admin"><HealthNewsManagementPage /></ProtectedRoute>} />
					<Route path="/support-tickets" element={<ProtectedRoute minRole="provider"><SupportTicketsPage /></ProtectedRoute>} />
					<Route path="/insurance" element={<ProtectedRoute minRole="admin"><InsuranceManagementPage /></ProtectedRoute>} />
					<Route path="/subscriptions" element={<ProtectedRoute minRole="admin"><SubscriptionManagementPage /></ProtectedRoute>} />
					<Route path="/wallet" element={<ProtectedRoute minRole="org_admin"><WalletManagementPage /></ProtectedRoute>} />
					<Route path="/pricing" element={<ProtectedRoute minRole="org_admin"><PricingManagementPage /></ProtectedRoute>} />
					<Route path="*" element={<NotFoundPage />} />
				</Routes>
				</React.Suspense>
			</AppLayout>
		</AuthProvider>
	);
}

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

								{/* PWA Debug Tracker */}
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
