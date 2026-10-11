import { createHmac, randomInt } from 'node:crypto';
import db from '../db.js';
import { JWT_SECRET } from '../config.js';
const hash = (email: string, code: string) => createHmac('sha256', JWT_SECRET).update(email + ':' + code).digest('hex');

export async function issueOtp(email: string) {
    await db.query('DELETE FROM email_otps WHERE expires_at < ? AND sent_at < ? LIMIT 100', [Date.now(), Date.now() - 60000]);
    const code = randomInt(100000, 1000000).toString();
    return db.transaction(async connection => {
        await connection.execute('INSERT IGNORE INTO email_otps (email, code_hash, expires_at, sent_at) VALUES (?, ?, 0, 0)', [email, '']);
        const [records] = await connection.execute<any[]>('SELECT sent_at FROM email_otps WHERE email = ? FOR UPDATE', [email]);
        if (Date.now() - Number(records[0].sent_at) < 60000) return null;
        await connection.execute('UPDATE email_otps SET code_hash = ?, expires_at = ?, sent_at = ?, attempts = 0 WHERE email = ?', [hash(email, code), Date.now() + 300000, Date.now(), email]);
        return code;
    });
}
export async function verifyOtp(email: string, code: string, consume = false) {
    return db.transaction(async connection => {
        const [records] = await connection.execute<any[]>('SELECT * FROM email_otps WHERE email = ? FOR UPDATE', [email]);
        const record = records[0];
        if (!record || Number(record.expires_at) < Date.now() || record.attempts >= 5) return false;
        if (record.code_hash !== hash(email, code)) {
            await connection.execute('UPDATE email_otps SET attempts = attempts + 1 WHERE email = ?', [email]);
            return false;
        }
        if (consume) await connection.execute('DELETE FROM email_otps WHERE email = ?', [email]);
        return true;
    });
}
