'use client';

import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { PageDataProvider } from "./contexts/PageDataContext";
import { IslandNavigation } from "./components/common/IslandNavigation";
import { ResponsiveSidebar } from "./components/navigation/ResponsiveSidebar";
import { LayoutProvider, useLayout } from "./contexts/LayoutContext";
import { SmartHeader } from "./components/navigation/SmartHeader";
import { SmartFooter } from "./components/navigation/SmartFooter";
import { ContextAwareFAB } from "./components/navigation/ContextAwareFAB";
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
import { SettingsPage } from "./components/pages/SettingsPage";
import { NotFoundPage } from "./components/pages/NotFoundPage";
import { HealthNewsManagementPage } from "./components/pages/HealthNewsManagementPage";
import { SupportTicketsPage } from "./components/pages/SupportTicketsPage";
import { InsuranceManagementPage } from "./components/pages/InsuranceManagementPage";
import { Toaster } from "./components/ui/sonner";
import NoiseOverlay from "./components/ui/noise-overlay";
import { motion } from "framer-motion";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./App.css";

const AppShell = ({ children }) => {
	const location = useLocation();
	const { isScrolledDown, sidebarWidth } = useLayout();
	const hideNav = ["/login", "/unauthorized"].includes(location.pathname);

	return (
		<div className="relative h-screen w-full bg-background text-foreground overflow-hidden flex flex-col">
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
					className={`flex-1 relative overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar transition-all duration-300 ${!hideNav ? "pt-16" : ""}`}
				>
					{!hideNav && (
						<div className="fixed inset-0 z-0 pointer-events-none">
							<NoiseOverlay opacity={1} />
						</div>
					)}

					<motion.div
						layout
						initial={false}
						animate={{
							// Push content by Sidebar Width + 24px gap
							paddingLeft: hideNav ? 12 : (window.innerWidth >= 768 ? sidebarWidth + 24 : 12),
							// Account for ResponsiveSidebar (320px) + Gap
							paddingRight: hideNav ? 12 : (window.innerWidth >= 1024 ? 320 : 12),
							paddingTop: isScrolledDown ? 12 : 0,
							paddingBottom: 128
						}}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className="relative z-10"
					>
						{children}
					</motion.div>
				</main>

				{!hideNav && (
					<div className="flex-none z-30">
						<ResponsiveSidebar />
					</div>
				)}
			</div>

			{!hideNav && (
				<>
					<SmartFooter />
					<ContextAwareFAB />
				</>
			)}
		</div>
	);
};

const AppLayout = ({ children }) => (
	<PageDataProvider>
		<NavigationProvider>
			<LayoutProvider>
				<AppShell>{children}</AppShell>
			</LayoutProvider>
		</NavigationProvider>
	</PageDataProvider>
);

function AppRoutes() {
	const location = useLocation();
	return (
		<AuthProvider pathname={location.pathname}>
			<AppLayout>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/unauthorized" element={<UnauthorizedPage />} />
					<Route path="/" element={<ProtectedRoute><BentoHome allowedRoles={["sponsor", "viewer", "provider", "admin"]} /></ProtectedRoute>} />
					<Route path="/map" element={<ProtectedRoute minRole="provider"><GodModeMap /></ProtectedRoute>} />
					<Route path="/analytics" element={<ProtectedRoute minRole="provider"><Analytics /></ProtectedRoute>} />
					<Route path="/hospitals" element={<ProtectedRoute minRole="provider"><HospitalsPage /></ProtectedRoute>} />
					<Route path="/ambulances" element={<ProtectedRoute minRole="provider"><AmbulancesPage /></ProtectedRoute>} />
					<Route path="/doctors" element={<ProtectedRoute minRole="provider"><DoctorsPage /></ProtectedRoute>} />
					<Route path="/visits" element={<ProtectedRoute minRole="provider"><VisitsPage /></ProtectedRoute>} />
					<Route path="/emergencies" element={<ProtectedRoute minRole="provider"><EmergencyRequestsPage /></ProtectedRoute>} />
					<Route path="/verification" element={<ProtectedRoute minRole="admin"><VerificationQueue /></ProtectedRoute>} />
					<Route path="/users" element={<ProtectedRoute minRole="admin"><UsersPage /></ProtectedRoute>} />
					<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
					<Route path="/health-news" element={<ProtectedRoute minRole="admin"><HealthNewsManagementPage /></ProtectedRoute>} />
					<Route path="/support-tickets" element={<ProtectedRoute minRole="viewer"><SupportTicketsPage /></ProtectedRoute>} />
					<Route path="/insurance" element={<ProtectedRoute minRole="admin"><InsuranceManagementPage /></ProtectedRoute>} />
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