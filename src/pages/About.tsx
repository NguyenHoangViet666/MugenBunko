import { Icons } from '../components/Icons';
import AboutKanjiBackground from '../components/AboutKanjiBackground';
import '../styles/about.css';

interface AboutProps {
    setCurrentView: (view: string) => void;
    openNovelDetail?: (id: number) => void;
}

const features = [
    { icon: Icons.Compass, title: 'Tìm câu chuyện hợp gu', text: 'Khám phá truyện theo thể loại, tác giả và tag. Xem tóm tắt, trạng thái truyện và danh sách chương trước khi bắt đầu.', tip: 'Muốn đọc liền mạch? Thử tìm truyện đã hoàn thành.' },
    { icon: Icons.Book, title: 'Đọc theo cách bạn thích', text: 'Đổi phông chữ, cỡ chữ, giãn dòng và nền sáng hoặc tối. Bật Zen để dành màn hình cho câu chuyện.', tip: 'Trên máy tính, dùng phím ← và → để chuyển chương.' },
    { icon: Icons.Bookmark, title: 'Một góc sách của riêng bạn', text: 'Lưu truyện vào Tủ sách, phân loại bằng các kệ riêng và theo dõi tiến độ. Kệ có thể giữ riêng tư hoặc chia sẻ bằng liên kết.', tip: 'Tạo một kệ “Để dành cuối tuần” cho những truyện muốn đọc sau.' },
    { icon: Icons.MessageSquare, title: 'Đọc rồi cùng trò chuyện', text: 'Bình luận, đánh giá tác phẩm và theo dõi tác giả bạn yêu thích. Ghé Diễn đàn để trao đổi cảm nhận hoặc tìm gợi ý từ người đọc khác.', tip: 'Nhớ báo trước nếu chia sẻ tình tiết quan trọng nhé.' },
];
const questions = [
    { title: 'Có cần tài khoản mới đọc được không?', answer: 'Bạn có thể đọc các chương công khai khi chưa đăng nhập. Tài khoản giúp bạn lưu Tủ sách, tạo kệ, đồng bộ vị trí đọc và tham gia các hoạt động cộng đồng.' },
    { title: 'Đổi thiết bị có đọc tiếp đúng chỗ được không?', answer: 'Có. Đăng nhập cùng một tài khoản trên các thiết bị và có kết nối mạng để đồng bộ vị trí trong chương. Nếu chưa đăng nhập, vị trí chỉ được lưu trên trình duyệt đang dùng.' },
    { title: 'Đang đọc mà mất mạng thì sao?', answer: 'Vị trí đọc vẫn được lưu trên thiết bị và gửi lại khi có mạng. Bạn có thể tiếp tục phần nội dung đã tải; mở chương chưa tải vẫn cần kết nối mạng.' },
    { title: 'Người khác có thấy kệ sách của tôi không?', answer: 'Chỉ kệ được bật chế độ công khai mới xem được qua liên kết chia sẻ. Bạn có thể đổi lại thành riêng tư bất cứ lúc nào để chặn quyền xem qua liên kết đó.' },
    { title: '“Đã đọc kịp” khác “Đã đọc xong” thế nào?', answer: 'Trong Tủ sách, “Đã đọc kịp” nghĩa là bạn đã đọc hết các chương hiện có, nhưng truyện có thể vẫn đang được viết. “Đã đọc xong” dành cho truyện đã hoàn thành và bạn đã đọc hết các chương.' },
];

