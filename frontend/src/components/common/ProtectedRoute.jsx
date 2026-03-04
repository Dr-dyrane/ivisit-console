import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { DynamicAuthSkeleton } from "../ui/skeleton";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";
import { NAV_CONFIG, getAccessibleNav } from "../../config/navigation";
import { ROLE_LEVELS } from "../../config/navigation";

export const ProtectedRoute = ({
	children,
	minRole = "viewer",
	allowedRoles = null,
	resource = null,
	path = null,
}) => {
	const { user, profile, loading, hasRole, hasMinRole, can, isOnboarding } = useAuth();
	const location = useLocation();
	const normalizePath = (value) => {
		if (!value) return "/";
		if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
		return value;
	};
	const currentPath = normalizePath(path || location.pathname);

	// Wait for auth to complete
	if (loading) {
		return <DynamicAuthSkeleton pathname={currentPath} />;
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Wait for profile to be fetched before checking access
	// This prevents race condition where user is redirected before profile loads
	if (!profile) {
		return <DynamicAuthSkeleton pathname={currentPath} />;
	}

	// If user is mid-onboarding, redirect them back to onboarding
	if (isOnboarding()) {
		return <Navigate to="/onboarding" replace />;
	}

	// Get accessible navigation based on user profile
	const accessibleNav = getAccessibleNav(profile, can);

	// Check if current path is in accessible navigation
	const isPathAccessible = checkPathAccess(currentPath, accessibleNav);

	if (!isPathAccessible) {
		console.log(`[ProtectedRoute] Access denied for ${profile?.role} to path: ${currentPath}`);
		return <Navigate to="/unauthorized" replace />;
	}

	// Additional role checks if specified
	if (allowedRoles && !hasRole(allowedRoles)) {
		return <Navigate to="/unauthorized" replace />;
	}

	if (minRole && !hasMinRole(minRole)) {
		return <Navigate to="/unauthorized" replace />;
	}

	// Additional resource-based check if specified
	if (resource && !can('view', resource)) {
		console.log(`[ProtectedRoute] Resource access denied for ${profile?.role} to resource: ${resource}`);
		return <Navigate to="/unauthorized" replace />;
	}

	return children;
};

/**
 * Check if a path is accessible based on user's navigation configuration
 */
function checkPathAccess(path, accessibleNav) {
	const normalizePath = (value) => {
		if (!value) return "/";
		if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
		return value;
	};
	const normalizedPath = normalizePath(path);

	// Check main navigation items
	const mainItem = accessibleNav.main?.find(item => normalizePath(item.path) === normalizedPath);
	if (mainItem) return true;

	// Check operations items
	const opsItem = accessibleNav.ops?.items?.find(item => normalizePath(item.path) === normalizedPath);
	if (opsItem) return true;

	// Check management items
	const mgmtItem = accessibleNav.mgmt?.items?.find(item => normalizePath(item.path) === normalizedPath);
	if (mgmtItem) return true;

	// [BUG-FIX] Check finance items
	const financeItem = accessibleNav.finance?.items?.find(item => normalizePath(item.path) === normalizedPath);
	if (financeItem) return true;

	// Check user items
	const userItem = accessibleNav.user?.items?.find(item => normalizePath(item.path) === normalizedPath);
	if (userItem) return true;

	// Always allow access to basic pages
	const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];
	if (allowedPaths.includes(normalizedPath)) return true;

	return false;
}

export const UnauthorizedPage = () => {
	const { profile, signOut } = useAuth();
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			{/* Background Elements */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 rounded-full blur-[120px]" />
				<div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-warning/5 rounded-full blur-[100px]" />
			</div>

			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.4 }}
				className="relative z-10 w-full max-w-lg"
			>
				<div className="squircle-2xl bg-background/50 backdrop-blur-xs shadow-2xl p-8 text-center border-0 overflow-hidden relative">
					{/* Decorative Top Bar */}
					<div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-destructive/50 via-warning/50 to-destructive/50" />

					{/* Icon */}
					<div className="w-24 h-24 squircle-xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
						<motion.div
							initial={{ rotate: -10, scale: 0.8 }}
							animate={{ rotate: 0, scale: 1 }}
							transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
						>
							<span className="text-5xl drop-shadow-md">⛔</span>
						</motion.div>
					</div>

					<h1 className="text-3xl font-bold tracking-tighter mb-2">
						Access Restricted
					</h1>
					<p className="text-muted-foreground font-normal mb-8">
						Your clearance level ({profile?.role || "Guest"}) does not grant
						access to this secure area.
					</p>

					{/* User Badge */}
					{profile && (
						<div className="squircle-lg bg-muted/30 p-4 mb-8 flex items-center justify-between border border-white/5">
							<div className="text-left">
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
									Current Identity
								</p>
								<p className="font-semibold text-sm truncate max-w-[150px]">
									{profile.email}
								</p>
							</div>
							<div
								className={`px-3 py-1 squircle-sm text-xs font-bold uppercase tracking-wide ${profile.role === "admin"
									? "bg-primary/20 text-primary"
									: profile.role === "provider"
										? "bg-info/20 text-info"
										: "bg-muted text-muted-foreground"
									}`}
							>
								{profile.role}
							</div>
						</div>
					)}

					{/* Actions */}
					<div className="space-y-3">
						<button
							onClick={() => navigate(-1)}
							className="w-full h-12 squircle-lg bg-muted/50 hover:bg-muted text-foreground font-semibold transition-colors"
						>
							Go Back
						</button>
						<div className="flex flex-fow w-full gap-2 justify-center items-center">
							<button
								onClick={() => navigate("/")}
								className="w-full h-12 squircle-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
							>
								Return to Dashboard
							</button>
							<Button
								onClick={() => {
									signOut();
									navigate("/login");
								}}
								variant="ghost"
								className="flex rounded-full bg-primary/50 h-12"
							>
								<LogOut />
							</Button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
};
