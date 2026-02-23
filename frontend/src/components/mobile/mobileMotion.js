export const mobileEasing = [0.22, 1, 0.36, 1];

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
    tap: { scale: 0.97 },
    pageStage: getMobilePageStageMotion
};

export default mobileMotion;
