import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
	Mail,
	Lock,
	ArrowRight,
	ArrowLeft,
	ShieldCheck,
	Zap,
	Globe,
	Server,
	CheckCircle2,
	AlertCircle,
	Loader2
} from "lucide-react";
import ThemeToggle from "../ui/theme-toggle";
import { toast } from "sonner";
import { z } from "zod";

// --- Validation Schemas ---
const emailSchema = z.string().email("Please enter a valid email address");

export const LoginPage = () => {
	const navigate = useNavigate();
	const { signIn, loading: authLoading, user, profile } = useAuth();

	// --- State ---
	const [step, setStep] = useState("email"); // email | password | options
	const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
	const [isLoading, setIsLoading] = useState(false);

	// Form State
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	// Greeting Logic
	const [greeting, setGreeting] = useState("");
	useEffect(() => {
		const hour = new Date().getHours();
		if (hour < 12) setGreeting("Good Morning");
		else if (hour < 18) setGreeting("Good Afternoon");
		else setGreeting("Good Evening");
	}, []);

	// Redirect if logged in
	useEffect(() => {
		if (!authLoading && user && profile) {
			navigate("/");
		}
	}, [authLoading, user, profile, navigate]);


	// --- Handlers ---

	const handleEmailSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			// 1. Validate Email Format
			emailSchema.parse(email);

			// 2. Simulate User Check (Real check would go here via Edge Function)
			// For now, we assume user exists and move to password
			// In production, we would call: await checkUserExists(email)

			await new Promise(resolve => setTimeout(resolve, 600)); // Smooth UX pause

			setDirection(1);
			setStep("password");
		} catch (err) {
			if (err instanceof z.ZodError) {
				setError(err.errors[0].message);
			} else {
				setError("Unable to verify identity");
			}
			toast.error("Invalid Email Format");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			await signIn(email, password);
			toast.success("Identity Verified");
			// AuthContext will handle redirect
		} catch (err) {
			console.error("Login caught:", err);
			// Detect "User not found" vs "Wrong Password" if possible
			// Supabase usually returns "Invalid login credentials" for both 
			// to prevents enumeration, but we can handle specific codes if needed.
			setError("Invalid credentials. Please try again.");
			toast.error("Authentication Failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleBack = () => {
		setDirection(-1);
		setError("");
		setStep("email");
	};

	// --- Animation Variants ---
	const variants = {
		enter: (direction) => ({
			x: direction > 0 ? 50 : -50,
			opacity: 0,
			scale: 0.98,
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1,
			scale: 1,
		},
		exit: (direction) => ({
			zIndex: 0,
			x: direction < 0 ? 50 : -50,
			opacity: 0,
			scale: 0.98,
		}),
	};

	return (
		<div className="relative min-h-[100dvh] bg-background text-foreground flex flex-col items-center overflow-hidden">
			{/* PERFORMANCE BACKGROUND */}
			<div className="fixed inset-0 z-0 pointer-events-none">
				<div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] opacity-20 bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)] blur-[100px]" />
				<div className="absolute bottom-[-5%] left-[-10%] w-[60%] h-[40%] opacity-10 bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)] blur-[100px]" />
				<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-soft-light"></div>
			</div>

			<div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 min-h-[100dvh]">
				{/* LEFT: BRANDING (Hidden on Mobile) */}
				<div className="hidden lg:flex col-span-5 flex-col justify-center p-12 space-y-8">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8, ease: "easeOut" }}
					>
						<div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center mb-8 backdrop-blur-md">
							<ShieldCheck className="text-primary w-8 h-8" />
						</div>
						<div className="space-y-2 mb-6">
							<p className="text-2xl font-medium tracking-tight text-muted-foreground">
								{greeting},
							</p>
							<h1 className="text-7xl font-bold tracking-tighter leading-none text-foreground">
								iVisit<span className="text-primary">.</span>
							</h1>
						</div>
						<p className="text-xl text-muted-foreground font-light leading-relaxed max-w-sm">
							Mission-critical emergency response coordination link.
						</p>
					</motion.div>

					{/* STATUS PILLS */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
						className="flex gap-3"
					>
						<div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
							<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
							<span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
								System Online
							</span>
						</div>
						<div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
							<Server size={12} className="text-primary" />
							<span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
								Encrypted
							</span>
						</div>
					</motion.div>
				</div>

				{/* RIGHT: PROGRESSIVE FORM */}
				<div className="col-span-12 lg:col-span-7 flex flex-col items-center justify-center p-6">

					{/* MOBILE LOGO */}
					<div className="lg:hidden mb-12 flex flex-col items-center">
						<div className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center mb-6">
							<ShieldCheck className="text-primary w-6 h-6" />
						</div>
						<h1 className="text-4xl font-bold tracking-tighter">
							iVisit<span className="text-primary">.</span>
						</h1>
					</div>

					<div className="w-full max-w-[420px] relative">
						<AnimatePresence mode="popLayout" custom={direction} initial={false}>

							{/* STEP 1: EMAIL */}
							{step === "email" && (
								<motion.div
									key="email-step"
									custom={direction}
									variants={variants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ type: "spring", stiffness: 300, damping: 30 }}
									className="w-full"
								>
									<div className="text-center mb-8">
										<h2 className="text-2xl font-semibold tracking-tight">Welcome Back</h2>
										<p className="text-muted-foreground mt-2">Enter your email to continue</p>
									</div>

									<form onSubmit={handleEmailSubmit} className="space-y-6">
										<div className="space-y-2">
											<div className={`
												group relative rounded-2xl bg-muted/30 border border-transparent 
												focus-within:bg-background focus-within:border-primary/20 focus-within:shadow-xl focus-within:shadow-primary/5
												transition-all duration-300
												${error ? "border-destructive/50 bg-destructive/5" : ""}
											`}>
												<div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
													<Mail size={20} />
												</div>
												<input
													type="email"
													autoFocus
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-base placeholder:text-muted-foreground/50 focus:outline-none"
													placeholder="name@organization.com"
													disabled={isLoading}
												/>
											</div>
											{error && (
												<motion.div
													initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
													className="flex items-center gap-2 text-xs text-destructive ml-4"
												>
													<AlertCircle size={12} />
													<span>{error}</span>
												</motion.div>
											)}
										</div>

										<button
											type="submit"
											disabled={isLoading}
											className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
										>
											{isLoading ? (
												<Loader2 size={20} className="animate-spin" />
											) : (
												<>
													<span>Continue</span>
													<ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
												</>
											)}
										</button>
									</form>

									<div className="mt-8 text-center space-y-4">
										<button
											type="button"
											className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border hover:bg-muted/50 transition-colors bg-background text-sm font-medium"
										// Add Google Login Logic Here
										>
											<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
											Continue with Google
										</button>

										<div className="pt-2">
											<a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
												Trouble signing in? Contact Support
											</a>
										</div>
									</div>
								</motion.div>
							)}

							{/* STEP 2: PASSWORD */}
							{step === "password" && (
								<motion.div
									key="password-step"
									custom={direction}
									variants={variants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ type: "spring", stiffness: 300, damping: 30 }}
									className="w-full"
								>
									<div className="text-center mb-8 relative">
										<button
											onClick={handleBack}
											className="absolute left-0 top-1 p-2 rounded-full hover:bg-muted transition-colors -ml-2"
										>
											<ArrowLeft size={20} className="text-muted-foreground" />
										</button>
										<div className="flex flex-col items-center gap-2">
											<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground ring-4 ring-background shadow-lg">
												{email[0]?.toUpperCase()}
											</div>
											<div className="text-sm text-muted-foreground font-medium bg-muted/30 px-3 py-1 rounded-full flex items-center gap-1.5">
												{email}
												<CheckCircle2 size={12} className="text-emerald-500" />
											</div>
										</div>
									</div>

									<form onSubmit={handlePasswordSubmit} className="space-y-6">
										<div className="space-y-2">
											<div className={`
												group relative rounded-2xl bg-muted/30 border border-transparent 
												focus-within:bg-background focus-within:border-primary/20 focus-within:shadow-xl focus-within:shadow-primary/5
												transition-all duration-300
												${error ? "border-destructive/50 bg-destructive/5" : ""}
											`}>
												<div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
													<Lock size={20} />
												</div>
												<input
													type="password"
													autoFocus
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-base placeholder:text-muted-foreground/50 focus:outline-none"
													placeholder="••••••••"
													disabled={isLoading}
												/>
											</div>
											{error && (
												<motion.div
													initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
													className="flex items-center gap-2 text-xs text-destructive ml-4"
												>
													<AlertCircle size={12} />
													<span>{error}</span>
												</motion.div>
											)}
										</div>

										<button
											type="submit"
											disabled={isLoading}
											className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
										>
											{isLoading ? (
												<Loader2 size={20} className="animate-spin" />
											) : (
												<>
													<span className="ml-1">Sign In</span>
													<Zap size={18} fill="currentColor" />
												</>
											)}
										</button>
									</form>

									<div className="mt-8 text-center space-y-4">
										<button
											type="button"
											className="text-sm font-medium text-primary hover:underline"
										>
											Forgot your password?
										</button>
									</div>
								</motion.div>
							)}

						</AnimatePresence>
					</div>

					{/* FOOTER */}
					<div className="absolute bottom-6 text-center w-full opacity-30">
						<p className="text-[10px] font-bold tracking-[0.3em] uppercase">
							SECURE CONNECTION • 256-BIT
						</p>
					</div>
				</div>
			</div>

			<div className="fixed bottom-6 right-6 z-50 p-1.5 rounded-full ios-material shadow-lg">
				<ThemeToggle />
			</div>
		</div>
	);
};

