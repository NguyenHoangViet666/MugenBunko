/** Local tooling only. Does not import db.ts or start application migrations. */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConnectionOptions } from 'mysql2/promise';

const base = fileURLToPath(new URL('../../', import.meta.url));
export const workspaceRoot = fs.existsSync(path.join(base, 'src')) ? base : path.dirname(base);
export type LocalEnvironment = Record<string, string | undefined>;

export function readLocalEnvironment(): LocalEnvironment {
    const read = (file: string) => fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
    // Process and server settings take precedence; root settings support local
    // test setups without changing process.env or importing application startup.
    return { ...read(path.join(workspaceRoot, '.env')), ...read(path.join(workspaceRoot, 'server/.env')), ...process.env };
}

export function configuredDatabaseName(env: LocalEnvironment): string {
    const database = env.DB_NAME || 'mugenbunko';
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(database)) throw new Error('Invalid DB_NAME.');
    return database;
}

export function localDatabaseOptions(env: LocalEnvironment, purpose: 'preflight' | 'test'): ConnectionOptions {
    const test = purpose === 'test';
    const value = (key: string, fallback: string) => {
        const override = test ? env[`TEST_${key}`] : undefined;
        if (override !== undefined && (override !== '' || key === 'DB_PASSWORD')) return override;
        return key === 'DB_PASSWORD' ? (env[key] ?? fallback) : (env[key] || fallback);
    };
    const host = value('DB_HOST', 'localhost');
    const port = Number(value('DB_PORT', '3306'));
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid database port.');
    if (test && !env.TEST_DB_HOST && !['localhost', '127.0.0.1', '::1'].includes(host)) {
        throw new Error('Payment tests require an explicit TEST_DB_HOST for a non-loopback server.');
    }
    return {
        host, port, user: value('DB_USER', 'root'), password: value('DB_PASSWORD', ''),
        connectTimeout: 10000, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true,
        multipleStatements: false,
    };
}
