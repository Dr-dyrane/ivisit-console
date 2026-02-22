import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FeedbackContext = createContext(null);

const FEEDBACK_VARIANTS = {
    click: {
        colors: ['hsl(var(--primary))', 'hsl(var(--spark))'],
        haptic: [4],
        sound: { start: 560, end: 650, gain: 0.012, duration: 0.055, type: 'sine' }
    },
    success: {
        colors: ['hsl(var(--spark))', 'hsl(var(--primary))', 'hsl(var(--success))'],
        haptic: [5],
        sound: { start: 610, end: 920, gain: 0.02, duration: 0.09, type: 'sine' }
    },
    info: {
        colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--spark))'],
        haptic: [4],
        sound: { start: 500, end: 760, gain: 0.014, duration: 0.075, type: 'triangle' }
    },
    warning: {
        colors: ['hsl(var(--spark))', 'hsl(var(--warning))', 'hsl(var(--primary))'],
        haptic: [4, 8, 4],
        sound: { start: 420, end: 620, gain: 0.015, duration: 0.08, type: 'triangle' }
    },
    destructive: {
        colors: ['hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--spark))'],
        haptic: [5, 10, 4],
        sound: { start: 360, end: 300, gain: 0.018, duration: 0.085, type: 'sawtooth' }
    }
};
export const FEEDBACK_TYPES = Object.freeze({
    CLICK: 'click',
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    DESTRUCTIVE: 'destructive'
});

const getHaloFill = (variant) => {
    switch (variant) {
        case 'success':
            return 'hsl(var(--spark) / 0.16)';
        case 'info':
            return 'hsl(var(--primary) / 0.14)';
        case 'warning':
            return 'hsl(var(--warning) / 0.14)';
        case 'destructive':
            return 'hsl(var(--destructive) / 0.14)';
        default:
            return 'hsl(var(--primary) / 0.12)';
    }
};

const getSheenGradient = (variant) => {
    switch (variant) {
        case 'success':
            return 'linear-gradient(110deg, transparent 0%, hsl(var(--spark) / 0.0) 20%, hsl(var(--spark) / 0.34) 50%, hsl(var(--primary) / 0.12) 70%, transparent 100%)';
        case 'info':
            return 'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.0) 20%, hsl(var(--primary) / 0.3) 50%, hsl(var(--spark) / 0.1) 70%, transparent 100%)';
        case 'warning':
            return 'linear-gradient(110deg, transparent 0%, hsl(var(--warning) / 0.0) 20%, hsl(var(--warning) / 0.3) 50%, hsl(var(--spark) / 0.12) 70%, transparent 100%)';
        case 'destructive':
            return 'linear-gradient(110deg, transparent 0%, hsl(var(--destructive) / 0.0) 20%, hsl(var(--destructive) / 0.3) 50%, hsl(var(--primary) / 0.12) 70%, transparent 100%)';
        default:
            return 'linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.0) 20%, hsl(var(--primary) / 0.28) 50%, hsl(var(--spark) / 0.12) 70%, transparent 100%)';
    }
};

const createBurstParticles = (variant, baseColor) => {
    const palette = [baseColor, ...(FEEDBACK_VARIANTS[variant]?.colors || FEEDBACK_VARIANTS.click.colors)].filter(Boolean);
    return Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI * 2 + ((i % 3) * Math.PI) / 24;
        const distance = 18 + (i % 6) * 5.2;
        return {
            id: i,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance - 8,
            rotate: 90 + i * 10,
            color: palette[i % palette.length],
            size: i % 4 === 0 ? 2.4 : 1.6
        };
    });
};

const playSoftPop = (variant = 'click') => {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
        const cfg = FEEDBACK_VARIANTS[variant]?.sound || FEEDBACK_VARIANTS.click.sound;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = cfg.type;
        oscillator.frequency.setValueAtTime(cfg.start, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(120, cfg.end), now + Math.max(0.02, cfg.duration * 0.7));

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(cfg.gain, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + cfg.duration + 0.01);

        setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close();
        }, 170);
    } catch {
        // Browser can block auto audio; ignore gracefully.
    }
};

const triggerSoftHaptic = (variant = 'click') => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (typeof window !== 'undefined') {
        const now = Date.now();
        const last = window.__ivisitLastHapticAt || 0;
        if (now - last < 260) return;
        window.__ivisitLastHapticAt = now;
    }
    navigator.vibrate(FEEDBACK_VARIANTS[variant]?.haptic || FEEDBACK_VARIANTS.click.haptic);
};

