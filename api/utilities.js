import dotenv from 'dotenv';

// Load variables from .env into process.env
dotenv.config();

/**
 * Get a raw environment variable with an optional default value.
 */
export function getEnv(key, defaultValue = '') {
    return process.env[key] ?? defaultValue;
}

/**
 * Get an environment variable parsed strictly as a boolean.
 * Returns true if the string is 'true' or '1' (case-insensitive).
 */
export function getEnvBool(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.trim().toLowerCase() === 'true' || value.trim() === '1';
}

/**
 * Helper specifically for checking DEV_MODE.
 */
export function isDevMode() {
    return getEnvBool('DEV_MODE', false);
}