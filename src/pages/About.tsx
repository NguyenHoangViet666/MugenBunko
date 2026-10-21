import { useState } from "react";
import { Icons } from "../components/Icons";
import AboutKanjiBackground from "../components/AboutKanjiBackground";
import "../styles/about.css";

interface AboutProps {
  setCurrentView: (view: string) => void;
  openNovelDetail?: (id: number) => void;
}

const questions = [
  {
    title: "Có cần tài khoản mới đọc được không?",
    answer:
      "Bạn có thể đọc các chương công khai khi chưa đăng nhập. Tài khoản giúp bạn lưu Tủ sách, tạo kệ, đồng bộ vị trí đọc và tham gia các hoạt động cộng đồng.",
  },
  {
    title: "Đổi thiết bị có đọc tiếp đúng chỗ được không?",
    answer:
      "Có. Đăng nhập cùng một tài khoản trên các thiết bị và có kết nối mạng để đồng bộ vị trí trong chương. Nếu chưa đăng nhập, vị trí chỉ được lưu trên trình duyệt đang dùng.",
  },
  {
    title: "Đang đọc mà mất mạng thì sao?",
    answer:
      "Vị trí đọc vẫn được lưu trên thiết bị và gửi lại khi có mạng. Bạn có thể tiếp tục phần nội dung đã tải; mở chương chưa tải vẫn cần kết nối mạng.",
  },
  {
    title: "Người khác có thấy kệ sách của tôi không?",
    answer:
      "Chỉ kệ được bật chế độ công khai mới xem được qua liên kết chia sẻ. Bạn có thể đổi lại thành riêng tư bất cứ lúc nào để chặn quyền xem qua liên kết đó.",
  },
  {
    title: "“Đã đọc kịp” khác “Đã đọc xong” thế nào?",
    answer:
      "“Đã đọc kịp” nghĩa là bạn đã đọc hết các chương hiện có, nhưng truyện có thể vẫn đang được viết. “Đã đọc xong” dành cho truyện đã hoàn thành và bạn đã đọc hết các chương.",
  },
];

const paths = [
  {
    number: "01",
    icon: Icons.Compass,
    title: "Đi theo trí tò mò.",
    text: "Một thể loại quen. Một tác giả lạ. Hay một cái tên khiến bạn dừng lại. Tìm câu chuyện hợp gu theo cách của bạn.",
    action: "Khám phá truyện",
    view: "explore",
    label: "Dành cho người đọc",
  },
  {
    number: "02",
    icon: Icons.Feather,
    title: "Viết nên một thế giới.",
    text: "Bắt đầu từ một ý tưởng nhỏ. Sắp xếp tác phẩm, viết từng chương và giữ những bản nháp trong không gian Studio.",
    action: "Ghé Studio sáng tác",
    view: "studio",
    label: "Dành cho người viết",
  },
  {
    number: "03",
    icon: Icons.MessageSquare,
    title: "Tìm người cùng gu.",
    text: "Có những cảm xúc cần được kể lại sau dòng cuối. Chia sẻ cảm nhận, thảo luận và tìm gợi ý đọc từ cộng đồng.",
    action: "Ghé Diễn đàn",
    view: "forum",
    label: "Dành cho chúng mình",
  },
];

function BookPortal() {
  return (
    <div className="about-story__art" aria-hidden="true">
      <div className="about-story__orbit" />
      <div className="about-story__portal">
        <div className="about-story__portal-lines" />
        <span className="about-story__sun" />
        <span className="about-story__mountain about-story__mountain--back" />
        <span className="about-story__mountain about-story__mountain--front" />
        <span className="about-story__vertical" lang="ja">
          物語は、ここから。
        </span>
      </div>
      <span className="about-story__petal about-story__petal--one" />
      <span className="about-story__petal about-story__petal--two" />
      <span className="about-story__petal about-story__petal--three" />
      <div className="about-story__book about-story__book--back">
        <span lang="ja">夢のつづき</span>
        <small>MUGENBUNKO</small>
      </div>
      <div className="about-story__book about-story__book--main">
        <div className="about-story__book-cover">
          <span className="about-story__book-edition">
            MUGENBUNKO · IMAGINATION LIBRARY
          </span>
          <span className="about-story__book-title">
            Những miền
            <br />
            chưa tới
          </span>
          <svg viewBox="0 0 240 240" fill="none">
            <circle cx="157" cy="63" r="35" fill="#d98a80" />
            <path
              d="M0 178 81 68 167 183 209 129 240 164V240H0Z"
              fill="#a6b3a1"
            />
            <path d="m0 206 66-65 85 58 89-37v78H0Z" fill="#49645d" />
            <path d="M0 223c81-43 103 28 240-12v29H0Z" fill="#25413e" />
            <path
              d="M125 240c-14-24 38-31 10-51-24-17-27-27-17-39"
              stroke="#ece5cc"
              strokeWidth="3"
            />
            <path
              d="m39 51 9-3 8 5m135 40 7-4 8 3"
              stroke="#49645d"
              strokeWidth="1.5"
            />
          </svg>
          <span className="about-story__book-footer">
            MỖI TRANG SÁCH, MỘT CHÂN TRỜI.
          </span>
        </div>
      </div>
      <div className="about-story__art-note">
        <span>無限</span>
      </div>
      <span className="about-story__art-caption">
        MỘT TRANG MỞ · VẠN ĐIỀU CÓ THỂ
      </span>
    </div>
  );
}

