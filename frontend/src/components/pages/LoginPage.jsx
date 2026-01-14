import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
	LogIn,
	UserPlus,
	Mail,
	Lock,
	User,
	Eye,
	EyeOff,
	ShieldCheck,
	Activity,
	Globe,
	Cpu,
} from "lucide-react";
import ThemeToggle from "../ui/theme-toggle";
import NoiseOverlay from "../ui/noise-overlay";

import { toast } from "sonner";

export const LoginPage = () => {
	const navigate = useNavigate();
	const { signIn, signUp, user, profile, loading } = useAuth();
	const [isLogin, setIsLogin] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		username: "",
	});

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			if (isLogin) {
				await signIn(formData.email, formData.password);
				toast.success("System Linked");
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
			toast.error(err.message || "Breach Detected");
		}
	};

	useEffect(() => {
		if (!loading && user && profile) {
			navigate("/");
		}
	}, [loading, user, profile, navigate]);

	return (
		<div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
			{/* 1. PROCEDURAL DEPTH LAYER */}
			<div className="fixed inset-0 z-0 pointer-events-none">
				<NoiseOverlay opacity={1} />
				<div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
			</div>

			<div className="relative z-10 max-w-[1000px] mx-auto min-h-screen grid grid-cols-12 gap-6 p-6 md:p-12 items-center">
				{/* LEFT COLUMN: BRANDING & META (Bento Stack) */}
				<div className="col-span-12 lg:col-span-5 space-y-6">
					{/* LOGO BENTO */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-surface-1 rounded-[40px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
					>
						<div className="w-14 h-14 rounded-[18px] bg-primary flex items-center justify-center mb-8 shadow-2xl shadow-primary/40">
							<ShieldCheck className="text-white w-7 h-7" />
						</div>
						<h1 className="text-4xl font-semibold tracking-tight leading-none mb-4">
							iVisit<span className="text-primary">.</span>
						</h1>
						<p className="text-muted-foreground leading-relaxed max-w-[240px] font-medium opacity-60">
							Secure Interface for Emergency Response Coordination.
						</p>
					</motion.div>

					{/* SECONDARY STATS ROW */}
					<div className="grid grid-cols-2 gap-6">
						<div className="bg-surface-2 rounded-[32px] p-6 aspect-square flex flex-col justify-between">
							<Globe className="w-5 h-5 text-primary opacity-40" />
							<div>
								<span className="block text-[10px] font-black tracking-widest uppercase opacity-30">
									Network
								</span>
								<span className="text-lg font-medium tracking-tighter">
									Global.L2
								</span>
							</div>
						</div>
						<div className="bg-surface-2 rounded-[32px] p-6 aspect-square flex flex-col justify-between">
							<Cpu className="w-5 h-5 text-secondary opacity-40" />
							<div>
								<span className="block text-[10px] font-black tracking-widest uppercase opacity-30">
									Engine
								</span>
								<span className="text-lg font-medium tracking-tighter">
									V8.Hybrid
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: THE FORM (Hero Bento) */}
				<div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						className="bg-surface-1 rounded-[48px] p-2 sm:p-3 shadow-[0_48px_80px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.8)]"
					>
						{/* INNER FORM CONTAINER - Creates the "Card within a Card" luxury look */}
						<div className="bg-surface-raised/50 backdrop-blur-xl rounded-[40px] p-8 sm:p-12">
							{/* SELECTOR PILL */}
							<div className="flex bg-surface-3 p-1 rounded-full w-fit mx-auto mb-12 shadow-inner">
								{["Login", "Create"].map((label, i) => (
									<button
										key={label}
										onClick={() => setIsLogin(i === 0)}
										className={`px-8 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-500 ${
											(isLogin && i === 0) || (!isLogin && i === 1)
												? "bg-surface-1 text-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{label}
									</button>
								))}
							</div>

							<form onSubmit={handleSubmit} className="space-y-5">
								<AnimatePresence mode="wait">
									{!isLogin && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="space-y-2"
										>
											<label className="text-[10px] font-black tracking-widest uppercase opacity-40 ml-4">
												Registry Name
											</label>
											<div className="bg-surface-2 rounded-[24px] group focus-within:bg-surface-3 transition-colors duration-300">
												<div className="flex items-center px-6">
													<User className="w-4 h-4 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
													<input
														className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm placeholder:text-muted-foreground/30"
														placeholder="OPERATOR_ID"
														onChange={(e) =>
															setFormData({
																...formData,
																username: e.target.value,
															})
														}
													/>
												</div>
											</div>
										</motion.div>
									)}
								</AnimatePresence>

								<div className="space-y-2">
									<label className="text-[10px] font-black tracking-widest uppercase opacity-40 ml-4">
										Neural Link Email
									</label>
									<div className="bg-surface-2 rounded-[24px] group focus-within:bg-surface-3 transition-colors duration-300">
										<div className="flex items-center px-6">
											<Mail className="w-4 h-4 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
											<input
												type="email"
												className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm placeholder:text-muted-foreground/30"
												placeholder="identity@visit.com"
												onChange={(e) =>
													setFormData({ ...formData, email: e.target.value })
												}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-[10px] font-black tracking-widest uppercase opacity-40 ml-4">
										Access Phrase
									</label>
									<div className="bg-surface-2 rounded-[24px] group focus-within:bg-surface-3 transition-colors duration-300">
										<div className="flex items-center px-6">
											<Lock className="w-4 h-4 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
											<input
												type={showPassword ? "text" : "password"}
												className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm placeholder:text-muted-foreground/30"
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
												{showPassword ? (
													<EyeOff size={16} />
												) : (
													<Eye size={16} />
												)}
											</button>
										</div>
									</div>
								</div>

								<motion.button
									whileHover={{ scale: 0.99, y: -2 }}
									whileTap={{ scale: 0.97 }}
									className="w-full mt-8 py-6 bg-foreground text-background font-black text-[12px] tracking-[0.3em] uppercase rounded-[28px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] transition-all flex items-center justify-center gap-3"
								>
									{loading ? (
										<div className="w-5 h-5 border-2 border-background/20 border-t-background rounded-full animate-spin" />
									) : (
										<>
											<span>
												{isLogin ? "Initiate Access" : "Register Link"}
											</span>
											<LogIn size={14} className="mt-[-2px]" />
										</>
									)}
								</motion.button>
							</form>
						</div>
					</motion.div>
				</div>
			</div>

			{/* FLOATING ACCESSORIES */}
			<div className="fixed top-12 right-12 z-50">
				<ThemeToggle />
			</div>
		</div>
	);
};
