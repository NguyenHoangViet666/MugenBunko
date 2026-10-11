import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../components/Icons';

interface AboutProps {
    setCurrentView: (view: string) => void;
    openNovelDetail?: (id: number) => void;
}

export default function About({ setCurrentView }: AboutProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [activeTechTab, setActiveTechTab] = useState<'frontend' | 'backend' | 'realtime' | 'philosophy'>('frontend');
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isQuoteFading, setIsQuoteFading] = useState(false);

    // Quotes for Infinite Wisdom generator
    const quotes = [
        {
            text: "Một tác phẩm đích thực không kết thúc khi trang sách khép lại, mà bắt đầu sống dậy trong trí tưởng tượng bất tận của người đọc.",
            author: "Nguyễn Hoàng Việt (HYUTE)",
            tag: "Triết lý Mugen"
        },
        {
            text: "Trong một thế giới đầy tiếng ồn và thương mại hóa xô bồ, một trang giấy sạch và một câu chuyện chân thành là chốn bình yên quý giá nhất.",
            author: "MugenBunko Manifesto",
            tag: "Không gian đọc thuần khiết"
        },
        {
            text: "Mỗi tác giả đều là một nhà kiến tạo thế giới. Nhiệm vụ của MugenBunko là trao cho bạn ngòi bút sắc bén nhất và tự do tuyệt đối để sáng tạo.",
            author: "Hội Đồng Văn Hữu Mugen",
            tag: "Tự do sáng tác"
        },
        {
            text: "Chữ nghĩa là chiếc cầu nối xuyên qua thời gian và không gian, đưa những tâm hồn cô đơn tìm thấy sự đồng điệu nơi vô hạn.",
            author: "Lời tựa Mugen Vol. 1",
            tag: "Kết nối tâm hồn"
        }
    ];

    const cycleQuote = () => {
        setIsQuoteFading(true);
        setTimeout(() => {
            setQuoteIndex((prev) => (prev + 1) % quotes.length);
            setIsQuoteFading(false);
        }, 250);
    };

    // Canvas background effect: Floating Japanese Calligraphy glyphs & constellation particles
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
        let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

        const handleResize = () => {
            if (!canvas || !canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
        };

        window.addEventListener('resize', handleResize);

        // Particle configuration
        const kanjiList = ['無', '限', '文', '庫', '墨', '夢', '道', '心', '語', '魂', '書', '創', '星', '風'];
        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
            char: string;
            isKanji: boolean;
            rot: number;
            rotSpeed: number;
        }> = [];

        const count = Math.min(Math.floor(width / 35), 45);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -Math.random() * 0.45 - 0.15,
                size: Math.random() * 16 + 12,
                opacity: Math.random() * 0.35 + 0.1,
                char: kanjiList[Math.floor(Math.random() * kanjiList.length)],
                isKanji: Math.random() > 0.45,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008
            });
        }

        let mouseX = -1000;
        let mouseY = -1000;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Get computed style for adaptive color
            const isDark = document.body.classList.contains('theme-charcoal') || document.documentElement.getAttribute('data-theme') === 'charcoal';
            const inkColor = isDark ? 'rgba(255, 255, 255,' : 'rgba(30, 30, 30,';

            // Connect lines between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 90) {
                        const alpha = (1 - dist / 90) * 0.12;
                        ctx.strokeStyle = `${inkColor}${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Update & render particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Mouse interaction repulsion
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    const force = (120 - dist) / 120;
                    p.x += (dx / dist) * force * 1.8;
                    p.y += (dy / dist) * force * 1.8;
                }

                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotSpeed;

                // Wrap around bounds
                if (p.y < -30) {
                    p.y = height + 30;
                    p.x = Math.random() * width;
                }
                if (p.x < -30) p.x = width + 30;
                if (p.x > width + 30) p.x = -30;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);

                if (p.isKanji) {
                    ctx.font = `600 ${p.size}px "Noto Serif JP", "Songti SC", "SimSun", serif`;
                    ctx.fillStyle = `${inkColor}${p.opacity})`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(p.char, 0, 0);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.12, 0, Math.PI * 2);
                    ctx.fillStyle = `${inkColor}${p.opacity * 1.2})`;
                    ctx.fill();
                }

                ctx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // 3D Card Hover Tilt handler
    const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div className="about-page-container">
            {/* HERO HERO SECTION WITH INTERACTIVE CANVAS */}
            <div className="about-hero-section">
                <canvas ref={canvasRef} className="about-hero-canvas" />

                <div className="about-hero-content">
                    <div className="about-badge-pill">
                        <span className="about-badge-dot"></span>
                        <Icons.Sparkles size={14} />
                        <span>無限文庫 • The Infinite Literary Realm</span>
                    </div>

                    <h1 className="about-hero-title">
                        Nơi Mỗi Trang Sách Là Một Vũ Trụ <span className="about-gradient-text">Không Điểm Dừng</span>
                    </h1>

                    <p className="about-hero-subtitle">
                        MugenBunko (無限文庫) được kiến tạo từ khát vọng xây dựng một thánh địa văn học ánh sáng,
                        nơi ngòi bút sáng tác được trao tự do tối thượng, và độc giả được đắm chìm trong vẻ đẹp thuần khiết
                        của triết lý thiết kế Bento Nhật Bản.
                    </p>

                    <div className="about-hero-actions">
                        <button className="primary-btn large" onClick={() => setCurrentView('explore')}>
                            <Icons.Compass size={18} />
                            <span>Khám Phá Kho Tác Phẩm</span>
                        </button>
                        <button className="outline-btn large" onClick={() => setCurrentView('rules')}>
                            <Icons.Shield size={18} />
                            <span>Quy Chuẩn Nền Tảng</span>
                        </button>
                    </div>

                    {/* Stats Ticker */}
                    <div className="about-stats-ticker">
                        <div className="about-ticker-item">
                            <span className="about-ticker-num">100%</span>
                            <span className="about-ticker-label">Phi thương mại</span>
                        </div>
                        <div className="about-ticker-divider"></div>
                        <div className="about-ticker-item">
                            <span className="about-ticker-num">0%</span>
                            <span className="about-ticker-label">Quảng cáo rác</span>
                        </div>
                        <div className="about-ticker-divider"></div>
                        <div className="about-ticker-item">
                            <span className="about-ticker-num">100%</span>
                            <span className="about-ticker-label">Tác quyền tác giả</span>
                        </div>
                        <div className="about-ticker-divider"></div>
                        <div className="about-ticker-item">
                            <span className="about-ticker-num">Zen</span>
                            <span className="about-ticker-label">Washi / Charcoal</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 1: TỨ ĐẠI TRỤ CỘT BENTO */}
            <div className="about-section">
                <div className="about-section-header">
                    <span className="about-section-kicker">Triết lý cốt lõi</span>
                    <h2 className="about-section-heading">Tứ Đại Trụ Cột MugenBunko</h2>
                    <p className="about-section-desc">Bốn nguyên tắc bất di bất dịch định hình nên linh hồn và trải nghiệm của nền tảng.</p>
                </div>

                <div className="about-pillars-grid">
                    {/* Pillar 1 */}
                    <div className="about-pillar-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-pillar-watermark">創</div>
                        <div className="about-pillar-icon-box">
                            <Icons.Feather size={24} />
                        </div>
                        <div className="about-pillar-body">
                            <span className="about-pillar-label">Trụ cột I</span>
                            <h3 className="about-pillar-title">Tôn Trọng Tác Quyền Tuyệt Đối</h3>
                            <p className="about-pillar-text">
                                Bạn giữ 100% quyền sở hữu trí tuệ đối với các tác phẩm bạn viết. MugenBunko tuyệt đối không chiếm hữu, không ép buộc hợp đồng thương mại ngặt nghèo và không can thiệp vào định hướng nghệ thuật của bạn.
                            </p>
                        </div>
                        <div className="about-pillar-footer">
                            <span className="about-pillar-tag">100% Thuộc Về Tác Giả</span>
                        </div>
                    </div>

                    {/* Pillar 2 */}
                    <div className="about-pillar-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-pillar-watermark">純</div>
                        <div className="about-pillar-icon-box">
                            <Icons.Book size={24} />
                        </div>
                        <div className="about-pillar-body">
                            <span className="about-pillar-label">Trụ cột II</span>
                            <h3 className="about-pillar-title">Trải Nghiệm Đọc Thuần Khiết</h3>
                            <p className="about-pillar-text">
                                Nói không với banner quảng cáo giật gân, pop-up phiền toái. Hệ thống phông chữ serif/sans chuẩn mực, hỗ trợ giấy Washi, màu Sepia cổ điển và đêm than Charcoal giúp bạn tập trung trọn vẹn vào từng con chữ.
                            </p>
                        </div>
                        <div className="about-pillar-footer">
                            <span className="about-pillar-tag">Zen Reader Experience</span>
                        </div>
                    </div>

                    {/* Pillar 3 */}
                    <div className="about-pillar-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-pillar-watermark">結</div>
                        <div className="about-pillar-icon-box">
                            <Icons.Users size={24} />
                        </div>
                        <div className="about-pillar-body">
                            <span className="about-pillar-label">Trụ cột III</span>
                            <h3 className="about-pillar-title">Cộng Đồng Văn Hữu Sôi Nổi</h3>
                            <p className="about-pillar-text">
                                Hệ thống cấp bậc Wibu, danh hiệu vinh danh, diễn đàn thảo luận sâu sắc và phòng trò chuyện thời gian thực. Độc giả và tác giả cùng gắn kết, đóng góp ý kiến xây dựng và nâng đỡ lẫn nhau.
                            </p>
                        </div>
                        <div className="about-pillar-footer">
                            <span className="about-pillar-tag">Văn Khí & Tương Tác</span>
                        </div>
                    </div>

                    {/* Pillar 4 */}
                    <div className="about-pillar-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-pillar-watermark">極</div>
                        <div className="about-pillar-icon-box">
                            <Icons.Zap size={24} />
                        </div>
                        <div className="about-pillar-body">
                            <span className="about-pillar-label">Trụ cột IV</span>
                            <h3 className="about-pillar-title">Kỹ Thuật Hiện Đại & Tối Ưu</h3>
                            <p className="about-pillar-text">
                                Vận hành trên nền tảng React 19 siêu tốc, kiến trúc cơ sở dữ liệu quan hệ mạnh mẽ, WebSocket đồng bộ tức thì, cùng thiết kế Bento Box tối ưu thích ứng từ màn hình di động nhỏ nhất tới màn hình siêu rộng.
                            </p>
                        </div>
                        <div className="about-pillar-footer">
                            <span className="about-pillar-tag">Hiệu Năng Vượt Trội</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: INTERACTIVE TECH STACK & ARCHITECTURE MATRIX */}
            <div className="about-section">
                <div className="about-section-header">
                    <span className="about-section-kicker">Công nghệ chế tác</span>
                    <h2 className="about-section-heading">Kiến Trúc Hệ Thống MugenBunko</h2>
                    <p className="about-section-desc">Được xây dựng bằng sự tỉ mỉ của các công nghệ hiện đại nhất để mang lại tốc độ mượt mà.</p>
                </div>

                <div className="about-tech-matrix-bento" onMouseMove={handleCardMouseMove}>
                    {/* Left: Nav Tabs */}
                    <div className="about-tech-nav">
                        <button
                            className={`about-tech-tab ${activeTechTab === 'frontend' ? 'active' : ''}`}
                            onClick={() => setActiveTechTab('frontend')}
                        >
                            <Icons.Globe size={18} />
                            <div>
                                <strong>Giao Diện & Trải Nghiệm</strong>
                                <span>React 19, Vite, Bento CSS</span>
                            </div>
                        </button>

                        <button
                            className={`about-tech-tab ${activeTechTab === 'backend' ? 'active' : ''}`}
                            onClick={() => setActiveTechTab('backend')}
                        >
                            <Icons.Cpu size={18} />
                            <div>
                                <strong>Máy Chủ & Lưu Trữ</strong>
                                <span>Node.js, Express, MySQL 8.0</span>
                            </div>
                        </button>

                        <button
                            className={`about-tech-tab ${activeTechTab === 'realtime' ? 'active' : ''}`}
                            onClick={() => setActiveTechTab('realtime')}
                        >
                            <Icons.Activity size={18} />
                            <div>
                                <strong>Thời Gian Thực</strong>
                                <span>Socket.IO, Live Ticker, Sync</span>
                            </div>
                        </button>

                        <button
                            className={`about-tech-tab ${activeTechTab === 'philosophy' ? 'active' : ''}`}
                            onClick={() => setActiveTechTab('philosophy')}
                        >
                            <Icons.Terminal size={18} />
                            <div>
                                <strong>Quy Chuẩn Thẩm Mỹ</strong>
                                <span>Monochrome SVG, Washi Tokens</span>
                            </div>
                        </button>
                    </div>

                    {/* Right: Interactive Spec Sheet */}
                    <div className="about-tech-detail-panel">
                        {activeTechTab === 'frontend' && (
                            <div className="about-tech-content-block">
                                <div className="about-tech-chip">
                                    <Icons.CheckCircle size={14} /> Tối Ưu Client-Side
                                </div>
                                <h3 className="about-tech-title">Kiến Trúc Frontend Phản Ứng Siêu Tốc</h3>
                                <p className="about-tech-desc">
                                    Ứng dụng ứng dụng React 19 kết hợp trình dựng Vite cực nhanh. Hệ thống Bento Box được xây dựng bằng <strong>CSS thuần (Vanilla CSS)</strong> kết hợp CSS Custom Properties, giúp tùy biến bảng màu tức thì mà không phụ thuộc vào các thư viện cồng kềnh.
                                </p>
                                <div className="about-tech-specs-grid">
                                    <div className="about-spec-box">
                                        <span className="spec-title">Tốc độ tải đầu trang</span>
                                        <span className="spec-val">&lt; 0.4s</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Tần số làm tươi Canvas</span>
                                        <span className="spec-val">60 FPS Smooth</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Chế độ hiển thị</span>
                                        <span className="spec-val">Washi / Sepia / Charcoal</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Định dạng Icon</span>
                                        <span className="spec-val">100% SVG Line-Art</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTechTab === 'backend' && (
                            <div className="about-tech-content-block">
                                <div className="about-tech-chip">
                                    <Icons.Shield size={14} /> Bền Vững & Toàn Vẹn
                                </div>
                                <h3 className="about-tech-title">Backend Mạnh Mẽ Với MySQL 8.0</h3>
                                <p className="about-tech-desc">
                                    Xử lý logic nghiệp vụ bằng Express với cơ chế Connection Pooling, mã hóa mật khẩu chuẩn BCrypt, hỗ trợ phân quyền đa cấp chặt chẽ (Reader, Author, Moderator, Admin). Dữ liệu tác phẩm và các tập chương được bảo vệ toàn vẹn.
                                </p>
                                <div className="about-tech-specs-grid">
                                    <div className="about-spec-box">
                                        <span className="spec-title">Hệ quản trị CSDL</span>
                                        <span className="spec-val">MySQL 8.0 InnoDB</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Cơ chế xác thực</span>
                                        <span className="spec-val">JWT & Session Token</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Tự động nén ảnh bìa</span>
                                        <span className="spec-val">WebP Canvas Optimizer</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Độ tin cậy dữ liệu</span>
                                        <span className="spec-val">99.9% Uptime</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTechTab === 'realtime' && (
                            <div className="about-tech-content-block">
                                <div className="about-tech-chip">
                                    <Icons.Zap size={14} /> Tức Thời & Sống Động
                                </div>
                                <h3 className="about-tech-title">Mạng Lưới Tương Tác Socket Thời Gian Thực</h3>
                                <p className="about-tech-desc">
                                    MugenBunko không phải là trang đọc sách tĩnh. Các hoạt động như bình luận chân chương, phản hồi bài viết diễn đàn, thông báo chương mới từ tác giả được đẩy tức thời qua kênh truyền Socket.IO, mang lại sức sống cho toàn bộ cộng đồng.
                                </p>
                                <div className="about-tech-specs-grid">
                                    <div className="about-spec-box">
                                        <span className="spec-title">Kênh truyền WebSocket</span>
                                        <span className="spec-val">Socket.IO 4.x</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Độ trễ thông báo</span>
                                        <span className="spec-val">&lt; 50ms</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Chat Widget</span>
                                        <span className="spec-val">Real-time Encrypted</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Đồng bộ đọc dở</span>
                                        <span className="spec-val">Tự động lưu tiến độ</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTechTab === 'philosophy' && (
                            <div className="about-tech-content-block">
                                <div className="about-tech-chip">
                                    <Icons.Sparkles size={14} /> Bản Sắc Nhật Bản
                                </div>
                                <h3 className="about-tech-title">Kỷ Luật Thẩm Mỹ Đơn Sắc (Monochrome Design)</h3>
                                <p className="about-tech-desc">
                                    Toàn bộ hệ thống giao diện loại trừ các biểu tượng emoji có màu sặc sỡ gây phân tâm. Mọi icon đều là vector nét mảnh (Line SVG) với biến màu `currentColor` biến chuyển hài hòa giữa các sắc độ xám Washi và đen tuyền Charcoal.
                                </p>
                                <div className="about-tech-specs-grid">
                                    <div className="about-spec-box">
                                        <span className="spec-title">Bảng màu chính</span>
                                        <span className="spec-val">Washi, Charcoal, Sepia</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Quy chuẩn Icon</span>
                                        <span className="spec-val">100% Monochrome Line</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Mô phỏng sách 3D</span>
                                        <span className="spec-val">Realistic Spine Texture</span>
                                    </div>
                                    <div className="about-spec-box">
                                        <span className="spec-title">Phong cách bố cục</span>
                                        <span className="spec-val">Japanese Bento Box</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 3: CHRONICLE / DÒNG THỜI GIAN PHÁT TRIỂN */}
            <div className="about-section">
                <div className="about-section-header">
                    <span className="about-section-kicker">Hành trình kiến tạo</span>
                    <h2 className="about-section-heading">Biên Niên Sử MugenBunko</h2>
                    <p className="about-section-desc">Những dấu mốc quan trọng trong sự tiến hóa của Thư Viện Vô Hạn.</p>
                </div>

                <div className="about-timeline-container">
                    <div className="about-timeline-line"></div>

                    {/* Milestone 1 */}
                    <div className="about-timeline-item">
                        <div className="about-timeline-dot">
                            <Icons.Book size={14} />
                        </div>
                        <div className="about-timeline-card" onMouseMove={handleCardMouseMove}>
                            <span className="about-timeline-date">Tháng 09/2024</span>
                            <h4 className="about-timeline-title">Khởi Nguyên Ý Tưởng & Triết Lý Washi</h4>
                            <p className="about-timeline-text">
                                Nhận thấy các trang web truyện tràn lan quảng cáo độc hại và giao diện rối rắm, ý tưởng về MugenBunko ra đời với mục tiêu duy nhất: một không gian đọc tiểu thuyết sạch, thanh tịnh và hoàn toàn phi thương mại.
                            </p>
                        </div>
                    </div>

                    {/* Milestone 2 */}
                    <div className="about-timeline-item">
                        <div className="about-timeline-dot">
                            <Icons.Layers size={14} />
                        </div>
                        <div className="about-timeline-card" onMouseMove={handleCardMouseMove}>
                            <span className="about-timeline-date">Tháng 04/2025</span>
                            <h4 className="about-timeline-title">Kiến Trúc Bento & Bộ Công Cụ Tác Giả</h4>
                            <p className="about-timeline-text">
                                Chuyển mình ngoạn mục với phong cách Bento Box Nhật Bản, bìa sách mô phỏng gáy sách 3D, và ra mắt Studio Sáng Tác đa tầng hỗ trợ phân quyển, chương và hẹn giờ phát hành.
                            </p>
                        </div>
                    </div>

                    {/* Milestone 3 */}
                    <div className="about-timeline-item">
                        <div className="about-timeline-dot">
                            <Icons.MessageSquare size={14} />
                        </div>
                        <div className="about-timeline-card" onMouseMove={handleCardMouseMove}>
                            <span className="about-timeline-date">Tháng 01/2026</span>
                            <h4 className="about-timeline-title">Mạng Xã Hội Văn Hữu & Diễn Đàn Thảo Luận</h4>
                            <p className="about-timeline-text">
                                Khai mở Diễn Đàn Thảo Luận văn học, tích hợp kết bạn, khung viền danh hiệu cấp bậc Wibu, và cơ chế đánh giá nghiêm cẩn (chỉ đánh giá khi đã đọc đủ số chương).
                            </p>
                        </div>
                    </div>

                    {/* Milestone 4 */}
                    <div className="about-timeline-item">
                        <div className="about-timeline-dot future">
                            <Icons.Sparkles size={14} />
                        </div>
                        <div className="about-timeline-card future" onMouseMove={handleCardMouseMove}>
                            <span className="about-timeline-date">Tương Lai Vô Hạn</span>
                            <h4 className="about-timeline-title">Hệ Sinh Thái Toàn Diện & Trợ Lý Giọng Đọc AI</h4>
                            <p className="about-timeline-text">
                                Tiếp tục phát triển các tính năng Gamification, hệ thống Huy hiệu Thành tựu, điểm danh nhận quà và ứng dụng giọng đọc AI tự nhiên mang lại trải nghiệm đa giác quan cho độc giả.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 4: INFINITE WISDOM & MANIFESTO QUOTE GENERATOR */}
            <div className="about-section">
                <div className="about-wisdom-bento" onMouseMove={handleCardMouseMove}>
                    <div className="about-wisdom-watermark">言葉</div>

                    <div className="about-wisdom-header">
                        <span className="about-wisdom-badge">
                            <Icons.Quote size={14} />
                            <span>Trích đoạn truyền cảm hứng</span>
                        </span>
                        <button className="about-wisdom-refresh-btn" onClick={cycleQuote} title="Đổi trích dẫn khác">
                            <Icons.RefreshCw size={14} />
                            <span>Đổi cảm hứng</span>
                        </button>
                    </div>

                    <div className={`about-wisdom-content ${isQuoteFading ? 'fade-out' : 'fade-in'}`}>
                        <p className="about-wisdom-quote">
                            "{quotes[quoteIndex].text}"
                        </p>
                        <div className="about-wisdom-meta">
                            <div className="about-wisdom-author">
                                <Icons.User size={14} />
                                <strong>{quotes[quoteIndex].author}</strong>
                            </div>
                            <span className="about-wisdom-tag">{quotes[quoteIndex].tag}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 5: CREATOR & COMMUNITY TRIBUTE */}
            <div className="about-section">
                <div className="about-section-header">
                    <span className="about-section-kicker">Người đứng sau trang sách</span>
                    <h2 className="about-section-heading">Đội Ngũ & Tri Ân Cộng Đồng</h2>
                    <p className="about-section-desc">Tạo tác bằng tất cả đam mê đối với văn hóa đọc và công nghệ.</p>
                </div>

                <div className="about-team-grid">
                    {/* Creator Card */}
                    <div className="about-team-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-team-avatar-wrap">
                            <img
                                src="https://api.dicebear.com/7.x/adventurer/svg?seed=VietNguyen"
                                alt="Nguyễn Hoàng Việt"
                                className="about-team-avatar"
                            />
                            <span className="about-team-crown-badge">
                                <Icons.Crown size={14} />
                            </span>
                        </div>
                        <div className="about-team-info">
                            <h3 className="about-team-name">Nguyễn Hoàng Việt (HYUTE)</h3>
                            <span className="about-team-role">Founder &amp; Lead System Architect</span>
                            <p className="about-team-bio">
                                Đam mê mãnh liệt với Light Novel Nhật Bản, lập trình web hiện đại và nghệ thuật tối giản. Kiến trúc sư chịu trách nhiệm toàn bộ thiết kế hệ thống và trải nghiệm tại MugenBunko.
                            </p>
                            <div className="about-team-badges">
                                <span className="team-badge"><Icons.Terminal size={12} /> Fullstack Dev</span>
                                <span className="team-badge"><Icons.Feather size={12} /> Tác Giả Mugen</span>
                                <span className="team-badge"><Icons.Shield size={12} /> Quản Trị Viên</span>
                            </div>
                        </div>
                    </div>

                    {/* Community Tribute Card */}
                    <div className="about-team-card" onMouseMove={handleCardMouseMove}>
                        <div className="about-team-avatar-wrap">
                            <div className="about-community-avatar-icon">
                                <Icons.Users size={32} />
                            </div>
                        </div>
                        <div className="about-team-info">
                            <h3 className="about-team-name">Cộng Đồng Văn Hữu Mugen</h3>
                            <span className="about-team-role">Linh Hồn Của Thư Viện Vô Hạn</span>
                            <p className="about-team-bio">
                                Tri ân sâu sắc tới tất cả các tác giả độc lập đã chọn MugenBunko để gửi gắm những đứa con tinh thần, các kiểm duyệt viên thầm lặng và hàng ngàn độc giả chân chính hàng ngày tiếp thêm sức sống cho trang sách.
                            </p>
                            <div className="about-team-badges">
                                <span className="team-badge"><Icons.Heart size={12} /> Đam Mê Sáng Tác</span>
                                <span className="team-badge"><Icons.Coffee size={12} /> Đồng Hành Tri Kỷ</span>
                                <span className="team-badge"><Icons.Award size={12} /> Văn Hóa Wibu</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 6: INSPIRING CALL TO ACTION */}
            <div className="about-cta-banner" onMouseMove={handleCardMouseMove}>
                <div className="about-cta-watermark">無限</div>
                <div className="about-cta-body">
                    <span className="about-cta-kicker">Cánh Cửa Mở Ra Vô Hạn</span>
                    <h2 className="about-cta-title">Bạn Đã Sẵn Sàng Bắt Đầu Câu Chuyện Của Riêng Mình?</h2>
                    <p className="about-cta-desc">
                        Dù bạn là một độc giả khao khát những thế giới mới hay một tác giả đang ấp ủ tác phẩm đầu tay,
                        MugenBunko luôn chào đón bạn bước vào thánh địa của những câu chuyện vô tận.
                    </p>
                    <div className="about-cta-buttons">
                        <button className="primary-btn large" onClick={() => setCurrentView('explore')}>
                            <Icons.Book size={18} />
                            <span>Bắt Đầu Đọc Ngay</span>
                        </button>
                        <button className="outline-btn large" onClick={() => setCurrentView('home')}>
                            <Icons.Home size={18} />
                            <span>Về Trang Chủ</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
