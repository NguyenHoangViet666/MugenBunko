import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

type SmtpOptions = SMTPTransport.Options & { auth: { user: string; pass: string } };

export function getSmtpOptions(env: NodeJS.ProcessEnv = process.env): SmtpOptions | null {
    const user = env.SMTP_USER?.trim() || '';
    const pass = env.SMTP_PASS || '';
    if (!user && !pass.trim()) return null;
    if (!user || !pass.trim()) throw new Error('Điền đủ SMTP_USER và SMTP_PASS trong server/.env.');

    const host = env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const portText = env.SMTP_PORT?.trim() || '587';
    const port = Number(portText);
    if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT phải là số từ 1 đến 65535.');
    const secureText = env.SMTP_SECURE?.trim().toLowerCase();
    if (secureText && !['true', 'false'].includes(secureText)) throw new Error('SMTP_SECURE chỉ nhận true hoặc false.');
    const secure = secureText ? secureText === 'true' : port === 465;
    if (port === 465 && !secure) throw new Error('SMTP_PORT=465 cần SMTP_SECURE=true.');
    if (/[\s/]/.test(host)) throw new Error('SMTP_HOST chỉ chứa tên máy chủ, không kèm URL hoặc đường dẫn.');

    return { host, port, secure, requireTLS: !secure, auth: { user, pass },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
        disableFileAccess: true, disableUrlAccess: true };
}
