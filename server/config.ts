import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(directory, directory.endsWith('dist') ? '../.env' : '.env') });
export const production = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.JWT_SECRET;
if (production && (!configuredSecret || configuredSecret.length < 32 || /fallback|super[-_]secret|change.me|your.secret/i.test(configuredSecret))) {
    throw new Error('Production requires a strong JWT_SECRET of at least 32 characters.');
}
export const JWT_SECRET = configuredSecret || randomBytes(48).toString('hex');
if (production && (!process.env.PUBLIC_URL || new URL(process.env.PUBLIC_URL).protocol !== 'https:')) throw new Error('Production requires an HTTPS PUBLIC_URL.');
export const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(value => value.trim()).filter(Boolean);
if (production && !allowedOrigins.length) throw new Error('Production requires FRONTEND_URL with the allowed HTTPS origins.');
if (production && allowedOrigins.some(origin => new URL(origin).protocol !== 'https:')) throw new Error('Production frontend origins must use HTTPS.');
export function isAllowedOrigin(origin?: string) {
    return !origin || allowedOrigins.includes(origin) || (!production && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}
