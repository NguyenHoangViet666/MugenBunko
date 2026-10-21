# Luồng và hợp đồng UX web

Đọc phần tương ứng với màn hình đang sửa. Đây là snapshot source ngày 2026-10-21; các điểm cải thiện bên dưới chưa phải hành vi đã triển khai.

## Shell, điều hướng, đăng nhập

`src/App.tsx` giữ state trang, hash route, session, API helper, toast và nhiều modal rồi truyền props/callback xuống page. Những điểm cần đọc: `getInitialRoute`, `handleHashChange`, effect đồng bộ view→hash, `fetchWithAuth`, `startReading`, `openNovelDetail`.

Route chính: `#/`, `#/explore`, `#/forum`, `#/library`, `#/novel/:id`, `#/novel/:id/reader/:index`, `#/studio`, `#/profile/:username`, `#/collection/:shareId`. Forum còn có trạng thái mở bài viết được đồng bộ hash trong App; xem logic hiện tại trước khi thêm deep link.

Giữ khả năng back/forward/reload/deep link. Library/Studio/Profile cá nhân yêu cầu session; mod/admin có quyền riêng. UI ẩn thao tác không thay thế quyền backend. Khi cần đăng nhập để thực hiện hành động, giữ ngữ cảnh và dữ liệu nhập có thể giữ được.

`MobileGateOverlay` hiện hiển thị ở width ≤768 hoặc mobile user agent; lựa chọn tiếp tục web lưu trong sessionStorage `mugen_mobile_bypass`. Nó là chính sách hiện tại, không phải mẫu bắt buộc cho dự án khác. Nội dung quảng bá tính năng trong gate không chứng minh tính năng mobile đã sẵn sàng.

## Khám phá → chi tiết → đọc

Nguồn: `src/pages/Home.tsx`, `Explore.tsx`, `NovelDetail.tsx`, `src/components/NovelShelfCard.tsx`.

- Home có vùng đọc tiếp dựa trên tiến độ thật; CTA phải mở đúng chapter đang đọc. Hạn chế cạnh tranh giữa các hero, banner và block thống kê khi bổ sung nội dung.
- Explore lọc tác phẩm có chương `published`; tìm theo title/author/tags, có type/genre/status/sort và phân trang 12. Khi đổi filter, kiểm tra reset trang, số kết quả và cách xóa filter. Không biến draft thành tác phẩm công khai để lấp grid.
- Card ưu tiên bìa → tên → tác giả → thông tin đọc. Title dài được clamp có chủ đích; dữ liệu dài không đè bookmark hoặc CTA. Hành động đọc, mở chi tiết và bookmark là các control riêng, không lồng button/link.
- Chi tiết cần synopsis, mục lục theo volume, tiến độ và CTA phù hợp. Giữ comments/reviews/report cùng điều kiện hiện hành.
- `NovelDetail` dùng `readingProgress.chapterIndex` để đọc tiếp cho cả khách và tài khoản, kể cả chương cuối hoặc chưa có chương hoàn thành. Giữ tách biệt completion count dùng cho điều kiện review; hoàn thành ba chương không có nghĩa đang đọc index 3.

## Reader: bảo toàn vị trí quan trọng hơn trang trí

Nguồn: `src/pages/ChapterReader.tsx`, `src/hooks/useReadingSync.ts`, `src/utils/readingProgress.ts`, `src/styles/reader-library.css`.

Index trên URL/props là index trong danh sách chương đã lọc `published`. ID chapter dùng cho API và persistence; không đánh đồng ID với index. Reader tải nội dung riêng qua `/chapters/:id` với abort khi đổi chương và render HTML qua DOMPurify; giữ sanitization khi thay cách render.

Vị trí được ghi theo `chapterId`, `chapterIndex`, `scrollRatio`, `paragraphIndex`, `paragraphOffset`. Restore chờ `document.fonts.ready`, ưu tiên đoạn rồi fallback ratio. Không thay thứ tự block, chèn nội dung phía trên, reset scroll hoặc đổi React key tùy tiện khi chỉ đổi màu/toolbar. Khi thay font/spacing, kiểm tra người đọc vẫn trở về đoạn hợp lý.

