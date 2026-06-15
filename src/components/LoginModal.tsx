import React from 'react';

interface LoginModalProps {
    loginModalOpen: boolean;
    setLoginModalOpen: (open: boolean) => void;
    setRegisterModalOpen: (open: boolean) => void;
    loginUsername: string;
    setLoginUsername: (username: string) => void;
    loginPassword: string;
    setLoginPassword: (password: string) => void;
    handleLoginSubmit: () => void;
}

export default function LoginModal({
    loginModalOpen,
    setLoginModalOpen,
    setRegisterModalOpen,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    handleLoginSubmit
}: LoginModalProps) {
    if (!loginModalOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') setLoginModalOpen(false); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Đăng nhập MUGENBUNKO</h3>
                    <button className="close-btn" onClick={() => setLoginModalOpen(false)}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-field mb-4">
                        <label>Tên đăng nhập</label>
                        <input type="text" placeholder="Nhập tên đăng nhập..." value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
                    </div>
                    <div className="input-field mb-4">
                        <label>Mật khẩu</label>
                        <input type="password" placeholder="Nhập mật khẩu..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                    </div>
                    <button className="primary-btn w-100" onClick={handleLoginSubmit}>Đăng Nhập</button>
                    <p style={{textAlign:'center', fontSize:'0.82rem', marginTop:'16px', color:'var(--text-muted)'}}>
                        Chưa có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); setLoginModalOpen(false); setRegisterModalOpen(true); }}>Đăng ký ngay</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
