import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icons } from '../components/Icons';
import { authHref } from '../utils/authNavigation';
import type { AuthMode } from '../utils/authNavigation';
import PasswordRecoveryForm from '../components/PasswordRecoveryForm';
import type { PasswordRecoveryProps } from '../components/PasswordRecoveryForm';
import '../styles/auth.css';

export interface LoginFields { username: string; password: string }
export interface RegisterFields extends LoginFields { displayname: string; email: string; otp: string }
interface Props {
    mode: AuthMode; returnTo: string; theme: string; onThemeChange: (theme: string) => void;
    onLogin: (fields: LoginFields) => Promise<void>; onRegister: (fields: RegisterFields) => Promise<void>;
    sendRegistrationOtp: (email: string) => Promise<string | undefined>;
    requestPasswordReset: PasswordRecoveryProps['requestPasswordReset']; resetPassword: PasswordRecoveryProps['resetPassword'];
    notice?: string;
}

export default function AuthPage({ mode, returnTo, theme, onThemeChange, onLogin, onRegister, sendRegistrationOtp, requestPasswordReset, resetPassword, notice }: Props) {
    const register = mode === 'register';
    const recovery = mode === 'forgot-password';
    const [login, setLogin] = useState<LoginFields>({ username: '', password: '' });
    const [registration, setRegistration] = useState<RegisterFields>({ username: '', displayname: '', password: '', email: '', otp: '' });
    const [confirmation, setConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const submitLock = useRef(false);
    const [sending, setSending] = useState(false);
    const sendLock = useRef(false);
    const [error, setError] = useState('');
    const [otpNotice, setOtpNotice] = useState('');
    const [resendAt, setResendAt] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const errorRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const password = register ? registration.password : login.password;
    const checks = [
        { label: 'Ít nhất 8 ký tự', valid: registration.password.length >= 8 },
        { label: 'Một chữ hoa', valid: /[A-Z]/.test(registration.password) },
        { label: 'Một chữ số', valid: /\d/.test(registration.password) },
        { label: 'Một ký tự đặc biệt', valid: /[^a-zA-Z0-9]/.test(registration.password) },
    ];
    useEffect(() => {
        const previousTitle = document.title;
        setError(''); setShowPassword(false);
        document.title = `${mode === 'login' ? 'Đăng nhập' : mode === 'forgot-password' ? 'Quên mật khẩu' : 'Đăng ký'} · MugenBunko`;
        headingRef.current?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
        return () => { document.title = previousTitle; };
    }, [mode]);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
    useEffect(() => {
        if (!resendAt) { setSeconds(0); return; }
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
            setSeconds(remaining); if (!remaining) setResendAt(0);
        };
        tick(); const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [resendAt]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (submitLock.current || sendLock.current) return;
        setError('');
        if (register && !checks.every(check => check.valid)) { setError('Mật khẩu cần ít nhất 8 ký tự, một chữ hoa, một chữ số và một ký tự đặc biệt.'); return; }
        if (register && new TextEncoder().encode(registration.password).length > 72) { setError('Mật khẩu quá dài. Hãy rút ngắn mật khẩu rồi thử lại.'); return; }
        if (register && registration.password !== confirmation) { setError('Mật khẩu nhập lại chưa khớp.'); return; }
        submitLock.current = true; setBusy(true);
        try { if (register) await onRegister(registration); else await onLogin(login); }
        catch (err) { setError(err instanceof Error ? err.message : 'Không thể kết nối. Vui lòng thử lại.'); }
        finally { submitLock.current = false; setBusy(false); }
    };
    const sendCode = async () => {
        if (sendLock.current || submitLock.current || seconds > 0) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim())) { setError('Nhập email hợp lệ để nhận mã xác thực.'); return; }
        sendLock.current = true; setSending(true); setError(''); setOtpNotice('');
        try {
            const code = await sendRegistrationOtp(registration.email.trim());
            if (code) setRegistration(current => ({ ...current, otp: code }));
            setOtpNotice(code ? 'Mã thử nghiệm đã được điền sẵn, có hiệu lực trong 5 phút. Chưa gửi email thật.' : 'Đã gửi mã đến email của bạn. Mã có hiệu lực trong 5 phút; hãy kiểm tra cả thư mục spam.');
            setResendAt(Date.now() + 60000);
        } catch (err) { setError(err instanceof Error ? err.message : 'Không thể gửi mã xác thực.'); }
        finally { sendLock.current = false; setSending(false); }
    };
    const togglePassword = <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}
        onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button>;

    return <div className={`auth-page auth-${mode}`}>
        <header className="auth-header"><a href="#/" className="auth-logo" aria-label="MugenBunko — Trang chủ"><span lang="ja">無限文庫</span><small>MUGENBUNKO</small></a>
            <nav aria-label="Điều hướng tài khoản"><button className="auth-theme-button" onClick={() => onThemeChange(theme === 'washi' ? 'charcoal' : theme === 'charcoal' ? 'sepia' : 'washi')}
                aria-label={`Đổi giao diện, hiện tại ${theme === 'washi' ? 'Washi' : theme === 'charcoal' ? 'Charcoal' : 'Sepia'}`}><Icons.Book size={17} /><span>{theme === 'washi' ? 'Washi' : theme === 'charcoal' ? 'Charcoal' : 'Sepia'}</span></button>
                <a className="auth-home-link" href="#/">← Về thư viện</a></nav></header>
        <main className="auth-layout">
            <section className="auth-story" aria-labelledby="auth-story-title"><div className="auth-story-content"><span className="auth-eyebrow">THƯ VIỆN CỦA NHỮNG THẾ GIỚI</span>
                <h2 id="auth-story-title">{register ? <>Câu chuyện mới,<br />bắt đầu cùng bạn.</> : <>Trở về trang sách.<br />Tiếp một giấc mơ.</>}</h2>
                <p>{register ? 'Một góc nhỏ để tìm truyện yêu thích, lưu lại những trang đang đọc và chia sẻ câu chuyện của riêng mình.' : 'Những câu chuyện yêu thích, trang sách còn dang dở và một chỗ ngồi quen đang chờ bạn.'}</p>
                <div className="auth-books" aria-hidden="true"><span className="auth-book book-one">物語<small>MUGEN</small></span><span className="auth-book book-two">夢<small>BUNKO</small></span><span className="auth-book book-three">春の記憶</span><span className="auth-book book-four">無限<small>STORIES</small></span><span className="auth-book book-five">旅</span></div>
                <div className="auth-story-caption"><span aria-hidden="true">栞</span><p>Mỗi dấu trang là một lời hẹn<br />với thế giới bạn yêu thích.</p></div>
            </div><div className="auth-story-footer"><span>Đọc · Lưu giữ · Sáng tác</span><span lang="ja" aria-hidden="true">あなたの物語</span></div></section>
            <section className="auth-form-section" aria-labelledby="auth-title"><div className="auth-form-wrap">
                <div className="auth-form-intro"><span className="auth-eyebrow">{recovery ? 'KHÔI PHỤC TÀI KHOẢN' : register ? 'MỞ MỘT TRANG MỚI' : 'CHÀO MỪNG TRỞ LẠI'}</span>
                    <h1 ref={headingRef} tabIndex={-1} id="auth-title">{recovery ? 'Quên mật khẩu?' : register ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
                    <p>{recovery ? 'Nhận mã qua email đăng ký và tạo mật khẩu mới cho tài khoản của bạn.' : register ? 'Tham gia MugenBunko để giữ những câu chuyện ở gần hơn.' : 'Đăng nhập để tiếp tục hành trình đọc của bạn.'}</p></div>
                <div className="auth-switch"><span>{recovery ? 'Đã nhớ mật khẩu?' : register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span><a href={authHref(register || recovery ? 'login' : 'register', returnTo)}
                    aria-disabled={busy || sending} onClick={event => { if (busy || sending) event.preventDefault(); }}>{register || recovery ? 'Đăng nhập' : 'Đăng ký ngay'} <span aria-hidden="true">↗</span></a></div>
                {recovery ? <PasswordRecoveryForm returnTo={returnTo} requestPasswordReset={requestPasswordReset} onBusyChange={setBusy} resetPassword={async fields => {
                    await resetPassword(fields);
                    setLogin(previous => ({ ...previous, password: '' }));
                    setRegistration(previous => ({ ...previous, password: '', otp: '' })); setConfirmation('');
                }} /> : <>
                {mode === 'login' && notice && <p className="auth-recovery-notice" role="status">{notice}</p>}
                {error && <div ref={errorRef} className="auth-error" role="alert" tabIndex={-1}>{error}</div>}
                <form className="auth-form" onSubmit={event => void submit(event)}>
                    <fieldset disabled={busy || sending}><legend className="auth-sr-only">{register ? 'Thông tin đăng ký' : 'Thông tin đăng nhập'}</legend>
                        {register ? <div className="auth-name-grid"><label className="auth-field" htmlFor="register-username">Tên đăng nhập<input id="register-username" name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_]{3,50}" autoComplete="username" autoCapitalize="none" spellCheck={false}
                            value={registration.username} onChange={event => setRegistration(current => ({ ...current, username: event.target.value }))} placeholder="Tên của bạn" aria-describedby="auth-username-hint" /></label>
                            <label className="auth-field" htmlFor="register-displayname">Tên hiển thị<input id="register-displayname" name="displayname" required maxLength={100} autoComplete="nickname" value={registration.displayname}
                                onChange={event => setRegistration(current => ({ ...current, displayname: event.target.value }))} placeholder="Bạn muốn được gọi là gì?" /></label>
                            <p id="auth-username-hint" className="auth-field-hint">Tên đăng nhập gồm 3–50 chữ cái không dấu, số hoặc dấu gạch dưới.</p></div> :
                            <label className="auth-field" htmlFor="login-username">Tên đăng nhập hoặc email<input id="login-username" name="username" required maxLength={150} autoComplete="username" autoCapitalize="none" spellCheck={false} value={login.username}
                                onChange={event => setLogin(current => ({ ...current, username: event.target.value }))} placeholder="Tên đăng nhập hoặc email của bạn" /></label>}
                        {register && <label className="auth-field" htmlFor="register-email">Email<input id="register-email" name="email" type="email" required autoComplete="email" maxLength={150} value={registration.email}
                            onChange={event => { setRegistration(current => ({ ...current, email: event.target.value, otp: '' })); setOtpNotice(''); setResendAt(0); }} placeholder="ban@example.com" /></label>}
                        <div className="auth-field"><label htmlFor={register ? 'register-password' : 'login-password'}>Mật khẩu</label><div className="auth-password-field"><input id={register ? 'register-password' : 'login-password'} name="password" type={showPassword ? 'text' : 'password'} required maxLength={register ? 72 : 200}
                            autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => register ? setRegistration(current => ({ ...current, password: event.target.value })) : setLogin(current => ({ ...current, password: event.target.value }))}
                            placeholder={register ? 'Tạo mật khẩu của bạn' : 'Nhập mật khẩu'} aria-describedby={register ? 'auth-password-requirements' : undefined} />{togglePassword}</div></div>
                        {register && <><ul className="auth-password-requirements" id="auth-password-requirements">{checks.map(check => <li key={check.label} className={check.valid ? 'met' : ''}><span aria-hidden="true">{check.valid ? '✓' : '○'}</span>{check.label}</li>)}</ul>
                            <label className="auth-field" htmlFor="register-confirm-password">Nhập lại mật khẩu<input id="register-confirm-password" name="confirm-password" type={showPassword ? 'text' : 'password'} required maxLength={72} autoComplete="new-password" value={confirmation}
                                onChange={event => setConfirmation(event.target.value)} placeholder="Nhập lại mật khẩu vừa tạo" /></label>
                            <div className="auth-verification"><div className="auth-verification-heading"><label htmlFor="register-otp">Xác thực email</label><span>6 chữ số</span></div>
                                <div className="auth-otp-row"><input id="register-otp" name="otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={registration.otp}
                                    onChange={event => setRegistration(current => ({ ...current, otp: event.target.value.replace(/\D/g, '') }))} placeholder="000000" aria-describedby="auth-otp-notice" />
                                    <button type="button" className="outline-btn" disabled={sending || seconds > 0 || !registration.email.trim()} onClick={() => void sendCode()}>{sending ? 'Đang gửi…' : seconds > 0 ? `Gửi lại sau ${seconds}s` : 'Gửi mã xác thực'}</button></div>
                                <p id="auth-otp-notice" className="auth-field-hint" role="status">{otpNotice || 'Nhận mã tại email ở trên để hoàn tất đăng ký.'}</p></div></>}
                        {!register && <div className="auth-forgot-link"><a href={authHref('forgot-password', returnTo)} aria-disabled={busy || sending}
                            onClick={event => { if (busy || sending) event.preventDefault(); }}>Quên mật khẩu?</a></div>}
                        <button type="submit" className="primary-btn auth-submit" disabled={busy || sending || (register && !/^\d{6}$/.test(registration.otp))}>{busy ? (register ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…') : register ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}<span aria-hidden="true">→</span></button>
                    </fieldset>
                </form>
                <p className="auth-after-form">{register ? 'Muốn viết truyện? Bạn có thể đăng ký quyền tác giả trong hồ sơ sau khi tạo tài khoản.' : 'Tủ sách và tiến độ đọc sẽ được đồng bộ khi bạn đăng nhập.'}</p>
                </>}
                <footer className="auth-form-footer"><span>© {new Date().getFullYear()} MugenBunko</span><a href="#/rules" target="_blank" rel="noopener noreferrer" aria-label="Quy định cộng đồng (mở tab mới)">Quy định cộng đồng ↗</a><a href="#/about">Về MugenBunko</a></footer>
            </div></section>
        </main>
    </div>;
}
