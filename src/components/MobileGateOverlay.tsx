import React, { useState } from 'react';

interface MobileGateOverlayProps {
    onBypass?: () => void;
}

export default function MobileGateOverlay({ onBypass }: MobileGateOverlayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="mobile-standalone-gate">
            <div className="mobile-gate-backdrop"></div>
            
            <div className="mobile-gate-container">
                {/* 1. TOP BRAND HEADER */}
                <header className="mobile-gate-header">
                    <div className="mobile-gate-brand-pill">
                        <span className="brand-dot"></span>
                        <span className="brand-kanji">無限文庫</span>
                        <span className="brand-sep">•</span>
                        <span className="brand-alphabet">MUGENBUNKO</span>
                    </div>
                </header>

                {/* 2. CENTER HERO VISUAL & APP SHOWCASE */}
                <div className="mobile-gate-content">
                    {/* Animated Phone Mockup */}
                    <div className="mobile-gate-phone-showcase">
                        <div className="phone-ambient-halo"></div>
                        <div className="phone-device-body">
                            <div className="phone-screen">
                                <div className="phone-screen-notch"></div>
                                <div className="phone-screen-header">
                                    <span>🌸 Mugen App</span>
                                    <span>100%</span>
                                </div>
                                <div className="phone-screen-book-preview">
                                    <div className="phone-mini-cover">
                                        <span>無限</span>
                                        <span>文庫</span>
                                    </div>
                                    <div className="phone-mini-info">
                                        <div className="phone-line-title"></div>
                                        <div className="phone-line-sub"></div>
                                        <div className="phone-line-bar">
                                            <div className="phone-line-fill"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="phone-screen-reader-lines">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                        <span className="phone-floating-badge">
                            ✨ Mobile App Coming Soon
                        </span>
                    </div>

                    {/* Headline & Description */}
                    <h1 className="mobile-gate-title">
                        Trải Nghiệm Tuyệt Vời Nhất Trên <span className="text-highlight">Máy Tính</span>
                    </h1>
                    
                    <p className="mobile-gate-desc">
                        Nền tảng MugenBunko hiện được xây dựng tối ưu hóa chuyên sâu cho <strong>Máy Tính (PC & Laptop)</strong> với Bàn làm việc tác giả, phòng điều hành và giao diện đọc cao cấp.
                    </p>

                    {/* 3-Bento Features Grid */}
                    <div className="mobile-gate-bento-grid">
                        <div className="mobile-gate-bento-item">
                            <span className="bento-icon">📥</span>
                            <div className="bento-text">
                                <strong>Đọc Offline</strong>
                                <small>Tải truyện không cần 4G</small>
                            </div>
                        </div>

                        <div className="mobile-gate-bento-item">
                            <span className="bento-icon">📖</span>
                            <div className="bento-text">
                                <strong>Lật Trang e-Reader</strong>
                                <small>Cử chỉ vuốt & Dark OLED</small>
                            </div>
                        </div>

                        <div className="mobile-gate-bento-item">
                            <span className="bento-icon">🔔</span>
                            <div className="bento-text">
                                <strong>Thông Báo Đẩy</strong>
                                <small>Báo chương mới tức thì</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. BOTTOM ACTIONS CLUSTER */}
                <footer className="mobile-gate-footer">
                    <button className="mobile-gate-primary-btn" onClick={handleCopyLink}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        {copied ? "✓ Đã sao chép liên kết web!" : "Sao chép link để mở trên PC"}
                    </button>

                    {onBypass && (
                        <button className="mobile-gate-bypass-link" onClick={onBypass}>
                            Tiếp tục xem bản Web trên điện thoại (Không khuyến nghị) →
                        </button>
                    )}

                    <span className="mobile-gate-copyright">
                        © 2026 MugenBunko • 無限文庫 Light Novel Platform
                    </span>
                </footer>
            </div>
        </div>
    );
}

