# Hệ giao diện web hiện tại

Snapshot từ source ngày 2026-10-21. Dùng để tìm đúng nơi và hiểu ý đồ, sau đó xác minh code hiện tại. Các số bên dưới là giá trị quan sát được, không phải yêu cầu phải đồng nhất mọi màn hình.

## Nguồn quyết định

| Nhu cầu | Nguồn trong project |
| --- | --- |
| Token, reset, shell, phần lớn trang | `src/index.css` |
| Library, shelf card, reader, feature modal | `src/styles/reader-library.css` |
| About, FAQ, nền chữ Nhật | `src/styles/about.css`, `src/pages/About.tsx` |
| CSS thực sự được dùng | `src/main.tsx`, import trong từng page |
| Font tải ngoài và ngôn ngữ trang | `index.html` |
| Icons dạng SVG | `src/components/Icons.tsx` |

`src/App.css` hiện chỉ có comment, không phải nguồn style chính. README còn nhắc Dark Cyber/Glassmorphism; đối chiếu theme và component hiện tại trước khi áp dụng mô tả đó.

## Token nhận diện

| Token | Giá trị hiện tại | Vai trò |
| --- | --- | --- |
| `--sakura-pink` | `#e05275` | Điểm nhấn |
| `--sakura-pink-hover` | `#f16886` | Nhấn khi tương tác |
| `--sakura-pink-light` | `#fef0f3` | Màu nhạt cố định; kiểm tra trước khi dùng trên dark |
| `--indigo-blue` / hover | `#1c2d37` / `#293f4c` | Mực xanh đậm |
| `--text-muted` | `#737b82` | Metadata; kiểm tra tương phản trên nền thực tế |
| `--font-serif` | `'Noto Serif JP', 'Georgia', serif` | Heading và nội dung đọc |
| `--font-sans` | `'Inter', sans-serif` | Điều khiển, metadata |
| `--border-radius-sm/md/lg` | `4px / 8px / 16px` | Thang gốc |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.04)` | Nâng nhẹ |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,.06)` | Card nổi |
| `--shadow-lg` | `0 16px 40px rgba(0,0,0,.1)` | Bề mặt nổi hơn |
| `--transition-smooth` | `all .3s cubic-bezier(.25,.8,.25,1)` | Legacy; transition mới nên chỉ rõ thuộc tính |

Nguồn: đầu `src/index.css`. Heading h1–h4 mặc định serif, weight 600; body sans, line-height 1.6. `index.html` tải Inter và Noto Serif JP; kiểm tra rendering chữ Việt thay vì giả định font bao phủ mọi ký tự.

## Ba theme web

Theme áp vào `body` qua `.theme-washi`, `.theme-sepia`, `.theme-charcoal` trong `src/App.tsx`; lựa chọn lưu ở `mugen_theme`.

| Token | Washi | Sepia | Charcoal |
| --- | --- | --- | --- |
| `--bg-base` | `#faf8f5` | `#efe5cc` | `#121214` |
| `--bg-card` | `#ffffff` | `#f9f3e3` | `#1c1c1f` |
| `--bg-card-hover` | `#fdfcfb` | `#fcf9f0` | `#242428` |
| `--border-color` | `#eae5dc` | `#dbcca9` | `#2e2e33` |
| `--text-main` | `#2a2e30` | `#3d2f1f` | `#e2e2e7` |
| `--text-content` | `#3a3f42` | `#4a3c2b` | `#c7c7cf` |
| `--reader-bg` | `#fdfbf7` | `#f4edd8` | `#161618` |
| `--sidebar-bg` | `#f5f1ea` | `#e6d8b6` | `#1c1c1f` |
| `--accent-glow` | Sakura alpha `.08` | Sakura alpha `.12` | Sakura alpha `.2` |

Forum dùng `--sidebar-bg` cho bề mặt phụ và `--text-content` cho chữ phụ. Không phát sinh alias `--bg-secondary`/`--text-secondary` chưa được định nghĩa. Chọn token thật hoặc bổ sung semantic token cùng các theme cần thiết. Không sửa theme toàn cục cho một card nếu có thể giải quyết tại component.

## Nhịp bố cục và bề mặt

