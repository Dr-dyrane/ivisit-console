/**
 * Shared metric delta / formatting utilities.
 *
 * Previously copy-pasted in MobileDashboard, MobileEmergency, MobileVisits,
 * MobileDoctors, MobileHospitals, MobileAmbulances, MobileUsers, MobileAnalytics.
 * Single source of truth from here — import these instead of re-defining.
 */

/**
 * Format a numeric delta value as a signed percentage string.
 * Returns null when the value is not a finite number (caller shows fallback).
 *
 * @param {number|null} value
 * @returns {string|null}  e.g. "+12.3%", "-4%", null
 */
export const formatSignedPercent = (value) => {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${value > 0 ? '+' : ''}${rounded}%`;
};

/**
 * Calculate the percentage delta between two values.
 * Returns null when either value is non-finite or the previous value is zero.
 *
 * @param {number|string} current
 * @param {number|string} previous
 * @returns {number|null}  raw percent change, e.g. 12.3 or -4.0
 */
export const calcDeltaPercent = (current, previous) => {
    const c = Number(current);
    const p = Number(previous);
    if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
    return ((c - p) / Math.abs(p)) * 100;
};

/**
 * Convert a pre-computed delta percent into the badge/direction shape used by
 * MobileMetricRow's `rightBlade` prop.
 *
 * @param {number|null} value  Output of calcDeltaPercent (or any raw percent)
 * @returns {{ delta: string, direction: 'up'|'down'|'flat' }}
 */
export const toDeltaBadge = (value) => ({
    delta: formatSignedPercent(value) || 'LIVE',
    direction: Number.isFinite(value)
        ? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat')
        : 'flat',
});