export default function About({ setCurrentView }: AboutProps) {
  const [paper, setPaper] = useState("washi");
  const [fontSize, setFontSize] = useState(18);

  const openReadingGuide = () => {
    const section = document.getElementById("about-reading-guide");
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    section?.focus({ preventScroll: true });
  };

  return (
    <div className="about-story">
      <section className="about-story__hero" aria-labelledby="about-title">
        <AboutKanjiBackground />
        <div className="about-story__hero-copy">
          <p className="about-story__eyebrow">
            <span /> MUGENBUNKO{" "}
            <span className="about-story__eyebrow-divider">/</span> 無限文庫
          </p>
          <h1 id="about-title">
            Thế giới rộng hơn
            <br />
            sau mỗi <em>trang sách.</em>
          </h1>
          <p className="about-story__intro">
            Có những chuyến đi không cần rời khỏi chiếc ghế quen. Chỉ cần một
            câu chuyện, và một chút tò mò.
          </p>
          <p className="about-story__description">
            Chào mừng đến MugenBunko — góc nhỏ để bạn đọc, viết và gặp những
            người cũng yêu thế giới bên trong từng con chữ.
          </p>
          <div className="about-story__actions">
            <button
              className="primary-btn"
              onClick={() => setCurrentView("explore")}
            >
              Tìm câu chuyện của bạn <Icons.ArrowRight size={18} />
            </button>
            <button
              className="about-story__text-button"
              onClick={openReadingGuide}
            >
              Dạo một vòng <span aria-hidden="true">↘</span>
            </button>
          </div>
          <div className="about-story__hero-footnote">
            <span aria-hidden="true">
              <Icons.Book size={16} />
            </span>{" "}
            Chương công khai luôn mở, kể cả khi bạn chưa đăng nhập.
          </div>
        </div>
        <BookPortal />
      </section>

      <div className="about-story__colophon" aria-hidden="true">
        <span>MỘT KHÔNG GIAN CHO NHỮNG CÂU CHUYỆN</span>
        <span>読む · 書く · つながる</span>
        <span>ĐỌC. VIẾT. KẾT NỐI.</span>
      </div>

      <section
        className="about-story__manifesto"
        aria-labelledby="about-manifesto-title"
      >
        <p className="about-story__eyebrow">TIN VÀO SỨC MẠNH CỦA CÂU CHUYỆN</p>
        <h2 id="about-manifesto-title">
          Một cuộc đời.
          <br />
          Và <em>vô vàn</em> thế giới để sống.
        </h2>
        <p>
          Đôi khi, một trang sách đưa ta đến nơi chưa từng biết.
          <br className="about-story__desktop-break" /> Đôi khi, nó đưa ta trở
          về gần hơn với chính mình.
          <br className="about-story__desktop-break" /> MugenBunko được tạo ra
          để những cuộc gặp ấy có một chốn riêng.
        </p>
        <span className="about-story__seal" aria-hidden="true" lang="ja">
          物<br />語
        </span>
      </section>

      <section
        className="about-story__reading"
        id="about-reading-guide"
        tabIndex={-1}
        aria-labelledby="about-reading-title"
      >
        <div className="about-story__reading-copy">
          <p className="about-story__eyebrow">01 / DÀNH MỘT KHOẢNG LẶNG</p>
          <h2 id="about-reading-title">
            Thế giới ồn ào.
            <br />
            Trang sách thì không.
          </h2>
          <p>
            Ánh sáng vừa mắt. Cỡ chữ vừa đủ. Một không gian để câu chuyện được
            cất lời theo nhịp của riêng bạn.
          </p>
          <div className="about-story__reading-feature">
            <Icons.Book size={20} />
            <div>
              <h3>Đọc theo cách bạn thích</h3>
              <p>
                Đổi nền, phông chữ, giãn dòng. Bật Zen khi chỉ muốn ở lại cùng
                câu chuyện.
              </p>
            </div>
          </div>
          <div className="about-story__reading-feature">
            <Icons.Bookmark size={20} />
            <div>
              <h3>Giữ lại nơi bạn dừng chân</h3>
              <p>
                Lưu vào Tủ sách, tạo kệ riêng. Đăng nhập để đồng bộ vị trí đọc
                giữa các thiết bị.
              </p>
            </div>
          </div>
          <button
            className="about-story__text-button"
            onClick={() => setCurrentView("library")}
          >
            Đến góc sách của bạn <Icons.ArrowRight size={17} />
          </button>
        </div>
        <div className="about-story__reader-wrap">
          <div className="about-story__reader" data-paper={paper}>
            <div className="about-story__reader-topline">
              <span>MỘT CHÚT BÌNH YÊN</span>
              <Icons.Book size={16} />
            </div>
            <div className="about-story__reader-excerpt" style={{ fontSize }}>
              <span className="about-story__chapter">ĐOẠN VĂN MINH HỌA</span>
              <h3>Tiệm sách cuối con đường</h3>
              <p>
                Chiều hôm ấy, tôi tìm thấy một tiệm sách không có trên bản đồ.
              </p>
              <p>
                Chiếc chuông nhỏ khẽ ngân khi cánh cửa mở ra. Mùi giấy cũ, hương
                trà còn ấm, và nắng nằm yên trên bậu cửa.
              </p>
              <p>
                “Cứ thong thả,” người giữ tiệm nói. “Ở đây, câu chuyện nào cũng
                có thể đợi.”
              </p>
              <div className="about-story__reader-end" aria-hidden="true">
                ✦
              </div>
            </div>
            <div className="about-story__reader-controls">
              <div
                className="about-story__paper-options"
                role="group"
                aria-label="Nền đọc mẫu"
              >
                {[
                  { value: "washi", label: "Giấy" },
                  { value: "sepia", label: "Ấm" },
                  { value: "charcoal", label: "Đêm" },
                ].map((option) => (
                  <button
                    key={option.value}
                    className="about-story__paper-button"
                    data-swatch={option.value}
                    aria-pressed={paper === option.value}
                    onClick={() => setPaper(option.value)}
                  >
                    <span aria-hidden="true" />
                    {option.label}
                  </button>
                ))}
              </div>
              <div
                className="about-story__font-options"
                role="group"
                aria-label="Cỡ chữ đọc mẫu"
              >
                <button
                  aria-label="Giảm cỡ chữ"
                  disabled={fontSize <= 16}
                  onClick={() => setFontSize((size) => Math.max(16, size - 2))}
                >
                  A−
                </button>
                <output aria-live="polite" aria-label="Cỡ chữ hiện tại">
                  {fontSize}
                </output>
                <button
                  aria-label="Tăng cỡ chữ"
                  disabled={fontSize >= 24}
                  onClick={() => setFontSize((size) => Math.min(24, size + 2))}
                >
                  A+
                </button>
              </div>
            </div>
          </div>
          <p className="about-story__try-note">
            <span aria-hidden="true">↖</span> Thử đổi nền và cỡ chữ ngay ở đây
            nhé.
          </p>
        </div>
      </section>

      <section
        className="about-story__paths"
        aria-labelledby="about-paths-title"
      >
        <div className="about-story__section-heading">
          <p className="about-story__eyebrow">02 / TÌM CHỐN CỦA MÌNH</p>
          <h2 id="about-paths-title">
            Bạn mang theo điều gì
            <br />
            đến thư viện hôm nay?
          </h2>
        </div>
        <div className="about-story__path-grid">
          {paths.map(
            ({ number, icon: Icon, title, text, action, view, label }) => (
              <article className="about-story__path" key={number}>
                <div className="about-story__path-top">
                  <span>{number}</span>
                  <Icon size={25} />
                </div>
                <p className="about-story__path-label">{label}</p>
                <h3>{title}</h3>
                <p className="about-story__path-description">{text}</p>
                <button
                  className="about-story__text-button"
                  onClick={() => setCurrentView(view)}
                >
                  {action}
                  <Icons.ArrowRight size={17} />
                </button>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="about-story__faq" aria-labelledby="about-faq-title">
        <div>
          <p className="about-story__eyebrow">03 / TRƯỚC KHI LẬT TRANG</p>
          <h2 id="about-faq-title">
            Một vài điều
            <br />
            bạn muốn biết.
          </h2>
          <p>
            Cứ thoải mái khám phá.
            <br />
            Chúng mình để lời giải đáp ở đây.
          </p>
        </div>
        <div className="about-story__questions">
          {questions.map(({ title, answer }, index) => (
            <details key={title}>
              <summary>
                <span
                  className="about-story__question-number"
                  aria-hidden="true"
                >
                  0{index + 1}
                </span>
                <span>{title}</span>
                <span
                  className="about-story__question-toggle"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="about-story__closing"
        aria-labelledby="about-cta-title"
      >
        <span
          className="about-story__closing-kanji"
          aria-hidden="true"
          lang="ja"
        >
          無限
        </span>
        <p className="about-story__eyebrow">CÂU CHUYỆN TIẾP THEO ĐANG CHỜ</p>
        <h2 id="about-cta-title">
          Lật trang <em>thôi.</em>
        </h2>
        <p>Biết đâu, thế giới bạn đang tìm ở ngay chương đầu tiên.</p>
        <button
          className="primary-btn"
          onClick={() => setCurrentView("explore")}
        >
          Bắt đầu khám phá <Icons.ArrowRight size={18} />
        </button>
        <span className="about-story__closing-signature">
          MugenBunko <span>·</span> Những câu chuyện không giới hạn.
        </span>
      </section>
    </div>
  );
}
