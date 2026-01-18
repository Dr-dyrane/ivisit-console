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
	Zap,
	Server,
    LayoutGrid
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
		<div className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
			{/* 1. PROCEDURAL DEPTH LAYER */}
			<div className="fixed inset-0 z-0 pointer-events-none">
				<NoiseOverlay opacity={0.5} />
				<div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px]" />
			</div>

			<div className="relative z-10 max-w-[1200px] mx-auto min-h-screen grid grid-cols-12 gap-6 px-0 md:px-12 py-6 md:py-12 items-center">
				{/* LEFT COLUMN: BRANDING & META (Bento Stack) */}
				<div className="col-span-12 lg:col-span-5 space-y-6">
					{/* LOGO BENTO */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
						className="bg-background/50 backdrop-blur-xs squircle-3xl p-10 shadow-2xl relative overflow-hidden group"
					>
                         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
						
                        <div className="relative z-10">
                            <div className="w-16 h-16 squircle-xl bg-primary flex items-center justify-center mb-8 shadow-glow">
                                <ShieldCheck className="text-primary-foreground w-8 h-8" />
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">
                                iVisit<span className="text-primary">.</span>
                            </h1>
                            <p className="text-muted-foreground leading-relaxed max-w-[280px] font-medium text-lg">
                                Secure Interface for Emergency Response Coordination.
                            </p>
                        </div>
					</motion.div>

					{/* SECONDARY STATS ROW */}
					<div className="grid grid-cols-2 gap-6">
						<motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "tween", duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                            className="bg-background/35 backdrop-blur-xs squircle-2xl p-6 aspect-square flex flex-col justify-between hover-lift group"
                        >
                            <div className="flex justify-between items-start">
							    <Globe className="w-6 h-6 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            </div>
							<div>
								<span className="block text-[10px] font-black tracking-widest uppercase opacity-40 mb-1">
									Network Status
								</span>
								<span className="text-2xl font-black tracking-tight">
									Online
								</span>
							</div>
						</motion.div>
						<motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "tween", duration: 0.3, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                            className="bg-background/35 backdrop-blur-xs squircle-2xl p-6 aspect-square flex flex-col justify-between hover-lift group"
                        >
							<div className="flex justify-between items-start">
							    <Server className="w-6 h-6 text-secondary opacity-60 group-hover:opacity-100 transition-opacity" />
                                <Activity className="w-4 h-4 text-muted-foreground" />
                            </div>
							<div>
								<span className="block text-[10px] font-black tracking-widest uppercase opacity-40 mb-1">
									System Load
								</span>
								<span className="text-2xl font-black tracking-tight">
									Optimal
								</span>
							</div>
						</motion.div>
					</div>
				</div>

				{/* RIGHT COLUMN: THE FORM (Hero Bento) */}
				<div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
					<motion.div
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ type: "tween", duration: 0.4, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
						className="bg-background/50 backdrop-blur-xs squircle-3xl p-2 sm:p-3 shadow-2xl relative"
					>
                        {/* Decorative Grid Background */}
                        <div className="absolute inset-0 opacity-5" 
                             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                        </div>

						{/* INNER FORM CONTAINER */}
						<div className="bg-background/40 backdrop-blur-md squircle-3xl p-8 sm:p-12 relative z-10">
							{/* SELECTOR PILL */}
							<div className="flex bg-muted/50 p-1 rounded-full w-fit mx-auto mb-12 shadow-inner">
								{["Login", "Create"].map((label, i) => (
									<button
										key={label}
										onClick={() => setIsLogin(i === 0)}
										className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${
											(isLogin && i === 0) || (!isLogin && i === 1)
												? "bg-background text-foreground shadow-sm scale-105"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{label}
									</button>
								))}
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<AnimatePresence mode="wait">
									{!isLogin && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											exit={{ opacity: 0, height: 0 }}
											transition={{ type: "tween", duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
											className="overflow-hidden"
										>
											<label className="text-[10px] font-black tracking-widest uppercase opacity-40 ml-4 mb-2 block">
												Registry Name
											</label>
											<div className="squircle-xl bg-muted/30 group focus-within:bg-muted/50 transition-colors duration-300 border-0">
												<div className="flex items-center px-6">
													<User className="w-5 h-5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
													<input
														className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm font-medium placeholder:text-muted-foreground/30"
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
									<div className="squircle-xl bg-muted/30 group focus-within:bg-muted/50 transition-colors duration-300 border-0">
										<div className="flex items-center px-6">
											<Mail className="w-5 h-5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
											<input
												type="email"
												className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm font-medium placeholder:text-muted-foreground/30"
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
									<div className="squircle-xl bg-muted/30 group focus-within:bg-muted/50 transition-colors duration-300 border-0">
										<div className="flex items-center px-6">
											<Lock className="w-5 h-5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
											<input
												type={showPassword ? "text" : "password"}
												className="w-full bg-transparent border-none py-5 px-4 outline-none text-sm font-medium placeholder:text-muted-foreground/30"
												placeholder="••••••••"
												onChange={(e) =>
													setFormData({ ...formData, password: e.target.value })
												}
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="opacity-40 hover:opacity-100 transition-opacity"
											>
												{showPassword ? (
													<EyeOff size={18} />
												) : (
													<Eye size={18} />
												)}
											</button>
										</div>
									</div>
								</div>

								<motion.button
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.99 }}
									transition={{ type: "tween", duration: 0.15 }}
									className="w-full mt-8 py-5 bg-primary text-primary-foreground font-black text-xs tracking-[0.2em] uppercase squircle-xl shadow-glow hover:shadow-lg transition-all flex items-center justify-center gap-3"
								>
									{loading ? (
										<div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
									) : (
										<>
											<span>
												{isLogin ? "Initiate Access" : "Register Link"}
											</span>
											<Zap size={16} className="fill-current" />
										</>
									)}
								</motion.button>
							</form>
						</div>
					</motion.div>
				</div>
			</div>

			{/* FLOATING ACCESSORIES */}
			<div className="fixed top-8 right-8 z-50">
				<ThemeToggle />
			</div>
		</div>
	);
};