Giữ TOC, prev/next có disabled ở biên, theme, serif/sans, cỡ chữ, spacing, Zen và trạng thái sync. Phím Left/Right không được đổi chương khi người dùng nhập vào form/contentEditable. TOC đóng cần ra khỏi keyboard navigation; toolbar ẩn trong Zen phải mở được bằng focus.

Khách có tiến độ local; tài khoản có đồng bộ. Thông báo phân biệt đang lưu/chưa đồng bộ/đã đồng bộ. Không hiển thị đã lưu cloud khi mất mạng. Giữ session/completion/reward logic; đổi UI không tự tăng lượt đọc hoặc đánh dấu hoàn thành.

## Tủ sách và bộ sưu tập

Nguồn: `src/pages/Library.tsx`, `PublicCollection.tsx`, `src/components/CollectionShelves.tsx`, `NovelShelfCard.tsx`.

Library kết hợp bookmark và tiến độ để chia all/reading/caught-up/completed/unread, có search/sort và sync. Phân biệt tủ sách trống (CTA khám phá), bộ lọc không có kết quả (reset) và lỗi API (retry).

Bộ sưu tập có selected state, tạo/sửa, thêm truyện, public/private, copy link và quyền truy cập public. Lựa chọn public cần mô tả người có link xem được gì; khi thu hồi chia sẻ, giữ trạng thái tương ứng trên trang public. Đừng thay đổi phạm vi chia sẻ như tác dụng phụ của chỉnh layout.

## Diễn đàn và cộng đồng

Nguồn: `src/pages/Forum.tsx`, `server/routes/forum.ts`, `src/types/index.ts`.

Feed tải danh sách bằng `/forum/posts?comments=none`; `fetchArrayPages` đọc `X-Next-Page`. Chi tiết/comments tải khi mở bài, đừng chuyển thành tải comments cho toàn feed chỉ vì đổi card. Giữ sort/filter/category, thứ tự ưu tiên thông báo hiện có, likes, comment count và affordance mở bình luận; không tự thêm thao tác ghim nếu chưa có hợp đồng API.

Viết bài/bình luận có đăng nhập, upload, rich text và busy state. Giữ bản nhập khi lỗi, phòng gửi lặp và chỉ cập nhật count theo kết quả API hoặc optimistic update có rollback. Đọc route thật trước khi đổi payload hay category; file backend là hợp đồng, không thuộc phạm vi thay đổi UI mặc định.

Feed có `PageError` và retry riêng khi tải danh sách thất bại; chỉ hiện empty state sau request thành công không có kết quả. Giữ dữ liệu đã tải khi refresh lỗi. Với thread lồng nhau, giữ tên người trả lời, thứ tự đọc và label cho like/reply/menu.

## Author Studio và dashboard

Nguồn: `src/pages/AuthorStudio.tsx`, `src/components/RichTextEditor.tsx`, `ChapterVersionHistory.tsx`, `ScheduleModal.tsx`.

Studio tổ chức novel → volume → chapter; editor có `contentEditable`, refs và dấu `dataset.loadedChapterId` để không nạp đè nội dung đang gõ. Giữ selection, dirty state, save/autosave và trạng thái draft/pending/published/scheduled khi chỉnh toolbar/sidebar.

Lưu nháp, gửi duyệt, xuất bản và lên lịch là thao tác khác nhau; tên nút và phản hồi cần đúng với hành vi API. Version history có preview/restore và busy guard; restore cần bảo toàn bản đang viết theo logic hiện có. Kiểm tra chuyển chapter khi còn nội dung chưa lưu.

Với Mod/Admin, ưu tiên dữ liệu có thể scan, filter và hành động theo từng đối tượng. Giữ trạng thái pending/approved/rejected và quyền hiện hành. Không thêm KPI, doanh thu hoặc quyền chưa có dữ liệu thật để trang trông đầy đủ.
