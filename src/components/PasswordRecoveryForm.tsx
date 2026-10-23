import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authHref } from '../utils/authNavigation';
import { passwordError } from '../utils/passwordPolicy';
import NewPasswordFields from './NewPasswordFields';

export interface ResetPasswordFields { email: string; otp: string; newPassword: string }
export interface PasswordRecoveryProps {
    returnTo: string;
    requestPasswordReset: (email: string) => Promise<{ message: string; devOtp?: string }>;
    resetPassword: (fields: ResetPasswordFields) => Promise<void>;
    onBusyChange: (busy: boolean) => void;
}

export default function PasswordRecoveryForm({ returnTo, requestPasswordReset, resetPassword, onBusyChange }: PasswordRecoveryProps) {
    const [email, setEmail] = useState(''), [otp, setOtp] = useState('');
    const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
    const [requested, setRequested] = useState(false), [complete, setComplete] = useState(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [resendAt, setResendAt] = useState(0), [seconds, setSeconds] = useState(0);
    const lock = useRef(false), errorRef = useRef<HTMLDivElement>(null), codeRef = useRef<HTMLInputElement>(null), successRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
    useEffect(() => { if (requested) codeRef.current?.focus(); }, [requested]);
    useEffect(() => { if (complete) successRef.current?.focus(); }, [complete]);
    useEffect(() => {
        if (!resendAt) { setSeconds(0); return; }
        const tick = () => { const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)); setSeconds(remaining); if (!remaining) setResendAt(0); };
        tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
    }, [resendAt]);
    const begin = () => { lock.current = true; setBusy(true); onBusyChange(true); setError(''); };
    const finish = () => { lock.current = false; setBusy(false); onBusyChange(false); };
    const request = async () => {
        if (lock.current || seconds > 0) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Nhập email đã dùng khi đăng ký tài khoản.'); return; }
        begin();
        try {
            const data = await requestPasswordReset(email.trim());
            setOtp(data.devOtp || ''); setRequested(true); setResendAt(Date.now() + 60000);
            setNotice(data.devOtp ? 'Mã thử nghiệm đã được điền sẵn. Chưa gửi email thật.' : data.message);
        } catch (error) { setError(error instanceof Error ? error.message : 'Chưa gửi được yêu cầu. Vui lòng thử lại.'); }
        finally { finish(); }
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!requested) { await request(); return; }
        if (lock.current) return;
        const validation = passwordError(password, confirmation);
        if (validation) { setError(validation); return; }
        if (!/^\d{6}$/.test(otp)) { setError('Nhập mã khôi phục 6 số trong email.'); return; }
        begin();
        try {
            await resetPassword({ email: email.trim(), otp, newPassword: password });
            setPassword(''); setConfirmation(''); setOtp(''); setComplete(true);
        } catch (error) { setError(error instanceof Error ? error.message : 'Chưa đặt lại được mật khẩu. Vui lòng thử lại.'); }
        finally { finish(); }
    };
    if (complete) return <div className="auth-success" ref={successRef} tabIndex={-1} role="status">
        <h2>Đã đặt lại mật khẩu</h2><p>Các phiên đăng nhập cũ đã hết hiệu lực. Đăng nhập bằng mật khẩu mới để trở lại trang bạn đang xem.</p>
        <a className="primary-btn auth-submit" href={authHref('login', returnTo)}>Đăng nhập lại <span aria-hidden="true">→</span></a>
    </div>;
    return <>
        <p className="auth-recovery-step">Bước {requested ? '2 / 2 · Tạo mật khẩu mới' : '1 / 2 · Xác nhận email'}</p>
        {error && <div className="auth-error" ref={errorRef} tabIndex={-1} role="alert">{error}</div>}
        <form className="auth-form password-recovery-form" onSubmit={event => void submit(event)}>
            <fieldset disabled={busy}><legend className="auth-sr-only">Khôi phục mật khẩu</legend>
                <label className="auth-field" htmlFor="recovery-email">Email đăng ký<input id="recovery-email" type="email" autoComplete="email" maxLength={150} required readOnly={requested}
                    value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" /></label>
                {requested && <>
                    <div className="auth-recovery-notice" role="status">{notice}</div>
                    <label className="auth-field" htmlFor="recovery-otp">Mã khôi phục<input id="recovery-otp" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                        required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" /></label>
                    <NewPasswordFields prefix="recovery" password={password} confirmation={confirmation} onPassword={setPassword} onConfirmation={setConfirmation} />
                    <p className="auth-field-hint auth-session-note">Sau khi đặt lại mật khẩu, các phiên cũ sẽ hết hiệu lực. Bạn cần đăng nhập lại trên các thiết bị.</p>
                </>}
                <button type="submit" className="primary-btn auth-submit">{busy ? (requested ? 'Đang đặt lại…' : 'Đang gửi yêu cầu…') : requested ? 'Đặt lại mật khẩu' : 'Gửi mã khôi phục'}<span aria-hidden="true">→</span></button>
                {requested && <div className="auth-recovery-actions"><button type="button" className="auth-text-button" disabled={seconds > 0} onClick={() => void request()}>{seconds > 0 ? `Gửi lại sau ${seconds}s` : 'Gửi lại mã'}</button>
                    <button type="button" className="auth-text-button" onClick={() => { setRequested(false); setOtp(''); setPassword(''); setConfirmation(''); setResendAt(0); setNotice(''); setError(''); }}>Đổi email</button></div>}
            </fieldset>
        </form>
        {!requested && <p className="auth-after-form">Bạn cần truy cập được hộp thư đã đăng ký để nhận mã. Mã khôi phục có hiệu lực trong 5 phút.</p>}
    </>;
}
