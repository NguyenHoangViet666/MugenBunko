/** No imports of app startup, SMTP, Redis, payment gateways or production migrations. */
import mysql, { type Connection } from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { localDatabaseOptions, readLocalEnvironment, workspaceRoot } from '../payments/localDatabase.js';

export async function createPaymentFixture(settings: { bootstrap?: boolean } = {}) {
    const options = localDatabaseOptions(readLocalEnvironment(), 'test');
    const database = `mugenbunko_payment_test_${randomBytes(8).toString('hex')}`;
    const admin = await mysql.createConnection(options);
    let owned = false;
    let connection: Connection | undefined;
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => {
        try { await connection?.end(); }
        finally {
            try {
                if (owned) {
                    if (!/^mugenbunko_payment_test_[a-f0-9]{16}$/.test(database)) throw new Error('Unsafe payment fixture cleanup.');
                    await admin.query(`DROP DATABASE \`${database}\``);
                    owned = false;
                }
            } finally { await admin.end(); }
        }
    })();
    try {
        // No IF NOT EXISTS: cleanup is authorized only after this process creates it.
        await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        owned = true;
        connection = await mysql.createConnection({ ...options, database, multipleStatements: true });
        await connection.query("SET time_zone = '+00:00'");
        if (settings.bootstrap === false) return { database, connection, options, close };
        const rawSchema = fs.readFileSync(path.join(workspaceRoot, 'server/schema.sql'), 'utf8');
        const marker = '-- Disable constraints';
        if (!rawSchema.includes(marker)) throw new Error('Schema seed boundary not found.');
        const schema = rawSchema.slice(0, rawSchema.indexOf(marker))
            .replace(/^CREATE DATABASE[^\n]+\r?$/gm, '').replace(/^USE[^\n]+\r?$/gm, '');
        if (/\b(?:TRUNCATE|DROP\s+DATABASE|INSERT\s+INTO|USE)\b/i.test(schema.replace(/--[^\n]*/g, ''))) {
            throw new Error('Payment fixture bootstrap must contain table definitions only.');
        }
        await connection.query(schema);
        return { database, connection, options, close };
    } catch (error) { await close(); throw error; }
}
