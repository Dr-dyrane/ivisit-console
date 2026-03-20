import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

const STARTUP_VIDEO_SRC = "/media/console-startup.mp4";
const MIN_PRESENT_MS = 1800;
const MAX_PRESENT_MS = 9000;

export const ConsoleStartupOverlay = ({ disabled = false }) => {
	const { user, profile, loading } = useAuth();
	const [visible, setVisible] = useState(false);
	const [playbackKey, setPlaybackKey] = useState(0);
	const startedAtRef = useRef(0);
	const hasResolvedInitialAuthRef = useRef(false);
	const wasAuthenticatedRef = useRef(false);
	const fallbackTimerRef = useRef(null);
	const hideTimerRef = useRef(null);

	const isAuthenticated = !disabled && !loading && Boolean(user && profile);

	const clearTimers = useCallback(() => {
		if (fallbackTimerRef.current) {
			clearTimeout(fallbackTimerRef.current);
			fallbackTimerRef.current = null;
		}
		if (hideTimerRef.current) {
			clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	}, []);

	const closeOverlay = useCallback(() => {
		const elapsed = Date.now() - startedAtRef.current;
		const remaining = MIN_PRESENT_MS - elapsed;

		clearTimers();
		if (remaining > 0) {
			hideTimerRef.current = setTimeout(() => {
				setVisible(false);
			}, remaining);
			return;
		}

		setVisible(false);
	}, [clearTimers]);

	const startOverlay = useCallback(() => {
		if (!isAuthenticated) return;

		clearTimers();
		startedAtRef.current = Date.now();
		setPlaybackKey((prev) => prev + 1);
		setVisible(true);
		fallbackTimerRef.current = setTimeout(() => {
			closeOverlay();
		}, MAX_PRESENT_MS);
	}, [clearTimers, closeOverlay, isAuthenticated]);

	useEffect(() => {
		if (loading) {
			return undefined;
		}

		if (!hasResolvedInitialAuthRef.current) {
			hasResolvedInitialAuthRef.current = true;
			wasAuthenticatedRef.current = isAuthenticated;
			return undefined;
		}

		if (!wasAuthenticatedRef.current && isAuthenticated) {
			startOverlay();
		}

		if (!isAuthenticated) {
			clearTimers();
			setVisible(false);
		}

		wasAuthenticatedRef.current = isAuthenticated;
		return undefined;
	}, [clearTimers, isAuthenticated, loading, startOverlay]);

	useEffect(() => () => clearTimers(), [clearTimers]);

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.28, ease: "easeOut" }}
					className="fixed inset-0 z-[160] overflow-hidden bg-black"
					aria-hidden="true"
				>
					<motion.video
						key={playbackKey}
						initial={{ scale: 1.04, opacity: 0.92 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 1.01, opacity: 0 }}
						transition={{ duration: 0.8, ease: "easeOut" }}
						className="h-full w-full object-cover object-center"
						style={{
							objectPosition: "center center",
							filter: "saturate(1.02) contrast(1.03)",
						}}
						src={STARTUP_VIDEO_SRC}
						autoPlay
						muted
						playsInline
						preload="auto"
						onEnded={closeOverlay}
						onError={closeOverlay}
					/>

					<div
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 18%, rgba(0,0,0,0.04) 82%, rgba(0,0,0,0.18) 100%)",
						}}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ConsoleStartupOverlay;
