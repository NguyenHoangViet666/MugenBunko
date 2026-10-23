import { useState } from 'react';
import { passwordChecks } from '../utils/passwordPolicy';

export default function NewPasswordFields({ prefix, password, confirmation, onPassword, onConfirmation }: {
    prefix: string; password: string; confirmation: string; onPassword: (value: string) => void; onConfirmation: (value: string) => void;
}) {
    const [visible, setVisible] = useState(false);
    return <>
        <div className="auth-field"><label htmlFor={`${prefix}-password`}>Mật khẩu mới</label><div className="auth-password-field">
            <input id={`${prefix}-password`} name="newPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" required maxLength={72}
                value={password} onChange={event => onPassword(event.target.value)} aria-describedby={`${prefix}-requirements`} placeholder="Tạo mật khẩu mới" />
            <button type="button" className="auth-password-toggle" aria-label={visible ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'} aria-pressed={visible}
                onClick={() => setVisible(value => !value)}>{visible ? 'Ẩn' : 'Hiện'}</button>
        </div></div>
        <ul className="auth-password-requirements" id={`${prefix}-requirements`}>{passwordChecks(password).map(check =>
            <li key={check.label} className={check.valid ? 'met' : ''}><span aria-hidden="true">{check.valid ? '✓' : '○'}</span>{check.label}</li>)}</ul>
        <label className="auth-field" htmlFor={`${prefix}-confirm-password`}>Nhập lại mật khẩu mới<input id={`${prefix}-confirm-password`} name="confirmPassword"
            type={visible ? 'text' : 'password'} autoComplete="new-password" required maxLength={72} value={confirmation}
            onChange={event => onConfirmation(event.target.value)} placeholder="Nhập lại mật khẩu mới" /></label>
    </>;
}
