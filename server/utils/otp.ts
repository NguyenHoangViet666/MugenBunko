import { createHmac, randomInt } from 'node:crypto';
import db from '../db.js';
import { JWT_SECRET } from '../config.js';
import type { PoolConnection } from 'mysql2/promise';
export type OtpPurpose = 'registration' | 'password_reset';
// Keep existing registration codes valid; recovery codes have a separate HMAC namespace.
const hash = (email: string, code: string, purpose: OtpPurpose) => createHmac('sha256', JWT_SECRET)
    .update((purpose === 'registration' ? '' : purpose + ':') + email + ':' + code).digest('hex');

export async function issueOtp(email: string, purpose: OtpPurpose = 'registration') {
    await db.query('DELETE FROM email_otps WHERE expires_at < ? AND sent_at < ? LIMIT 100', [Date.now(), Date.now() - 60000]);
    const code = randomInt(100000, 1000000).toString();
    return db.transaction(async connection => {
        await connection.execute('INSERT IGNORE INTO email_otps (email, purpose, code_hash, expires_at, sent_at) VALUES (?, ?, ?, 0, 0)', [email, purpose, '']);
        const [records] = await connection.execute<any[]>('SELECT sent_at FROM email_otps WHERE email = ? AND purpose = ? FOR UPDATE', [email, purpose]);
        if (Date.now() - Number(records[0].sent_at) < 60000) return null;
        await connection.execute('UPDATE email_otps SET code_hash = ?, expires_at = ?, sent_at = ?, attempts = 0 WHERE email = ? AND purpose = ?', [hash(email, code, purpose), Date.now() + 300000, Date.now(), email, purpose]);
        return code;
    });
}
export async function verifyOtpOnConnection(connection: PoolConnection, email: string, code: string, consume = false, purpose: OtpPurpose = 'registration') {
        const [records] = await connection.execute<any[]>('SELECT * FROM email_otps WHERE email = ? AND purpose = ? FOR UPDATE', [email, purpose]);
        const record = records[0];
        if (!record || Number(record.expires_at) < Date.now() || record.attempts >= 5) return false;
        if (record.code_hash !== hash(email, code, purpose)) {
            await connection.execute('UPDATE email_otps SET attempts = attempts + 1 WHERE email = ? AND purpose = ?', [email, purpose]);
            return false;
        }
        if (consume) await connection.execute('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [email, purpose]);
        return true;
}

export async function verifyOtp(email: string, code: string, consume = false, purpose: OtpPurpose = 'registration') {
    return db.transaction(connection => verifyOtpOnConnection(connection, email, code, consume, purpose));
}

export async function discardOtp(email: string, code: string, purpose: OtpPurpose = 'registration') {
    await db.query('DELETE FROM email_otps WHERE email = ? AND purpose = ? AND code_hash = ?', [email, purpose, hash(email, code, purpose)]);
}
