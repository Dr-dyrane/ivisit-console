import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
	Mail,
	Lock,
	User,
	Eye,
	EyeOff,
	ShieldCheck,
	Zap,
	Globe,
	Server,
} from "lucide-react";
import ThemeToggle from "../ui/theme-toggle";
import { toast } from "sonner";

export const LoginPage = () => {
	const navigate = useNavigate();
	const { signIn, signUp, user, profile, loading } = useAuth();
	const [isLogin, setIsLogin] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [greeting, setGreeting] = useState("");
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		username: "",
	});

	useEffect(() => {
		const hour = new Date().getHours();
		if (hour < 12) setGreeting("Good Morning");
		else if (hour < 18) setGreeting("Good Afternoon");
		else setGreeting("Good Evening");
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			if (isLogin) {
				await signIn(formData.email, formData.password);
				toast.success("Identity Verified");
			} else {
				const data = await signUp(
					formData.email,
					formData.password,
					formData.username
				);
				toast.success("Node Initialized");
				if (data?.user && data?.session) {
					navigate("/");
				}
			}
		} catch (err) {
			toast.error(err.message || "Access Denied");
		}
	};

	useEffect(() => {
		if (!loading && user && profile) {
			navigate("/");
		}
	}, [loading, user, profile, navigate]);

	return (
		<div className="relative min-h-[100dvh] bg-background text-foreground flex flex-col items-center">
			{/* PERFORMANCE BACKGROUND: No Blur filters, just gradients */}
			<div className="fixed inset-0 z-0 pointer-events-none">
				<div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] opacity-20 bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)]" />
				<div className="absolute bottom-[-5%] left-[-10%] w-[60%] h-[40%] opacity-10 bg-[radial-gradient(circle,hsl(var(--primary))_0%,transparent_70%)]" />
			</div>

			<div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 min-h-[100dvh]">
				{/* LEFT: DESKTOP BRANDING */}
				<div className="hidden lg:flex col-span-5 flex-col justify-center p-12 space-y-8">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
					>
						<div className="w-16 h-16 bg-primary rounded-[22%] flex items-center justify-center mb-8 shadow-2xl">
							<ShieldCheck className="text-white w-9 h-9" />
						</div>
						<div className="space-y-1 mb-6">
							<p className="text-2xl font-medium tracking-tight opacity-40">
								{greeting},
							</p>
							<h1 className="text-7xl font-black tracking-tighter leading-none">
								iVisit<span className="text-primary">.</span>
							</h1>
						</div>
						<p className="text-xl text-muted-foreground font-medium leading-tight max-w-sm">
							Mission-critical emergency response coordination link.
						</p>
					</motion.div>

					{/* QUICK STATS */}
					<div className="flex gap-4">
						<div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-full border border-foreground/5">
							<Globe size={14} className="text-primary" />
							<span className="text-[10px] font-black tracking-widest uppercase opacity-60">
								HQ-Core
							</span>
						</div>
						<div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-full border border-foreground/5">
							<Server size={14} className="text-primary" />
							<span className="text-[10px] font-black tracking-widest uppercase opacity-60">
								Secure
							</span>
						</div>
					</div>
				</div>

				{/* RIGHT: THE FORM */}
				<div className="col-span-12 lg:col-span-7 flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						className="ios-material  lg:rounded-[48px] shadow-2xl overflow-hidden w-full max-w-[560px]"
					>
						{/* MOBILE ONLY LOGO */}
						<div className="lg:hidden flex flex-col items-center pt-12 pb-6">
							<div className="space-y-1 text-center">
								<p className="text-sm font-medium tracking-tight opacity-40">
									{greeting},
								</p>
								<h1 className="text-4xl font-black tracking-tighter">
									iVisit<span className="text-primary">.</span>
								</h1>
							</div>
						</div>

						<div className="p-8 sm:p-14 lg:p-16">
							{/* SEGMENTED CONTROL - iOS NATIVE LOOK */}
							<div className="relative flex p-1 bg-foreground/[0.05] rounded-xl mb-10 w-full max-w-[320px] mx-auto">
								<motion.div
									className="absolute inset-y-1 bg-background rounded-[9px] shadow-sm"
									animate={{ x: isLogin ? "0%" : "100%", width: "50%" }}
									transition={{ type: "spring", stiffness: 350, damping: 35 }}
								/>
								<button
									onClick={() => setIsLogin(true)}
									className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors ${
										isLogin ? "text-foreground" : "text-muted-foreground"
									}`}
								>
									Sign In
								</button>
								<button
									onClick={() => setIsLogin(false)}
									className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-colors ${
										!isLogin ? "text-foreground" : "text-muted-foreground"
									}`}
								>
									Register
								</button>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<AnimatePresence mode="wait">
									{!isLogin && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
										>
											<label className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-4 mb-1.5 block">
												Identity_Operator
											</label>
											<div className="ios-input-well rounded-2xl flex items-center px-5">
												<User size={18} className="opacity-20" />
												<input
													className="w-full bg-transparent border-none py-4.5 px-4 text-base outline-none font-medium"
													placeholder="Operator Name"
													onChange={(e) =>
														setFormData({
															...formData,
															username: e.target.value,
														})
													}
												/>
											</div>
										</motion.div>
									)}
								</AnimatePresence>

								<div className="space-y-1.5">
									<label className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-4">
										Neural Link Email
									</label>
									<div className="ios-input-well rounded-2xl flex items-center px-5">
										<Mail size={18} className="opacity-20" />
										<input
											type="email"
											className="w-full bg-transparent border-none py-4.5 px-4 text-base outline-none font-medium"
											placeholder="auth@ivisit.com"
											onChange={(e) =>
												setFormData({ ...formData, email: e.target.value })
											}
										/>
									</div>
								</div>

								<div className="space-y-1.5">
									<label className="text-[10px] font-bold tracking-widest uppercase opacity-40 ml-4">
										Access Cipher Phrase
									</label>
									<div className="ios-input-well rounded-2xl flex items-center px-5">
										<Lock size={18} className="opacity-20" />
										<input
											type={showPassword ? "text" : "password"}
											className="w-full bg-transparent border-none py-4.5 px-4 text-base outline-none font-medium"
											placeholder="••••••••"
											onChange={(e) =>
												setFormData({ ...formData, password: e.target.value })
											}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="opacity-20 hover:opacity-100 transition-opacity"
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
								</div>

								<motion.button
									whileTap={{ scale: 0.98 }}
									className="w-full mt-8 py-5 bg-primary text-white font-bold text-sm tracking-widest uppercase rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:brightness-90 transition-all"
								>
									{loading ? (
										<div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
									) : (
										<>
											<span>
												{isLogin ? "Initialize Link" : "Register Node"}
											</span>
											<Zap size={16} fill="currentColor" />
										</>
									)}
								</motion.button>
							</form>

							<div className="mt-12 text-center">
								<p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-20">
									IVISIT TERMINAL ACCESS • HQ-01
								</p>
							</div>
						</div>
					</motion.div>
				</div>
			</div>

			{/* ACCESSORY TOGGLE */}
			<div className="fixed bottom-6 right-6 z-50 p-1.5 rounded-full ios-material shadow-lg">
				<ThemeToggle />
			</div>
		</div>
	);
};
