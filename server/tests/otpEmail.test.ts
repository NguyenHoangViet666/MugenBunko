import { it } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { registrationOtpEmail } from '../emails/registrationOtp.js';

it('composes a UTF-8 email with both HTML and plain-text alternatives without sending mail', async () => {
    const email = registrationOtpEmail('123456');
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    try {
        const result = await transport.sendMail({ from: { name: 'MugenBunko', address: 'sender@example.test' }, to: 'reader@example.test', ...email });
        const message = result.message.toString();
        assert.match(message, /From: MugenBunko <sender@example\.test>/);
        assert.match(message, /Content-Type: multipart\/alternative;/i);
        assert.match(message, /Content-Type: text\/plain; charset=utf-8/i);
        assert.match(message, /Content-Type: text\/html; charset=utf-8/i);
        assert.ok(email.text.includes('123456') && email.html.includes('123456'));
        assert.ok(!email.subject.includes('123456'));
        assert.throws(() => registrationOtpEmail('<script>'), /six-digit OTP/);
    } finally {
        transport.close();
    }
});
