# 🚀 KẾ HOẠCH NÂNG CẤP & HOÀN THIỆN NỀN TẢNG MUGENBUNKO (無限文庫)
> **Dự án:** Hệ thống đọc, xuất bản và mạng xã hội tiểu thuyết đa nền tảng MugenBunko  
> **Tài liệu:** Kế hoạch Cải tiến Toàn diện Giao diện, Trải nghiệm Người dùng (UX) và Tính năng Nền tảng  
> **Ngày khởi tạo:** 28/09/2026  
> **Tác giả:** Nguyễn Hoàng Việt (HYUTE) & Antigravity  

---

## 📌 MỤC LỤC
1. [Tổng Quan & Mục Tiêu Dự Án](#1-tổng-quan--mục-tiêu-dự-án)
2. [Phân Tích Hiện Trạng & Đề Xuất Nâng Cấp Từng Trang](#2-phân-tích-hiện-trạng--đề-xuất-nâng-cấp-từng-trang)
   - [2.1. Trang Chủ (Home.tsx)](#21-trang-chủ-hometsx)
   - [2.2. Trình Đọc Truyện (ChapterReader.tsx)](#22-trình-đọc-truyện-chapterreadertsx)
   - [2.3. Chi Tiết Tác Phẩm (NovelDetail.tsx)](#23-chi-tiết-tác-phẩm-noveldetailtsx)
   - [2.4. Tủ Sách Cá Nhân (Library.tsx)](#24-tủ-sách-cá-nhân-librarytsx)
   - [2.5. Khám Phá & Tìm Kiếm (Explore.tsx)](#25-khám-phá--tìm-kiếm-exploretsx)
   - [2.6. Studio Tác Giả (AuthorStudio.tsx)](#26-studio-tác-giả-authorstudiotsx)
   - [2.7. Diễn Đàn Thảo Luận (Forum.tsx)](#27-diễn-đàn-thảo-luận-forumtsx)
   - [2.8. Hồ Sơ Cá Nhân & Gamification (UserProfile.tsx)](#28-hồ-sơ-cá-nhân--gamification-userprofiletsx)
   - [2.9. Bảng Quản Trị & Điều Phối (Admin & Mod Dashboard)](#29-bảng-quản-trị--điều-phối-admin--mod-dashboard)
   - [2.10. Thanh Điều Hướng & Trải Nghiệm Toàn Cục (Header & Global UX)](#210-thanh-điều-hướng--trải-nghiệm-toàn-cục-header--global-ux)
3. [Kiến Trúc Dữ Liệu & Hậu Cần Cần Bổ Sung (Backend & Database)](#3-kiến-trúc-dữ-liệu--hậu-cần-cần-bổ-sung-backend--database)
4. [Lộ Trình Triển Khai Theo Giai Đoạn (Phased Roadmap)](#4-lộ-trình-triển-khai-theo-giai-đoạn-phased-roadmap)
   - [Phase 1: Quick Wins & Tối Ưu Điều Hướng (Ưu tiên cao nhất)](#phase-1-quick-wins--tối-ưu-điều-hướng-ưu-tiên-cao-nhất)
   - [Phase 2: Nâng Cấp Trình Đọc & Tủ Sách Cá Nhân](#phase-2-nâng-cấp-trình-đọc--tủ-sách-cá-nhân)
   - [Phase 3: Gamification & Tương Tác Giữ Chân Người Dùng](#phase-3-gamification--tương-tác-giữ-chân-người-dùng)
   - [Phase 4: Công Cụ Sáng Tác Nâng Cao & Quản Trị](#phase-4-công-cụ-sáng-tác-nâng-cao--quản-trị)
5. [Quy Chuẩn Thẩm Mỹ & Đảm Bảo Chất Lượng (Quality Checklist)](#5-quy-chuẩn-thẩm-mỹ--đảm-bảo-chất-lượng-quality-checklist)

---

## 1. Tổng Quan & Mục Tiêu Dự Án

**MugenBunko (無限文庫)** đã đạt được nền móng vững chắc với kiến trúc React 19 + Express + MySQL 8.0 + Socket.IO, sở hữu ngôn ngữ thiết kế **Bento Box Nhật Bản** sang trọng, hiện đại kết hợp bảng màu đơn sắc Washi/Charcoal/Sepia.

### Mục tiêu của đợt cập nhật này:
1. **Nâng tầm trải nghiệm đọc (Reader Experience):** Giảm thiểu tối đa thao tác thừa, tối ưu độ mượt mà khi đọc dài kỳ.
2. **Kích hoạt vòng lặp giữ chân (Retention Loop & Gamification):** Tạo động lực để người dùng đăng nhập và tương tác mỗi ngày thông qua điểm danh, nhiệm vụ, huy hiệu thành tựu và bảng xếp hạng.
3. **Mở rộng chiều sâu công cụ:** Cho phép tác giả chủ động quản lý tác phẩm và độc giả khám phá tác phẩm đúng "gu" nhanh chóng.
4. **Chuẩn hóa điều hướng đa nền tảng:** Đồng bộ luồng di chuyển giữa Desktop và Mobile, xóa bỏ các điểm nghẽn thao tác (dead-ends).

---

## 2. Phân Tích Hiện Trạng & Đề Xuất Nâng Cấp Từng Trang

### 2.1. Trang Chủ (`src/pages/Home.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Bố cục Bento phong phú, bìa sách mô phỏng gáy sách 3D sống động, thanh Discovery Bar theo ngày xoay tua thông minh, BXH đa tiêu chí (Reads, Stars, Bookmarks) và nhịp sống nền tảng (Platform Pulse).
- **Khoảng trống cần bổ sung:**
  1. **Widget Điểm Danh Hàng Ngày (Daily Check-in Bento):**
     - Đặt tại góc Bento của Sidebar hoặc ngay dưới Hero Banner.
     - Cơ chế: Mỗi ngày đăng nhập bấm 1 nút *"Điểm danh (+50 XP)"*, đếm chuỗi liên tục (Streak: 1 ngày, 2 ngày,... 7 ngày tặng kèm danh hiệu).
  2. **Bộ lọc trạng thái & định dạng nhanh (Quick Status Pills):**
     - Thêm các nút chọn nhanh ngay trên thanh Discovery: `Tất cả` | `Series dài kỳ` | `Oneshot` | `Đã hoàn thành`.
  3. **Mục "Truyện Xem Gần Đây" (Recently Viewed):**
     - Hiện tại Bento chỉ lưu truyện khi đã mở chương đọc. Cần lưu thêm các truyện độc giả vừa ghé thăm trang chi tiết vào LocalStorage (`mugen_recent_views`) để họ dễ dàng tìm lại truyện vừa lướt qua.
  4. **Nút "Đọc tiếp" 1 chạm (Quick Resume):**
     - Hiển thị nút biểu tượng Play/Book trực tiếp trên thẻ truyện để nhảy thẳng vào chương đang đọc dở mà không bắt buộc phải bấm qua trang Novel Detail.

---

### 2.2. Trình Đọc Truyện (`src/pages/ChapterReader.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Đã có Zen Mode, chuyển đổi 3 tông màu nền (Washi, Sepia, Charcoal), tùy chỉnh phông chữ Serif/Sans, tăng giảm cỡ chữ, phím tắt `←` `→`, Drawer mục lục tập/chương.
- **Khoảng trống cần bổ sung:**
  1. **Thanh tiến độ cuộn trang (Reading Progress Bar):**
     - Thanh chạy mảnh (2px) ghim trên mép đầu màn hình hiển thị tỷ lệ % đã đọc của chương hiện tại theo độ cuộn chuột (0% -> 100%).
  2. **Tùy chỉnh khoảng cách dòng & độ rộng khung đọc (Typography Control):**
     - Giãn dòng: `1.6x` (Tiêu chuẩn), `1.8x` (Thoáng), `2.0x` (Rộng rãi).
     - Độ rộng nội dung: `Hẹp (750px)`, `Vừa (900px)`, `Rộng (1100px)`.
  3. **Khu vực Tương tác & Bình luận Chân Chương (End-of-Chapter Engagement):**
     - Khi cuộn đến hết nội dung chương, độc giả có thể:
       - Bấm thả cảm xúc nhanh: ❤️ Thích, 👏 Hay quá, 😢 Cảm động, 🔥 Hóng chương mới.
       - Form gửi bình luận nhanh cho chương này (không cần phải thoát ra ngoài NovelDetail).
  4. **Hỗ trợ Đọc Giọng Nói AI (Web Speech API):**
     - Tận dụng `window.speechSynthesis` có sẵn trên mọi trình duyệt để phát âm thanh đọc chương tiếng Việt tự động cho độc giả khi bận tay.
  5. **Nút "Mục lục nổi" (Sticky FAB TOC):**
     - Icon mục lục tròn thu nhỏ ghim ở góc phải khi cuộn trang, giúp mở mục lục đổi chương ngay lập tức mà không cần cuộn ngược lên toolbar.

---

### 2.3. Chi Tiết Tác Phẩm (`src/pages/NovelDetail.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Layout Bento hiện đại, thông số trực quan, điều kiện đánh giá chặt chẽ (phải đọc tối thiểu 3 chương / 1 chương oneshot), bình luận 2 cấp.
- **Khoảng trống cần bổ sung:**
  1. **Mục "Tác phẩm tương tự" & "Cùng tác giả" (Related Recommendations):**
     - Hiển thị 4-5 tác phẩm cùng thể loại hoặc cùng tác giả sáng tác ở đáy trang chi tiết để giữ chân độc giả tiếp tục duyệt sách.
  2. **Đảo chiều thứ tự chương (Sort Chapters):**
     - Nút gạt chuyển đổi giữa `Cũ nhất -> Mới nhất` và `Mới nhất -> Cũ nhất` để độc giả theo dõi truyện dài kỳ (50+ chương) không phải cuộn mỏi tay.
  3. **Nút Chia Sẻ Nhanh (Share & Copy Link):**
     - Nút copy đường dẫn truyện kèm thông báo Toast: *"Đã sao chép liên kết truyện vào bộ nhớ tạm!"*.
  4. **Nút Báo Cáo Vi Phạm (Report Novel):**
     - Mở modal báo cáo tác phẩm (nội dung kích động, đạo văn, vi phạm thuần phong mỹ tục) gửi trực tiếp về bảng điều khiển của Moderator.
  5. **Bộ lọc tìm kiếm chương theo tên/số chương:**
     - Ô input nhỏ lọc nhanh danh sách chương theo từ khóa cho các tác phẩm có nhiều tập.

---

### 2.4. Tủ Sách Cá Nhân (`src/pages/Library.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Giao diện tối giản, hiển thị thanh % tiến độ đọc của các tác phẩm được lưu.
- **Khoảng trống cần bổ sung:**
  1. **Hệ thống Tab phân loại tủ sách:**
     - Tab 1: `Đang Đọc` (Lịch sử đọc dở gần nhất kèm % tiến độ).
     - Tab 2: `Đã Lưu / Bookmark` (Danh sách truyện đánh dấu theo dõi).
     - Tab 3: `Đã Đọc Xong` (Các truyện đã đọc đủ 100% số chương hoặc truyện hoàn thành).
  2. **Thao tác nhanh 1-Click trên mỗi thẻ:**
     - Nút *"Đọc tiếp Ch.X"* màu nổi bật, click là vào thẳng Reader.
     - Nút biểu tượng ba chấm hoặc thùng rác nhỏ để gỡ truyện khỏi tủ sách mà không cần mở trang chi tiết.
  3. **Thống Kê Thói Quen Đọc (Reading Insights Header):**
     - Khối thông số mini: *Tổng số chương đã đọc*, *Số giờ đọc ước tính*, *Số ngày duy trì chuỗi đọc*.

---

### 2.5. Khám Phá & Tìm Kiếm (`src/pages/Explore.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Tính năng quay Gacha truyện ngẫu nhiên thú vị, bộ lọc cơ bản theo Thể loại và Định dạng.
- **Khoảng trống cần bổ sung:**
  1. **Bộ lọc sâu đa tiêu chí (Deep Filter Panel):**
     - Lọc theo tình trạng: *Tất cả / Đang tiến hành / Đã hoàn thành / Tạm ngưng*.
     - Lọc theo quy mô dung lượng: *Truyện ngắn (< 20k chữ)*, *Vừa (20k - 100k chữ)*, *Trường thiên (> 100k chữ)*.
     - Lọc kết hợp nhiều thẻ tag (Multi-select tags).
  2. **Bộ chuyển đổi hiển thị (Grid vs. List View):**
     - `Chế độ Lưới (Grid)`: Thẻ bìa lớn, đẹp mắt cho việc duyệt trực quan.
     - `Chế độ Danh sách (List)`: Hiển thị tóm tắt, ngày cập nhật chương mới nhất và thông số chi tiết cho độc giả muốn tra cứu nhanh.
  3. **Phân trang (Pagination) hoặc nút "Xem thêm":**
     - Kiểm soát số lượng hiển thị (12 / 24 truyện mỗi trang) giúp tăng tốc độ render và thân thiện khi kho truyện lớn dần.

---

### 2.6. Studio Tác Giả (`src/pages/AuthorStudio.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Quản lý theo cấu trúc Quyển (Volume) - Chương (Chapter), trình soạn thảo rich text kèm tự động lưu và lên lịch phát hành (Schedule release).
- **Khoảng trống cần bổ sung:**
  1. **Chuyển đổi trạng thái truyện:**
     - Cho phép tác giả tự chỉnh trạng thái tác phẩm (`Đang ra` ↔ `Hoàn thành` ↔ `Tạm ngưng`) ngay trong phần cài đặt truyện.
  2. **Phân loại danh sách chương:**
     - Tab tách biệt: `Đã xuất bản (Published)` | `Bản nháp (Drafts)` | `Đang hẹn giờ (Scheduled)` giúp dễ quản lý khi truyện có số chương lớn.
  3. **Bảng phân tích tương tác (Author Analytics Lite):**
     - Thống kê biểu đồ lượt đọc theo từng chương để tác giả biết độc giả dừng lại nhiều nhất ở chương nào, chương nào có nhiều bình luận nhất.
  4. **Xuất bản dự phòng (Export Backup):**
     - Cho phép tác giả tải toàn bộ nội dung tác phẩm về máy dưới định dạng `.txt` hoặc `.markdown` để lưu trữ an toàn.

---

### 2.7. Diễn Đàn Thảo Luận (`src/pages/Forum.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Hỗ trợ trình soạn thảo kèm nén ảnh, phân mục thảo luận đa dạng, bình luận trực tiếp.
- **Khoảng trống cần bổ sung:**
  1. **Thanh tìm kiếm bài viết diễn đàn:**
     - Lọc bài viết theo từ khóa tiêu đề hoặc nội dung.
  2. **Sắp xếp bài thảo luận:**
     - Bộ lọc: `Mới nhất` | `Sôi nổi nhất (Nhiều bình luận nhất)` | `Được ghim bởi BQT`.
  3. **Huy hiệu cấp bậc (Level Frame) tích hợp:**
     - Hiển thị khung viền avatar và danh hiệu Wibu của tác giả bài viết ngay trong danh sách thảo luận để vinh danh thành viên tích cực.

---

### 2.8. Hồ Sơ Cá Nhân & Gamification (`src/pages/UserProfile.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Tính toán level, XP, khung avatar, cập nhật tiểu sử, hệ thống kết bạn và gửi lời mời qua mạng xã hội.
- **Khoảng trống cần bổ sung:**
  1. **Bộ Huy Hiệu & Thành Tựu Danh Dự (Achievements System):**
     - Hệ thống 10-15 huy hiệu mở khóa tự động:
       - 📖 *Mọt Sách:* Đọc 10, 50, 100 chương.
       - ✍️ *Khởi Nghiệp:* Đăng tải chương truyện đầu tiên.
       - ⭐ *Nhà Phê Bình:* Viết 5 bài đánh giá được chấp thuận.
       - ☕ *Bạn Đồng Hành:* Có 5 người bạn trên nền tảng.
       - 🌙 *Cú Đêm:* Đọc truyện sau 0h đêm.
  2. **Dòng thời gian hoạt động (Activity Timeline):**
     - Hiển thị các mốc hoạt động gần nhất của người dùng: *Vừa hoàn thành truyện X*, *Đạt cấp bậc Cao Thủ Wibu*, *Đăng bài trên Diễn đàn*.
  3. **Trưng bày Tác phẩm tâm đắc:**
     - Cho phép độc giả ghim 1 tác phẩm mình yêu thích nhất lên đầu trang cá nhân.

---

### 2.9. Bảng Quản Trị & Điều Phối (`ModDashboard.tsx` & `AdminDashboard.tsx`)

#### Đánh giá hiện trạng:
- **Ưu điểm:** Duyệt chương pending, xử lý bình luận vi phạm, khóa tài khoản, tạo sự kiện, gộp thẻ tag.
- **Khoảng trống cần bổ sung:**
  1. **Hộp thư Báo cáo Tác phẩm (Novel Violation Reports):**
     - Nhận và xử lý các báo cáo vi phạm bản quyền hoặc nội dung độc hại gửi từ trang NovelDetail.
  2. **Nhật ký thao tác quản trị (Audit Logs):**
     - Ghi nhận lịch sử: Admin nào đã duyệt/khóa tài khoản nào, vào thời gian nào để tránh lạm quyền.

---

### 2.10. Thanh Điều Hướng & Trải Nghiệm Toàn Cục (`Header.tsx` & `App.tsx`)

#### Đánh giá hiện trạng:
- **Điểm nghẽn UX lớn nhất hiện tại:**
  - Phần `<nav className="header-nav" id="header-nav-links">` trên Desktop đang để trống. Người dùng Desktop muốn sang trang Diễn Đàn, Tủ Sách, hay Studio bắt buộc phải bấm nút 3 gạch (Drawer) mở thanh trượt bên trái.
- **Cải tiến bắt buộc:**
  1. **Hiển thị Menu chính trực tiếp trên Header Desktop:**
     - `[Trang Chủ] • [Khám Phá] • [Tủ Sách] • [Diễn Đàn]`
     - Nếu có quyền: Thêm badge truy cập nhanh `[Studio Tác Giả]` hoặc `[Bàn Làm Việc]`.
     - Chỉ sử dụng Burger Drawer khi màn hình nhỏ (Mobile/Tablet).
  2. **Nút Back-to-Top Nổi (Floating Scroll Button):**
     - Nút tròn tối giản xuất hiện ở góc dưới bên phải khi cuộn chuột quá 400px, bấm vào sẽ cuộn mượt mà (smooth scroll) lên đỉnh trang.
  3. **Toast Notification đồng bộ:**
     - Thiết kế lại toast thông báo với animation trượt nhẹ nhàng, có icon trạng thái (Success, Info, Warning).

---

## 3. Kiến Trúc Dữ Liệu & Hậu Cần Cần Bổ Sung

Để phục vụ các tính năng trên một cách bền vững mà không làm xáo trộn cấu trúc DB hiện tại:

```
┌──────────────────────────────────────────────────────────────────┐
│                 BỔ SUNG BẢNG & TRƯỜNG DỮ LIỆU                     │
├──────────────────────────────────────────────────────────────────┤
│ 1. Bảng `daily_checkins`:                                        │
│    - `user_id` (INT, FK)                                         │
│    - `checkin_date` (DATE, UNIQUE per user_id)                   │
│    - `streak_count` (INT, default 1)                             │
│                                                                  │
│ 2. Bảng `user_achievements`:                                     │
│    - `user_id` (INT, FK)                                         │
│    - `badge_key` (VARCHAR 50)                                    │
│    - `unlocked_at` (DATETIME)                                    │
│                                                                  │
│ 3. Bảng `chapter_reactions`:                                     │
│    - `chapter_id` (INT, FK)                                      │
│    - `user_id` (INT, FK)                                         │
│    - `reaction_type` (VARCHAR 20: 'heart', 'applause', 'fire')   │
│                                                                  │
│ 4. Bổ sung trường `reports`:                                     │
│    - Hỗ trợ thêm `target_type` ('comment' | 'novel')             │
│    - `novel_id` (INT, NULLABLE)                                  │
└──────────────────────────────────────────────────────────────────┘
```

> **Lưu ý:** Các tính năng như *Độ giãn dòng/Cỡ lề*, *Lịch sử xem gần đây*, *Thanh % tiến độ đọc*, *Đảo chiều danh sách chương* hoàn toàn có thể chạy bằng **LocalStorage & Client State** mà không cần sửa đổi Database, triển khai được ngay lập tức!

---

## 4. Lộ Trình Triển Khai Theo Giai Đoạn (Phased Roadmap)

```
        ┌─────────────────────────────────────────────────────────┐
        │  PHASE 1: Quick Wins & Tối Ưu Điều Hướng (Ưu tiên số 1) │
        │  - Navigation links trên Header Desktop                │
        │  - Nút Back-to-Top nổi                                  │
        │  - Nút "Đọc tiếp 1 chạm" trên Novel Card & Tủ sách      │
        │  - Nút Chia sẻ/Copy link & Đảo chiều danh sách chương  │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  PHASE 2: Nâng Cấp Trình Đọc & Tủ Sách Cá Nhân          │
        │  - Thanh tiến độ cuộn trang (% Reading Progress)        │
        │  - Tùy chỉnh Giãn dòng & Độ rộng lề trang               │
        │  - Hệ thống Tab (Đang đọc / Đã lưu / Đã xong) trong Tủ  │
        │  - Khối "Tác phẩm tương tự" ở chân trang NovelDetail    │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  PHASE 3: Gamification & Giữ Chân Người Dùng             │
        │  - Widget Điểm danh hàng ngày (Daily Check-in) nhận XP  │
        │  - Bộ lọc chuyên sâu tại trang Explore (Grid/List)      │
        │  - Hệ thống Huy hiệu & Thành tựu tại UserProfile        │
        │  - Đọc truyện giọng AI (Web Speech API)                 │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  PHASE 4: Công Cụ Tác Giả & Hoàn Thiện Kiểm Duyệt       │
        │  - Chuyển trạng thái truyện trong Studio                │
        │  - Phân loại chương Nháp / Đã xuất bản                  │
        │  - Báo cáo vi phạm tác phẩm gửi tới Moderator           │
        └─────────────────────────────────────────────────────────┘
```

---

### Phase 1: Quick Wins & Tối Ưu Điều Hướng (Ưu tiên cao nhất)
*Thời gian ước tính: 1 - 2 ngày | Tác động ngay lập tức đến độ mượt mà*

- [x] **1.0.** Tinh chỉnh Bố cục Trang Chủ ([Home.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/Home.tsx)):
  - Đưa "Chương Mới Cập Nhật" lên ngay dưới Banner Sự Kiện để độc giả đón đọc chương mới tức thì.
  - Hợp nhất 2 widget Sidebar ("Bình Luận Mới" & "Đánh Giá Mới") thành 1 Bento tabbed duy nhất: "Ý Kiến & Đánh Giá Mới".
  - Ghim cố định cụm Sidebar dưới (`.sidebar-sticky-cluster`) với `position: sticky; top: 80px` chống trống trải khi cuộn sâu.
  - Tinh gọn khối chào mừng độc giả mới (0 lịch sử đọc) thành banner ngang thanh lịch.
  - 100% tuân thủ icon đơn sắc SVG (`currentColor`).
- [ ] **1.1.** Cập nhật [Header.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/components/Header.tsx): Thêm hàng link điều hướng trực tiếp trên Desktop (`Trang Chủ`, `Khám Phá`, `Tủ Sách`, `Diễn Đàn`, `Studio`).
- [ ] **1.2.** Thêm component nút **Back-to-Top** nổi ở góc phải màn hình, tự động xuất hiện khi cuộn chuột.
- [ ] **1.3.** Nâng cấp Novel Card tại [Home.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/Home.tsx): Thêm nút *"Đọc tiếp Ch.X"* nhảy thẳng vào Reader nếu có lịch sử đọc.
- [ ] **1.4.** Cập nhật [NovelDetail.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/NovelDetail.tsx):
  - Nút Copy Link / Chia sẻ tác phẩm kèm Toast.
  - Nút đảo chiều thứ tự danh sách chương (`Cũ nhất` ↔ `Mới nhất`).

---

### Phase 2: Nâng Cấp Trình Đọc & Tủ Sách Cá Nhân
*Thời gian ước tính: 2 - 3 ngày | Tối ưu hóa trải nghiệm đọc cốt lõi*

- [ ] **2.1.** Cập nhật [ChapterReader.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/ChapterReader.tsx):
  - Tích hợp thanh % Reading Progress Bar ghim cố định ở đầu trang.
  - Thêm tùy chọn giãn dòng (`1.6x`, `1.8x`, `2.0x`) và độ rộng văn bản (`Hẹp`, `Chuẩn`, `Rộng`).
  - Nút mở nhanh mục lục dạng icon nổi khi cuộn sâu.
- [ ] **2.2.** Cập nhật [Library.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/Library.tsx):
  - Chia 3 Tab: `Đang đọc` (theo dõi tiến độ dở), `Đã lưu` (bookmark), `Hoàn thành`.
  - Nút bấm trực tiếp "Đọc tiếp" và "Xóa khỏi tủ" ngay trên card.
- [ ] **2.3.** Cập nhật chân trang [NovelDetail.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/NovelDetail.tsx):
  - Hiển thị khối *"Tác phẩm cùng thể loại đề xuất"* giúp người đọc không bị cụt dòng trải nghiệm.

---

### Phase 3: Gamification & Tương Tác Giữ Chân Người Dùng
*Thời gian ước tính: 3 - 4 ngày | Tăng tương tác và retention*

- [ ] **3.1.** Tích hợp tính năng **Điểm Danh Hàng Ngày (Daily Check-in)**:
  - Thẻ Bento điểm danh trên Trang chủ hoặc Sidebar.
  - Tặng ngay +50 XP khi bấm điểm danh, lưu trữ chuỗi ngày liên tục.
- [ ] **3.2.** Nâng cấp bộ lọc [Explore.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/Explore.tsx):
  - Lọc theo tình trạng (Đang ra / Hoàn thành).
  - Lọc theo số lượng từ / dung lượng.
  - Công tắc chuyển đổi giữa giao diện Lưới (Grid) và Danh sách (List).
- [ ] **3.3.** Tích hợp hệ thống **Thành tựu & Huy hiệu (Badges)** vào [UserProfile.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/UserProfile.tsx).
- [ ] **3.4.** Thử nghiệm tính năng **Đọc giọng nói AI (Text-to-Speech)** trong Reader bằng Web Speech API.

---

### Phase 4: Công Cụ Sáng Tác Nâng Cao & Quản Trị
*Thời gian ước tính: 2 - 3 ngày | Hoàn thiện hệ sinh thái tác giả*

- [ ] **4.1.** Nâng cấp [AuthorStudio.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/AuthorStudio.tsx):
  - Cho phép tác giả đổi trạng thái truyện (`Đang tiến hành`, `Tạm ngưng`, `Hoàn thành`).
  - Tách tab quản lý chương đã đăng vs chương nháp.
- [ ] **4.2.** Nâng cấp hệ thống Báo cáo:
  - Bổ sung nút "Báo cáo tác phẩm" ở [NovelDetail.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/NovelDetail.tsx).
  - Moderator tiếp nhận và phê duyệt/xử lý tại [ModDashboard.tsx](file:///c:/Users/VTS/.gemini/antigravity/scratch/mugenbunko-react/src/pages/ModDashboard.tsx).

---

## 5. Quy Chuẩn Thẩm Mỹ & Đảm Bảo Chất Lượng (Quality Checklist)

1. **Quy định BẮT BUỘC về Icon - Đơn Sắc (Monochrome Only):**
   - **Tuyệt đối không dùng emoji có màu hoặc icon đa sắc (colored/multi-color icons).**
   - 100% icon sử dụng SVG nét đơn (line-art / monochrome) với `stroke="currentColor"` hoặc `fill="currentColor"`.
   - Màu sắc icon tự động thích ứng chuẩn mực theo theme (`--text-main`, `--text-muted`, `--border-color`) giữa các chế độ Washi / Sepia / Charcoal.
2. **Giữ trọn bản sắc Bento Box & Văn hóa Á Đông:**
   - Sử dụng các token màu chuẩn: Nền Giấy Washi `#faf8f5`, Giấy Cổ Sepia `#efe5cc`, Đêm Than Charcoal `#121214`.
   - Giữ các yếu tố biểu trưng (watermark chữ Hán, viền mờ 1px, bo góc tinh tế).
3. **Không làm gián đoạn mã nguồn hiện có (Backward Compatibility):**
   - Mọi cải tiến đều tương thích với cấu trúc state và API backend hiện hữu.
   - Các tính năng mới có fallback an toàn khi mất mạng hoặc chưa đăng nhập.
4. **Hiệu năng & Khả năng phản hồi (Responsive):**
   - Đảm bảo giao diện co giãn hoàn hảo từ Mobile (375px) đến UltraWide (1920px).
   - Tận dụng `localStorage` cho các cài đặt giao diện để tối ưu tốc độ phản hồi tức thì.

---
*Tài liệu này được lưu trữ tại gốc dự án (`UPDATE_PLAN.md`) nhằm mục đích theo dõi và hiện thực hóa từng giai đoạn nâng cấp.*

## Đợt nâng cấp ưu tiên cao — 11/10/2026

- [x] Đồng bộ tiến độ đọc theo tài khoản, mã chương và vị trí đoạn văn; giữ vị trí trên thiết bị và thử lại khi có mạng.
- [x] Bộ sưu tập cá nhân: tạo/sửa/xóa kệ, chọn bìa từ tác phẩm, thêm/bỏ truyện, đặt riêng tư hoặc chia sẻ công khai bằng liên kết.
- [x] Tủ sách và Reader theo phong cách Washi/Sakura; thẻ truyện dùng chung, trạng thái đang tải/lỗi có nút thử lại, điều khiển bàn phím trong hộp thoại.
- [x] Studio giữ 50 phiên bản nội dung gần nhất, xem trước và khôi phục thành bản nháp; bảo toàn cả nội dung đang viết chưa lưu.
- [x] Tách “Đã đọc kịp” với “Đã đọc xong”; xác nhận hoàn thành sau thời gian đọc và tiến độ cuối chương; server cộng 50 XP một lần cho mỗi chương.

Các bảng mới được tạo tự động khi backend khởi động. Lịch sử cũ giữ vị trí chương; danh sách chương từng mở trước đây không được tự coi là đã đọc xong. XP hiện có được giữ nguyên.

Kiểm tra bằng `npm run test:upgrades` và `npm run test:upgrades:browser`. Các bài kiểm tra API/trình duyệt dùng database MySQL tạm riêng và dọn database sau khi chạy. Ảnh giao diện được lưu ở `artifacts/upgrades/`.
