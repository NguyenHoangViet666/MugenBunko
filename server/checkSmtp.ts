import './config.js';
import nodemailer from 'nodemailer';
import { getSmtpOptions } from './utils/mailer.js';

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
let checkingConnection = false;
try {
    const options = getSmtpOptions();
    if (!options) throw new Error('Chưa cấu hình gửi email. Điền SMTP_USER và SMTP_PASS trong server/.env rồi chạy lại.');
    checkingConnection = true;
    transport = nodemailer.createTransport(options);
    await transport.verify();
    console.log('SMTP kết nối và xác thực thành công. Kiểm tra này không gửi email.');
} catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'EAUTH') console.error('SMTP từ chối xác thực. Kiểm tra SMTP_USER và SMTP_PASS; với Gmail, dùng App Password.');
    else if (code) console.error('Không kết nối được SMTP. Kiểm tra máy chủ, cổng, TLS và kết nối mạng.');
    else if (!checkingConnection && error instanceof Error) console.error(error.message);
    else console.error('Không kiểm tra được kết nối SMTP. Kiểm tra cấu hình máy chủ và tài khoản gửi.');
    process.exitCode = 1;
} finally {
    transport?.close();
}
