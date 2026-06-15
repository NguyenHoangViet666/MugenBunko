import React from 'react';

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
    handleRegisterSubmit: () => void;
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
    handleRegisterSubmit
}: RegisterModalProps) {
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
                    </div>
                    <button className="primary-btn w-100" onClick={handleRegisterSubmit}>Đăng Ký Tài Khoản</button>
                    <p style={{ textAlign: 'center', fontSize: '0.82rem', marginTop: '16px', color: 'var(--text-muted)' }}>
                        Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); setRegisterModalOpen(false); setLoginModalOpen(true); }}>Đăng nhập</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