export const FeedbackProvider = ({ children }) => {
    const [bursts, setBursts] = useState([]);

    const triggerFeedback = useCallback((options = {}) => {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        const x = Number.isFinite(options.x) ? options.x : viewportWidth / 2;
        const y = Number.isFinite(options.y) ? options.y : viewportHeight / 2;
        const variant = options.variant || 'click';
        const color = options.color || FEEDBACK_VARIANTS[variant]?.colors?.[0] || 'hsl(var(--spark))';
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        if (options.haptic !== false) triggerSoftHaptic(variant);
        if (options.sound !== false) playSoftPop(variant);

        const burst = {
            id,
            x,
            y,
            color,
            variant,
            focusRect: options.focusRect || null,
            focusRadius: options.focusRadius || 18,
            particles: createBurstParticles(variant, color)
        };
        setBursts((prev) => [...prev, burst]);

        setTimeout(() => {
            setBursts((prev) => prev.filter((item) => item.id !== id));
        }, 980);
    }, []);

    const value = useMemo(() => ({ triggerFeedback }), [triggerFeedback]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <div className="fixed inset-0 z-[160] pointer-events-none">
                <AnimatePresence>
                    {bursts.map((burst) => (
                        <motion.div
                            key={burst.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="absolute"
                            style={{ left: burst.x, top: burst.y - 8 }}
                            aria-hidden="true"
                        >
                            {burst.focusRect && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: [0, 0.9, 0], scale: [0.97, 1.01, 1.02] }}
                                        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                                        className="fixed pointer-events-none"
                                        style={{
                                            left: burst.focusRect.left,
                                            top: burst.focusRect.top,
                                            width: burst.focusRect.width,
                                            height: burst.focusRect.height,
                                            borderRadius: burst.focusRadius,
                                            border: `1.5px solid ${burst.color}`,
                                            boxShadow: `0 0 16px ${burst.color}66, inset 0 0 10px ${burst.color}22`
                                        }}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: [0, 0.45, 0], scale: [0.96, 1.025, 1.04] }}
                                        transition={{ duration: 0.68, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                                        className="fixed pointer-events-none"
                                        style={{
                                            left: burst.focusRect.left,
                                            top: burst.focusRect.top,
                                            width: burst.focusRect.width,
                                            height: burst.focusRect.height,
                                            borderRadius: burst.focusRadius + 2,
                                            border: `1px solid ${burst.color}55`
                                        }}
                                    />
                                </>
                            )}
                            <motion.span
                                initial={{ scale: 0.56, opacity: 0.48 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute -left-3 -top-3 h-6 w-6 rounded-full"
                                style={{ border: `1.25px solid ${burst.color}66` }}
                            />
                            <motion.span
                                initial={{ scale: 0.44, opacity: 0.28 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute -left-4 -top-4 h-8 w-8 rounded-full"
                                style={{ background: getHaloFill(burst.variant) }}
                            />
                            <motion.span
                                initial={{ scale: 0.3, opacity: 0 }}
                                animate={{ scale: 2.75, opacity: [0, 0.16, 0] }}
                                transition={{ duration: 0.74, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute -left-6 -top-6 h-12 w-12 rounded-full"
                                style={{ border: `1px solid ${burst.color}33` }}
                            />
                            <motion.span
                                initial={{ opacity: 0, x: -24, scaleX: 0.75 }}
                                animate={{ opacity: [0, 0.85, 0], x: 26, scaleX: 1.14 }}
                                transition={{ duration: 0.42, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute -left-12 -top-4 h-8 w-24 rounded-full"
                                style={{ backgroundImage: getSheenGradient(burst.variant), filter: 'blur(0.6px)' }}
                            />
                            <motion.span
                                initial={{ scale: 0.8, opacity: 0.2 }}
                                animate={{ scale: 1.25, opacity: 0 }}
                                transition={{ duration: 0.62, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute -left-7 -top-7 h-14 w-14 rounded-full"
                                style={{ boxShadow: `0 0 24px 3px ${burst.color}22 inset` }}
                            />
                            {burst.particles.map((particle) => (
                                <motion.span
                                    key={`${burst.id}-p-${particle.id}`}
                                    initial={{ x: 0, y: 0, scale: 0.8, opacity: 0.82, rotate: 0 }}
                                    animate={{ x: particle.dx, y: particle.dy, scale: 0, opacity: 0, rotate: particle.rotate }}
                                    transition={{
                                        duration: 0.56,
                                        delay: (particle.id % 5) * 0.015,
                                        ease: [0.16, 1, 0.3, 1]
                                    }}
                                    className="absolute rounded-[3px]"
                                    style={{
                                        width: particle.size,
                                        height: particle.size,
                                        background: particle.color,
                                        boxShadow: `0 0 7px ${particle.color}`
                                    }}
                                />
                            ))}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </FeedbackContext.Provider>
    );
};

export const useFeedbackContext = () => {
    const context = useContext(FeedbackContext);
    if (!context) throw new Error('useFeedbackContext must be used within FeedbackProvider');
    return context;
};
