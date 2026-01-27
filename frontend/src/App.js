'use client';

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
import { BentoHome } from "./components/pages/BentoHome";
import { GodModeMap } from "./components/pages/GodModeMap";
import { VerificationQueue } from "./components/pages/VerificationQueue";
import { Analytics } from "./components/pages/Analytics";
import { HospitalsPage } from "./components/pages/HospitalsPage";
import { AmbulancesPage } from "./components/pages/AmbulancesPage";
import { UsersPage } from "./components/pages/UsersPage";
import { DoctorsPage } from "./components/pages/DoctorsPage";
import { VisitsPage } from "./components/pages/VisitsPage";
import { EmergencyRequestsPage } from "./components/pages/EmergencyRequestsPage";
import { LoginPage } from "./components/pages/LoginPage";
import { SetPasswordPage } from "./components/pages/SetPasswordPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { NotFoundPage } from "./components/pages/NotFoundPage";
import { HealthNewsManagementPage } from "./components/pages/HealthNewsManagementPage";
import { SupportTicketsPage } from "./components/pages/SupportTicketsPage";
import { InsuranceManagementPage } from "./components/pages/InsuranceManagementPage";
import { SubscriptionManagementPage } from "./components/pages/SubscriptionManagementPage";
import { Toaster } from "./components/ui/sonner";
import { motion } from "framer-motion";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./App.css";

const AppShell = ({ children }) => {
	const location = useLocation();
	const { isScrolledDown, sidebarWidth, isContextPanelOpen } = useLayout();
	const hideNav = ["/login", "/unauthorized", "/set-password"].includes(location.pathname);
	const isMobile = window.innerWidth < 768;

	return (
		<div className="relative h-screen w-full text-foreground overflow-hidden flex flex-col">
			
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
					className={`flex-1 bg-background dark:bg-background relative overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar transition-all duration-300 ${!hideNav ? "pt-16" : ""}`}
				>

					<motion.div
						layout
						initial={false}
						animate={{
							// Push content by Sidebar Width + 24px gap (3×8px)
							paddingLeft: hideNav ? 16 : (window.innerWidth >= 768 ? sidebarWidth + 48 : 16),
							// Right padding - 24px (3×8px) for consistency
							paddingRight: isMobile ? 16 : 48,
							// Top padding when scrolled - 16px (2×8px)
							paddingTop: isScrolledDown ? 0 : 16,
							// Bottom padding - 96px (12×8px) for footer/FAB clearance
							paddingBottom: 96
						}}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className="relative z-10"
					>			{/* Simple Static Dot Grid - Apple-level simplicity */}
			<div className="absolute inset-0 dot-grid pointer-events-none" />
						<div className="md:p-6">
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
					<ContextAwareFAB />
					<DynamicBottomBar />
				</>
			)}
		</div>
	);
};

const AppLayout = ({ children }) => (
	<MapProvider>
		<PageDataProvider>
			<NavigationProvider>
				<LayoutProvider>
					<AppShell>{children}</AppShell>
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
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/set-password" element={<SetPasswordPage />} />
					<Route path="/unauthorized" element={<UnauthorizedPage />} />
					<Route path="/" element={<ProtectedRoute><BentoHome allowedRoles={["sponsor", "viewer", "provider", "admin"]} /></ProtectedRoute>} />
					<Route path="/map" element={<ProtectedRoute minRole="provider"><GodModeMap /></ProtectedRoute>} />
					<Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />
					<Route path="/hospitals" element={<ProtectedRoute minRole="org_admin"><HospitalsPage /></ProtectedRoute>} />
					<Route path="/ambulances" element={<ProtectedRoute minRole="org_admin"><AmbulancesPage /></ProtectedRoute>} />
					<Route path="/doctors" element={<ProtectedRoute minRole="org_admin"><DoctorsPage /></ProtectedRoute>} />
					<Route path="/visits" element={<ProtectedRoute minRole="provider"><VisitsPage /></ProtectedRoute>} />
					<Route path="/emergencies" element={<ProtectedRoute minRole="provider"><EmergencyRequestsPage /></ProtectedRoute>} />
					<Route path="/verification" element={<ProtectedRoute minRole="org_admin"><VerificationQueue /></ProtectedRoute>} />
					<Route path="/users" element={<ProtectedRoute minRole="org_admin"><UsersPage /></ProtectedRoute>} />
					<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
					<Route path="/health-news" element={<ProtectedRoute minRole="provider"><HealthNewsManagementPage /></ProtectedRoute>} />
					<Route path="/support-tickets" element={<ProtectedRoute minRole="provider"><SupportTicketsPage /></ProtectedRoute>} />
					<Route path="/insurance" element={<ProtectedRoute minRole="admin"><InsuranceManagementPage /></ProtectedRoute>} />
					<Route path="/subscriptions" element={<ProtectedRoute minRole="admin"><SubscriptionManagementPage /></ProtectedRoute>} />
					<Route path="*" element={<NotFoundPage />} />
				</Routes>
			</AppLayout>
		</AuthProvider>
	);
}

function App() {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<Router>
					<AppRoutes />
					<Toaster position="top-right" richColors />
				</Router>
			</ThemeProvider>
		</ErrorBoundary>
	);
}

export default App;