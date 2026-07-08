// Canon motion (grounded in ivisit-app + MOTION_AND_INTERACTION_CANON): Apple ease
// [0.21,0.47,0.32,0.98] for opacity/duration transitions (also the sheet-snap curve); spring
// 168/30/0.9 for physical (layout/position) motion; graduated press — controls 0.96, cards
// 0.988. Reduced-motion is honored by getMobilePageStageMotion + the global
// prefers-reduced-motion rule in index.css.
export const mobileEasing = [0.21, 0.47, 0.32, 0.98];

export const mobileSpring = { type: 'spring', stiffness: 168, damping: 30, mass: 0.9 };

export const getMobilePageLoadDirection = (index = 0) => (index % 2 === 0 ? -1 : 1);

export const getMobilePageStageMotion = ({
    index = 0,
    reduceMotion = false,
    distance = 8,
    delayBase = 0.02,
    delayStep = 0.03
} = {}) => {
    if (reduceMotion) {
        return {
            initial: false,
            animate: { opacity: 1, x: 0, y: 0 },
            transition: { duration: 0 }
        };
    }

    const clampedIndex = Number.isFinite(index) ? Math.max(0, index) : 0;

    return {
        initial: {
            opacity: 0,
            x: 0,
            y: distance
        },
        animate: {
            opacity: 1,
            x: 0,
            y: 0
        },
        transition: {
            duration: 0.2,
            delay: delayBase + (clampedIndex * delayStep),
            ease: mobileEasing
        }
    };
};

export const mobileMotion = {
    quick: { duration: 0.16, ease: mobileEasing },
    base: { duration: 0.2, ease: mobileEasing },
    reveal: { duration: 0.22, ease: mobileEasing },
    linger: { duration: 0.3, ease: mobileEasing },
    spring: mobileSpring,                                   // physical / layout motion
    tap: { scale: 0.96 },                                   // control press (canon)
    press: { control: { scale: 0.96 }, card: { scale: 0.988 } },
    pageStage: getMobilePageStageMotion
};

export default mobileMotion;
