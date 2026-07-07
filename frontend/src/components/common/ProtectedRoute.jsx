import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { DynamicAuthSkeleton } from "../ui/skeleton";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Loader2, LockKeyhole, LogOut } from "lucide-react";
import { getAccessibleNav } from "../../config/navigation";
import { toast } from "sonner";

export const ProtectedRoute = ({
	children,
	minRole = "viewer",
	allowedRoles = null,
	resource = null,
	path = null,
}) => {
	const { user, profile, authError, loading, hasRole, hasMinRole, can, isOnboarding } = useAuth();
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
		if (authError) {
			return <Navigate to="/unauthorized" state={{ reason: authError.type, from: location }} replace />;
		}
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

	// Check care items
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
	const location = useLocation();
	const reason = location.state?.reason;
	const missingProfile = reason === 'profile_missing' || reason === 'profile_unavailable' || reason === 'session_unavailable';
	const [pendingAction, setPendingAction] = React.useState(null);

	const handleBack = () => {
		setPendingAction('back');
		navigate(-1);
	};

	const handleToday = () => {
		setPendingAction('today');
		navigate("/");
	};

	const handleSignOut = async () => {
		if (pendingAction) return;
		setPendingAction('signout');
		try {
			await signOut();
			navigate("/login");
		} catch (error) {
			console.error('Sign out failed:', error);
			toast.error('Could not sign out. Try again.');
			setPendingAction(null);
		}
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
				className="w-full max-w-md"
			>
				<div className="rounded-card bg-card shadow-sm p-8 text-center">
					<div className="w-16 h-16 rounded-icon bg-muted flex items-center justify-center mx-auto mb-6">
						<motion.div
							initial={{ rotate: -10, scale: 0.8 }}
							animate={{ rotate: 0, scale: 1 }}
							transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
						>
							<LockKeyhole className="h-7 w-7 text-muted-foreground" />
						</motion.div>
					</div>

					<h1 className="text-2xl font-bold mb-2">
						{missingProfile ? 'Account not ready' : 'You do not have access'}
					</h1>
					<p className="text-sm text-muted-foreground font-normal mb-8">
						{missingProfile
							? 'Your console profile is not ready yet.'
							: `Your current role (${profile?.role || "Guest"}) cannot open this page.`}
					</p>

					{/* User Badge */}
					{profile && (
						<div className="rounded-inner bg-muted/40 p-4 mb-8 flex items-center justify-between gap-3">
							<div className="text-left">
								<p className="text-[11px] font-semibold text-muted-foreground mb-0.5">
									Current role
								</p>
								<p className="font-semibold text-sm truncate max-w-[150px]">
									{profile.email}
								</p>
							</div>
							<div
								className={`px-3 py-1 rounded-pill text-xs font-semibold ${profile.role === "admin"
									? "bg-foreground/10 text-foreground"
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
							onClick={handleBack}
							disabled={Boolean(pendingAction)}
							className="w-full h-12 rounded-button bg-muted/50 hover:bg-muted text-foreground font-semibold transition-colors"
						>
							{pendingAction === 'back' ? 'Opening previous page...' : 'Go back'}
						</button>
						<div className="flex flex-row w-full gap-2 justify-center items-center">
							<button
								onClick={handleToday}
								disabled={Boolean(pendingAction)}
								className="flex-1 h-12 rounded-button bg-foreground hover:bg-foreground/90 text-background font-semibold transition-colors active:scale-[0.98]"
							>
								{pendingAction === 'today' ? 'Opening Today...' : 'Go to Today'}
							</button>
							<Button
								aria-label="Sign out"
								aria-busy={pendingAction === 'signout'}
								disabled={Boolean(pendingAction)}
								onClick={handleSignOut}
								variant="ghost"
								className="h-12 w-12 rounded-button bg-muted hover:bg-muted/80 text-muted-foreground"
							>
								{pendingAction === 'signout' ? <Loader2 className="animate-spin" /> : <LogOut />}
							</Button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
};
