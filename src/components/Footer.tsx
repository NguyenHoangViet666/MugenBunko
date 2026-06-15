import React from 'react';
import { User } from '../types';

interface FooterProps {
    currentUser: User | null;
    setCurrentView: (view: string) => void;
    setActiveNovelId: (id: number | null) => void;
    setLoginModalOpen: (open: boolean) => void;
}

export default function Footer({
    currentUser,
    setCurrentView,
    setActiveNovelId,
    setLoginModalOpen
}: FooterProps) {
    return (
        <footer className="app-footer">
            <div className="container footer-grid">
                <div className="footer-info">
                    <span className="footer-logo">無限文庫 MUGENBUNKO</span>
                    <p>Chào mừng bạn tới với MugenBunko</p>
                </div>
                <div className="footer-links">
                    <h4>Khám phá</h4>
                    <ul>
                        <li><span onClick={() => { setCurrentView('home'); setActiveNovelId(null); }} style={{ cursor: 'pointer' }}>Thư viện truyện</span></li>
                        <li><span onClick={() => { setCurrentView('home'); setActiveNovelId(null); }} style={{ cursor: 'pointer' }}>Bảng xếp hạng</span></li>
                    </ul>
                </div>
                <div className="footer-links">
                    <h4>Dành cho Tác giả</h4>
                    <ul>
                        <li>{currentUser && currentUser.roles.includes('author') ? (
                            <span onClick={() => { setCurrentView('studio'); setActiveNovelId(null); }} style={{ cursor: 'pointer' }}>Bàn làm việc Studio</span>
                        ) : (
                            <span onClick={() => setLoginModalOpen(true)} style={{ cursor: 'pointer' }}>Đăng ký viết truyện</span>
                        )}</li>
                    </ul>
                </div>
                <div className="footer-links">
                    <h4>Điều khoản</h4>
                    <ul>
                        <li><span onClick={() => { setCurrentView('rules'); setActiveNovelId(null); }} style={{ cursor: 'pointer' }}>Quy định cộng đồng</span></li>
                        <li><a href="#">Bảo mật nội dung</a></li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2026 MUGENBUNKO.</p>
            </div>
        </footer>
    );
}
