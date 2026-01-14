// constants/colors.js - iVisit Brand Color Palette
export const COLORS = {
	// Primary brand colors
	brandPrimary: "#86100E", // iVisit red (emergency / attention)
	brandSecondary: "#B71C1C", // Slightly darker red for accents / hover / borders

	// Backgrounds
	bgDark: "#0B0F1A", // Deep black/blue-ish for dark mode
	bgDarkAlt: "#121826", // Slightly lighter for cards / inputs
	bgLight: "#FFFFFF", // Pure white for light mode
	bgLightAlt: "#F5F5F5", // Slightly gray for cards / inputs

	// Text
	textPrimary: "#1A1A1A", // Almost black for main text (light mode)
	textMuted: "#7E7E7E", // Gray for secondary / helper text
	textLight: "#FFFFFF", // White for dark mode main text
	textMutedDark: "#B0B0B0", // Gray for dark mode secondary text

	// Status / feedback
	success: "#B71C1C", // Use brand red family for success
	error: "#C62828", // Red error
	warning: "#B71C1C", // Reuse brand red for warnings
	info: "#86100E", // Info uses primary brand red

	// Borders / dividers
	border: "#2A2A2A", // Dark gray for dividers (dark mode)
	borderLight: "#E0E0E0", // Light gray for light mode dividers
};

// HSL values for CSS custom properties
export const HSL_COLORS = {
	brandPrimary: "357 74% 26%", // #86100E
	brandSecondary: "357 74% 36%", // #B71C1C
	bgDark: "217 38% 4%", // #0B0F1A
	bgDarkAlt: "217 38% 7%", // #121826
	bgLight: "0 0% 100%", // #FFFFFF
	bgLightAlt: "0 0% 96%", // #F5F5F5
	textPrimary: "0 0% 10%", // #1A1A1A
	textMuted: "0 0% 49%", // #7E7E7E
	textLight: "0 0% 100%", // #FFFFFF
	textMutedDark: "0 0% 69%", // #B0B0B0
	error: "0 84% 60%", // #C62828
	border: "0 0% 16%", // #2A2A2A
	borderLight: "0 0% 88%", // #E0E0E0
};