- `.container`: max-width 1720px, gutter 40px; `.app-header`: sticky, min-height 72px, co giãn theo các hàng nội dung. Search nằm trong flex flow, navigation có thể wrap; không đưa search về absolute khiến chồng menu. Main có khoảng trên 32px/dưới 64px.
- Discovery có main/sidebar theo `8.5fr 3.5fr`, gap 32px; các override tại khoảng 992px đưa về một cột. Có breakpoint khác ở 1180/1120/780/768/380; kiểm tra đúng selector thay vì giả định một bộ duy nhất.
- Hero featured của Home có nền tối, bìa nổi, chữ Nhật trang trí và CTA Sakura kể cả trong Washi. Đây là biến thể trang chủ hiện có; mở rộng theo ngữ cảnh, không tự đổi mọi hero về nền sáng hoặc mang hero tối sang mọi trang.
- Đến 768px, container thường còn gutter 12px. Cần xét mobile gate trước khi kết luận trang responsive hỏng hoặc hoàn chỉnh.
- Library dùng hero padding 38×40px/radius 20px, collection grid `auto-fill` min 250px/gap 20px. Đây là mẫu cho khu vực tủ sách, không ép dùng hero trên mọi trang.
- Shelf grid min 330px/gap 18px; card nằm ngang padding 20px/gap 18px/radius 14px, bìa 88px tỷ lệ `1 / 1.42`. Dưới 600px, một cột, padding 16px/gap 14px/bìa 74px.
- Reader max 880px, padding 36×48px, nền `--reader-bg`, radius 14px; Zen max 790px. Dưới 600px, padding 24×18px. Heading reader `clamp(1.3rem, ..., 1.9rem)`; ưu tiên thiết lập font của người đọc cho article.
- Feature modal: backdrop blur 5px/z-index 1200; panel max 520px, max-height 90vh, scroll nội bộ, padding 28px/radius 18px.

Các radius 14/18/20px là biến thể đang có bên cạnh token 4/8/16px. Theo component lân cận khi mở rộng; chỉ hợp nhất thang khi được yêu cầu refactor design system.

## Thành phần dùng lại

| Thành phần | Dùng cho | Điều cần giữ |
| --- | --- | --- |
| `.primary-btn` | CTA chính | Ink background, chữ theo `--bg-card`, padding 10×20px, radius 8px |
| `.outline-btn` | Thao tác phụ | Border theo theme; small variant padding 6×14px |
| `Icons` | Icon hành động/metadata | SVG grid 24, `currentColor`, stroke 2, round cap/join; thường size 16 |
| `NovelShelfCard` | Tủ sách/đọc tiếp | Ảnh lazy/fallback, nút có tên, progress, đọc ngay/đọc tiếp |
| `CollectionShelves` | Kệ riêng/chia sẻ | Selected state, mutation busy, empty/error, phản hồi sao chép |
| `PageLoading`, `PageError`, `SyncIndicator` | Trạng thái trang | Skeleton đúng nội dung, retry và thông điệp local/cloud rõ ràng |
| `useDialogFocus` | Dialog React | Focus/trap/scroll lock/restore; Escape ở caller |

Kiểm tra export/props thực tế trước khi import. `Icons` không nhận mọi SVG/ARIA prop; đặt accessible name trên control và ẩn icon trang trí qua wrapper nếu cần. Ảnh mặc định có tại `public/assets/default_novel_cover.png`; không để scaffold Vite logo xuất hiện trong sản phẩm.

## Các điểm cần cải thiện khi chạm đến

`src/index.css` có nhiều thế hệ override. Tìm tất cả selector liên quan bằng `rg`, xem thứ tự import rồi chỉnh vùng chịu trách nhiệm; tránh thêm một block toàn cục và `!important` để đè triệu chứng.

Quick-read có `:focus-within` bên cạnh hover; giữ khả năng truy cập bằng bàn phím và kiểm tra touch khi mở rộng. Header logo là button, avatar là link và search/notification có nhãn; một số card/footer vẫn còn `div/span onClick`, nên dùng link/button thật cho phần đang sửa. Metadata ở breakpoint hẹp có thể xuống `.6rem`; giảm mật độ thay vì kế thừa cỡ quá nhỏ. Footer dùng bốn cột ở desktop, hai cột dưới 768px và một cột dưới 380px. Reduced motion hiện chỉ bao phủ một phần; xử lý animation của component mới hoặc đang thay đổi.