export default function About({ setCurrentView }: AboutProps) {
    return <div className="about-page-container about-reader-page">
        <section className="about-hero-section" aria-labelledby="about-title">
            <AboutKanjiBackground />
            <div className="about-hero-content">
                <span className="about-badge-pill"><Icons.Book size={16} /> MugenBunko · 無限文庫</span>
                <h1 className="about-hero-title" id="about-title">Một câu chuyện mới.<br />Một góc đọc của riêng bạn.</h1>
                <p className="about-hero-subtitle">MugenBunko là nơi khám phá và đọc truyện, lưu lại những tác phẩm yêu thích và trò chuyện cùng tác giả, độc giả. Chọn một câu chuyện hợp gu rồi bắt đầu thôi.</p>
                <div className="about-hero-actions">
                    <button className="primary-btn" onClick={() => setCurrentView('explore')}><Icons.Compass size={17} /> Khám phá truyện</button>
                    <button className="outline-btn" onClick={() => document.getElementById('about-reading-guide')?.scrollIntoView({ block: 'start' })}><Icons.Book size={17} /> Mẹo đọc trên MugenBunko</button>
                </div>
                <p className="about-reader-note">Đọc chương công khai không cần tài khoản. Đăng nhập để mang tiến độ đọc theo bạn.</p>
            </div>
        </section>
        <section className="about-section" aria-labelledby="about-features-title">
            <div className="about-section-header"><span className="about-section-kicker">Dành cho người đọc</span><h2 className="about-section-heading" id="about-features-title">Có gì cho buổi đọc tiếp theo?</h2></div>
            <div className="about-reader-features">{features.map(({ icon: Icon, title, text, tip }) => <article className="about-pillar-card" key={title}>
                <div className="about-pillar-icon-box" aria-hidden="true"><Icon size={24} /></div>
                <h3 className="about-pillar-title">{title}</h3><p className="about-pillar-text">{text}</p>
                <p className="about-reader-tip"><Icons.CheckCircle size={16} /><span>{tip}</span></p>
            </article>)}</div>
        </section>
        <section className="about-section about-reading-guide" id="about-reading-guide" aria-labelledby="about-guide-title">
            <div className="about-section-header"><span className="about-section-kicker">Bắt đầu thật nhẹ nhàng</span><h2 className="about-section-heading" id="about-guide-title">Từ tìm truyện đến đọc tiếp</h2></div>
            <ol className="about-reader-steps">
                <li><span aria-hidden="true">01</span><h3>Chọn một truyện</h3><p>Ghé Khám phá, xem tóm tắt và mở chương đầu. Thử vài thể loại để tìm gu của mình.</p></li>
                <li><span aria-hidden="true">02</span><h3>Chỉnh cho dễ đọc</h3><p>Dùng thanh công cụ trong Reader để chọn cỡ chữ, nền và giãn dòng thoải mái với mắt.</p></li>
                <li><span aria-hidden="true">03</span><h3>Lần sau, đọc tiếp</h3><p>Lưu truyện vào Tủ sách. Khi quay lại, chọn Đọc tiếp để trở về vị trí đã lưu.</p></li>
            </ol>
            <div className="about-reader-shortcuts">
                <button className="outline-btn" onClick={() => setCurrentView('library')}><Icons.Bookmark size={16} /> Mở Tủ sách</button>
                <button className="outline-btn" onClick={() => setCurrentView('forum')}><Icons.MessageSquare size={16} /> Ghé Diễn đàn</button>
            </div>
        </section>
        <section className="about-section" aria-labelledby="about-faq-title">
            <div className="about-section-header"><span className="about-section-kicker">Bạn có thể đang thắc mắc</span><h2 className="about-section-heading" id="about-faq-title">Trước khi lật trang</h2></div>
            <div className="about-reader-faq">{questions.map(({ title, answer }) => <details key={title}><summary>{title}</summary><p>{answer}</p></details>)}</div>
        </section>
        <section className="about-cta-banner" aria-labelledby="about-cta-title">
            <div className="about-cta-body">
                <h2 className="about-cta-title" id="about-cta-title">Câu chuyện tiếp theo đang chờ bạn.</h2>
                <p className="about-cta-desc">Tìm một tác phẩm mới, hoặc trở lại thế giới bạn đang đọc dở.</p>
                <div className="about-cta-buttons">
                    <button className="primary-btn" onClick={() => setCurrentView('explore')}>Tìm truyện để đọc <Icons.ArrowRight size={16} /></button>
                    <button className="outline-btn" onClick={() => setCurrentView('home')}>Về Trang chủ</button>
                </div>
            </div>
        </section>
    </div>;
}
