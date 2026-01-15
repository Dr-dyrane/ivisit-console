import React from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FocusProvider } from "./contexts/FocusContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { PageDataProvider } from "./contexts/PageDataContext";
import { IslandNavigation } from "./components/common/IslandNavigation";
import { ResponsiveSidebar } from "./components/navigation/ResponsiveSidebar";
import { SidebarTrigger } from "./components/navigation/SidebarTrigger";
import { ContextAwareFAB } from "./components/navigation/ContextAwareFAB";
import {
	ProtectedRoute,
	UnauthorizedPage,
} from "./components/common/ProtectedRoute";
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
import { Toaster } from "./components/ui/sonner";
import NoiseOverlay from "./components/ui/noise-overlay";
import AuthWrapper from "./components/common/AuthWrapper";
import "./App.css";

// Wrapper to conditionally show navigation
const AppLayout = ({ children }) => {
  const location = useLocation();
  const hideNav = ["/login", "/unauthorized"].includes(location.pathname);

  return (
    <PageDataProvider>
      <NavigationProvider>
        <div className="relative h-screen bg-background text-foreground overflow-y-scroll selection:bg-primary/20 pb-12">
          {!hideNav && (
            <>
              <div className="fixed inset-0 z-0 pointer-events-none min-h-screen">
                <NoiseOverlay opacity={1} />
                <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
              </div>
            </>
          )}
          <div className="relative z-10 flex-1 flex-col min-h-screen ">
            {!hideNav && <IslandNavigation />}
            {children}
          </div>
          {/* Responsive Navigation Components */}
          {!hideNav && (
            <>
              <ResponsiveSidebar />
              <SidebarTrigger />
              <ContextAwareFAB />
            </>
          )}
        </div>
      </NavigationProvider>
    </PageDataProvider>
  );
};

function AppRoutes() {
	return (
		<AppLayout>
			<Routes>
				{/* Public routes */}
				<Route path="/login" element={<LoginPage />} />
				<Route path="/unauthorized" element={<UnauthorizedPage />} />

				{/* Protected routes - All authenticated users */}
				<Route
					path="/"
					element={
						<ProtectedRoute>
							<BentoHome
								allowedRoles={["sponsor", "viewer", "provider", "admin"]}
							/>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/map"
					element={
						<ProtectedRoute minRole="provider">
							<GodModeMap />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/analytics"
					element={
						<ProtectedRoute minRole="provider">
							<Analytics />
						</ProtectedRoute>
					}
				/>

				{/* Provider+ routes */}
				<Route
					path="/hospitals"
					element={
						<ProtectedRoute minRole="provider">
							<HospitalsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/ambulances"
					element={
						<ProtectedRoute minRole="provider">
							<AmbulancesPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/doctors"
					element={
						<ProtectedRoute minRole="provider">
							<DoctorsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/visits"
					element={
						<ProtectedRoute minRole="provider">
							<VisitsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/emergencies"
					element={
						<ProtectedRoute minRole="provider">
							<EmergencyRequestsPage />
						</ProtectedRoute>
					}
				/>

				{/* Admin only routes */}
				<Route
					path="/verification"
					element={
						<ProtectedRoute minRole="admin">
							<VerificationQueue />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/users"
					element={
						<ProtectedRoute minRole="admin">
							<UsersPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/settings"
					element={
						<ProtectedRoute>
							<SettingsPage />
						</ProtectedRoute>
					}
				/>
				{/* 404 Route */}
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AppLayout>
	);
}

function App() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<Router>
					<AppRoutes />
					<Toaster position="top-right" richColors />
				</Router>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;
