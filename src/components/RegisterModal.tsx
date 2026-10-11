import React, { useState } from 'react';

interface RegisterModalProps {
    registerModalOpen: boolean;
    setRegisterModalOpen: (open: boolean) => void;
    setLoginModalOpen: (open: boolean) => void;
    regUsername: string;
    setRegUsername: (username: string) => void;
    regDisplayname: string;
    setRegDisplayname: (displayname: string) => void;
    regPassword: string;
    setRegPassword: (password: string) => void;
    regRole: string;
    setRegRole: (role: string) => void;
    handleRegisterSubmit: (email: string, otp: string) => void;
    sendRegistrationOtp: (email: string) => Promise<string | undefined>;
}

export default function RegisterModal({
    registerModalOpen,
    setRegisterModalOpen,
    setLoginModalOpen,
    regUsername,
    setRegUsername,
    regDisplayname,
    setRegDisplayname,
    regPassword,
    setRegPassword,
    regRole,
    setRegRole,
    handleRegisterSubmit,
    sendRegistrationOtp
}: RegisterModalProps) {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [sending, setSending] = useState(false);
    const [otpNotice, setOtpNotice] = useState('');
    const sendCode = async () => {
        setSending(true); setOtpNotice('');
        try {
            const devCode = await sendRegistrationOtp(email.trim());
            if (devCode) setOtp(devCode);
            setOtpNotice('Mã xác thực đã được gửi, có hiệu lực trong 5 phút. Có thể gửi lại sau 60 giây.');
        } catch (error) { setOtpNotice(error instanceof Error ? error.message : 'Không thể gửi mã.'); }
        finally { setSending(false); }
    };
    if (!registerModalOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setRegisterModalOpen(false); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Đăng ký tài khoản</h3>
                    <button className="close-btn" onClick={() => setRegisterModalOpen(false)}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-field mb-4">
                        <label>Tên đăng nhập (viết liền không dấu)</label>
                        <input type="text" placeholder="Tên đăng nhập..." value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                    </div>
                    <div className="input-field mb-4">
                        <label>Tên hiển thị độc giả</label>
                        <input type="text" placeholder="Tên hiển thị..." value={regDisplayname} onChange={(e) => setRegDisplayname(e.target.value)} />
                    </div>
                    <div className="input-field mb-4">
                        <label>Mật khẩu</label>
                        <input type="password" placeholder="Nhập mật khẩu..." value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                        {regPassword.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: regPassword.length >= 8 ? '#2e7d32' : 'var(--text-muted)' }}>
                                    {regPassword.length >= 8 ? '✓' : '○'} Tối thiểu 8 ký tự
                                </span>
                                <span style={{ color: /[A-Z]/.test(regPassword) ? '#2e7d32' : 'var(--text-muted)' }}>
                                    {/[A-Z]/.test(regPassword) ? '✓' : '○'} Chứa ít nhất 1 chữ hoa
                                </span>
                                <span style={{ color: /\d/.test(regPassword) ? '#2e7d32' : 'var(--text-muted)' }}>
                                    {/\d/.test(regPassword) ? '✓' : '○'} Chứa ít nhất 1 chữ số
                                </span>
                                <span style={{ color: /[@$!%*?&]/.test(regPassword) ? '#2e7d32' : 'var(--text-muted)' }}>
                                    {/[@$!%*?&]/.test(regPassword) ? '✓' : '○'} Chứa ít nhất 1 ký tự đặc biệt (@$!%*?&)
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="input-field mb-4">
                        <label htmlFor="register-email">Email</label>
                        <input id="register-email" type="email" autoComplete="email" maxLength={150} value={email}
                            onChange={e => { setEmail(e.target.value); setOtp(''); setOtpNotice(''); }} placeholder="Email nhận mã xác thực" />
                    </div>
                    <div className="input-field mb-4">
                        <label htmlFor="register-otp">Mã xác thực</label>
                        <input id="register-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" />
                        <button className="secondary-btn" disabled={sending || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} onClick={() => void sendCode()}>
                            {sending ? 'Đang gửi mã…' : 'Gửi mã xác thực'}
                        </button>
                        {otpNotice && <p role="status">{otpNotice}</p>}
                    </div>
                    <button className="primary-btn w-100" disabled={!email || !/^\d{6}$/.test(otp)} onClick={() => handleRegisterSubmit(email.trim(), otp)}>Đăng Ký Tài Khoản</button>
                    <p style={{ textAlign: 'center', fontSize: '0.82rem', marginTop: '16px', color: 'var(--text-muted)' }}>
                        Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); setRegisterModalOpen(false); setLoginModalOpen(true); }}>Đăng nhập</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
