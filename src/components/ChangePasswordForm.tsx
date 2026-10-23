import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import NewPasswordFields from './NewPasswordFields';
import { passwordError } from '../utils/passwordPolicy';
import '../styles/auth.css';

export default function ChangePasswordForm({ email, changePassword }: { email?: string | null; changePassword: (currentPassword: string, newPassword: string) => Promise<void> }) {
    const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
    const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const lock = useRef(false), errorRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
    const submit = async (event: FormEvent) => {
        event.preventDefault(); if (lock.current) return;
        const validation = passwordError(password, confirmation);
        if (validation) { setError(validation); return; }
        if (current === password) { setError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
        lock.current = true; setBusy(true); setError('');
        try { await changePassword(current, password); setCurrent(''); setPassword(''); setConfirmation(''); }
        catch (error) { setError(error instanceof Error ? error.message : 'Chưa đổi được mật khẩu. Vui lòng thử lại.'); }
        finally { lock.current = false; setBusy(false); }
    };
    return <section className="password-security" aria-labelledby="password-security-title">
        <h3 className="section-title" id="password-security-title">Mật khẩu &amp; bảo mật</h3>
        <p className="password-security-description">{email ? `Email khôi phục: ${email}` : 'Tài khoản chưa có email đăng ký nên chưa thể khôi phục mật khẩu qua email.'}</p>
        {error && <div className="auth-error" ref={errorRef} tabIndex={-1} role="alert">{error}</div>}
        <form className="auth-form change-password-form" onSubmit={event => void submit(event)}>
            <fieldset disabled={busy}><legend className="auth-sr-only">Đổi mật khẩu tài khoản</legend>
                <div className="auth-field"><label htmlFor="change-current-password">Mật khẩu hiện tại</label><div className="auth-password-field">
                    <input id="change-current-password" name="currentPassword" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={200}
                        value={current} onChange={event => setCurrent(event.target.value)} placeholder="Nhập mật khẩu đang sử dụng" />
                    <button type="button" className="auth-password-toggle" aria-label={visible ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? 'Ẩn' : 'Hiện'}</button>
                </div></div>
                <NewPasswordFields prefix="change" password={password} confirmation={confirmation} onPassword={setPassword} onConfirmation={setConfirmation} />
                <p className="auth-field-hint auth-session-note">Sau khi đổi mật khẩu, bạn sẽ được đăng xuất và cần đăng nhập lại trên các thiết bị.</p>
                <button type="submit" className="primary-btn">{busy ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</button>
            </fieldset>
        </form>
    </section>;
}
