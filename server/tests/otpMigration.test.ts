import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from './fixture.js';
import { logOtpFailure } from '../utils/otpDiagnostics.js';

describe('Legacy OTP schema upgrade', () => {
    let fixture: Awaited<ReturnType<typeof startFixture>>;
    before(async () => { fixture = await startFixture({ legacyOtpSchema: true }); });
    after(async () => { await fixture?.close(); });
    const request = async (route: string, body: unknown) => {
        const response = await fetch(fixture.url + '/api/auth/' + route, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        return { status: response.status, data: await response.json() };
    };

    it('invalidates plaintext codes and supports issuing, verifying and registering with a new code', async () => {
        const columns = await fixture.db.query<any[]>('SHOW COLUMNS FROM email_otps');
        for (const field of ['code_hash', 'sent_at', 'attempts']) assert.ok(columns.some(column => column.Field === field));
        assert.ok(columns.find(column => column.Field === 'expires_at').Type.startsWith('bigint'));
        assert.ok(!columns.some(column => column.Field === 'otp_code'));
        const legacy = (await fixture.db.query<any[]>('SELECT code_hash, expires_at, sent_at FROM email_otps'))[0];
        assert.equal(legacy.code_hash, ''); assert.equal(Number(legacy.expires_at), 0); assert.equal(Number(legacy.sent_at), 0);
        assert.equal((await request('verify-otp', { email: 'legacy-otp@example.test', otp: '123456' })).status, 400);

        const sent = await request('send-otp', { email: 'legacy-otp@example.test' });
        assert.equal(sent.status, 200); assert.match(sent.data.devOtp, /^\d{6}$/);
        assert.equal((await request('verify-otp', { email: 'legacy-otp@example.test', otp: sent.data.devOtp })).status, 200);
        const stored = (await fixture.db.query<any[]>('SELECT code_hash FROM email_otps WHERE email = ?', ['legacy-otp@example.test']))[0];
        assert.equal(stored.code_hash.length, 64); assert.notEqual(stored.code_hash, sent.data.devOtp);
        assert.equal((await request('register', {
            username: 'otp_migration_reader', displayname: 'Độc giả kiểm tra OTP', email: 'legacy-otp@example.test',
            password: 'MigrationTest#2026', otp: sent.data.devOtp
        })).status, 200);
        assert.equal((await request('verify-otp', { email: 'legacy-otp@example.test', otp: sent.data.devOtp })).status, 400);
    });

    it('keeps current codes and resend cooldowns valid after another initialization', async () => {
        const email = 'migration-restart@example.test';
        const sent = await request('send-otp', { email });
        assert.equal(sent.status, 200);
        const original = await fixture.db.query('SELECT code_hash, expires_at, sent_at, attempts FROM email_otps WHERE email = ?', [email]);
        await fixture.db.closeDbConnection();
        await fixture.db.initializeDbConnection();
        assert.deepEqual(await fixture.db.query('SELECT code_hash, expires_at, sent_at, attempts FROM email_otps WHERE email = ?', [email]), original);
        assert.equal((await request('verify-otp', { email, otp: sent.data.devOtp })).status, 200);
        assert.equal((await request('send-otp', { email })).status, 429);
    });

    it('logs the failing stage and error code without SQL, email, OTP or SMTP credentials', context => {
        const messages: unknown[][] = [];
        context.mock.method(console, 'error', (...values: unknown[]) => messages.push(values));
        logOtpFailure('otp_storage', { code: 'ER_BAD_FIELD_ERROR', errno: 1054,
            message: 'private@example.test 123456 secret-password', sql: 'sensitive SQL', response: 'sensitive SMTP response' });
        assert.deepEqual(messages, [['[OTP] Request failed', { stage: 'otp_storage', code: 'ER_BAD_FIELD_ERROR', errno: 1054 }]]);
    });
});
