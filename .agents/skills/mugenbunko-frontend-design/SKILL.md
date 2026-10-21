---
name: mugenbunko-frontend-design
description: "Thiết kế, triển khai và review frontend UI/UX cho MugenBunko: React web hoặc Expo mobile, phong cách thư viện Nhật Washi/Sakura/Charcoal, luồng khám phá truyện, đọc, tủ sách, diễn đàn và Studio. Dùng khi thêm trang/component hoặc cải thiện giao diện của dự án; cũng dùng khi người dùng yêu cầu áp dụng phong cách MugenBunko vào frontend khác. Không áp dụng cho công việc backend thuần túy."
---

# MugenBunko Frontend Design

Thiết kế như một thư viện Nhật hiện đại: nền giấy ấm, chữ màu mực, bố cục có nhịp thở, bìa truyện làm trọng tâm, Sakura nhấn nhẹ. Ưu tiên tìm được truyện, đọc thoải mái và quay lại đúng chỗ đang đọc.

Hướng dẫn viết bằng tiếng Việt; giữ tên API, component và token như trong mã nguồn. Các đường dẫn `src/`, `server/`, `mobile/`, `tests/` trong references tính từ root project đang làm việc, không phải thư mục cài skill.

## Chọn đúng ngữ cảnh

- **Web React:** đọc [design-system.md](references/design-system.md), sau đó đọc phần liên quan trong [ux-patterns.md](references/ux-patterns.md).
- **Expo / React Native:** đọc [mobile.md](references/mobile.md); dùng primitive, palette và navigation của mobile. Không mang CSS/DOM của web sang native.
- **Review UI/UX:** kiểm tra đúng màn hình và luồng được yêu cầu; dùng [review-checklist.md](references/review-checklist.md). Phân biệt lỗi quan sát được với đề xuất thiết kế.
- **Project khác có yêu cầu phong cách MugenBunko:** giữ nền giấy, phân cấp chữ và nhịp đọc; thích nghi với stack, thương hiệu và nghiệp vụ đích. Không tự tạo route, API hoặc mobile gate của MugenBunko.

## Hiểu màn hình trước khi vẽ

Đọc trang/component gần nhất và CSS thực sự được import. Xác định tác vụ chính, người dùng/role, điểm vào, điểm thoát, dữ liệu và hành động thật. Với thay đổi rõ ràng, tự chọn giải pháp phù hợp rồi triển khai; chỉ hỏi khi thiếu thông tin làm thay đổi đáng kể kết quả.

Nêu ngắn gọn ý định thiết kế trước khi sửa: tác vụ cần làm dễ hơn, bố cục dự kiến và component sẵn có sẽ tái sử dụng. Không biến chỉnh sửa nhỏ thành một vòng tài liệu hoặc thiết kế lại toàn ứng dụng.

Thông tin trong references được trích từ project ngày 2026-10-21. Đọc lại file hiện tại trước khi sửa; code mới và yêu cầu của người dùng được ưu tiên hơn snapshot. README có thể mô tả phong cách cũ.

## Ra quyết định thiết kế

- Web: dùng `--bg-base`, `--bg-card`, `--text-main`, `--text-content`, `--border-color`, `--reader-bg` thay cho màu nền/chữ hardcode. Native: lấy palette qua hook hiện có. Token mới cần có giá trị phù hợp trong các theme mà màn hình hỗ trợ.
- Mặc định dùng CTA màu mực; web theo `.primary-btn`, native theo primitive và palette trong reference mobile. Giữ biến thể theo ngữ cảnh đang có, như CTA Sakura trên hero tối của Home. Sakura còn dùng cho nhấn chọn, trạng thái, focus và nhận diện. Khi cần đổi thương hiệu, làm theo yêu cầu cụ thể của người dùng.
- Dùng serif cho tiêu đề/nội dung đọc, sans cho điều khiển/metadata; kiểm tra tiếng Việt có dấu và font fallback. Thu hẹp số cột, rút gọn metadata trước khi giảm cỡ chữ để nhét nội dung.
- Tạo phân cấp bằng typography, khoảng cách, đường viền mảnh và nền; ảnh bìa giữ tỷ lệ chân dung. Hero và trang trí chỉ xuất hiện khi giúp tác vụ hoặc nội dung của màn hình.
- Chọn một hành động chính theo ngữ cảnh: khám phá, đọc tiếp, đăng bài hoặc lưu nháp. Đặt hành động phụ cạnh đúng đối tượng; hành động xóa cần tách khỏi thao tác thường dùng.
- Tái sử dụng component có sẵn trước khi tạo biến thể mới. Với web, CSS cần có phạm vi rõ ràng; đọc cascade cuối file trước khi sửa vì `src/index.css` có nhiều lớp override. Native theo StyleSheet và primitive hiện có.

## Bảo toàn UX khi triển khai

**Điều hướng và dữ liệu.** Web dùng hash navigation cùng state/callback của `src/App.tsx`. Giữ route, quyền, callback và hợp đồng props; không thêm router, store hoặc UI framework chỉ để thay giao diện. Nếu task đòi thay kiến trúc, thực hiện trong phạm vi đó. Kết nối hành động đến logic thật; mock chỉ phục vụ preview/test và phải được nói rõ.

**Trạng thái.** Thiết kế loading, error có retry, empty có bước tiếp theo, kết quả lọc rỗng có reset, trạng thái chưa đăng nhập/không đủ quyền và mutation đang chạy cho những phần thực sự có các trạng thái này. Giữ nội dung nhập khi request thất bại; thông báo thành công sau khi thao tác được xác nhận. Không dùng danh sách trống thay cho lỗi kết nối.

**Đọc truyện.** Giữ chapter index theo danh sách chương `published`, tiến độ theo chapter/paragraph và cơ chế restore của nền tảng; web chờ font tải xong, native dựa trên block layout. Giữ các control đã có trên nền tảng (web có theme/font/spacing/Zen/TOC) và local/cloud sync khi đổi layout. Không lấy số chương đã hoàn thành làm vị trí đọc tiếp. Tránh ảnh/trang trí tải muộn đẩy nội dung đọc nhảy vị trí; kiểm tra lại paragraph anchor sau thay đổi làm reflow.

**Soạn thảo.** Giữ refs, selection, nội dung chưa lưu, dirty/autosave và version history của editor. Không remount editor vì đổi tab phụ, màu hoặc layout. Chỉ quảng bá trạng thái đã lưu/đã xuất bản đúng với kết quả API.

**Tương tác.** Web dùng link cho điều hướng, button cho hành động; native dùng primitive/Pressable và navigation đang có cùng accessibility props. Tránh lồng phần tử tương tác. Card có bookmark/đọc nhanh cần các nút riêng và xử lý bubbling đúng. Icon action có accessible name, field có label, trạng thái chọn không chỉ dựa vào màu. Hành động quan trọng dùng được bằng bàn phím và touch trên nền tảng hỗ trợ, không phụ thuộc hover.

**Dialog.** Web tái sử dụng `useDialogFocus` khi phù hợp để focus, trap Tab, khóa scroll và trả focus; caller vẫn phải xử lý Escape. Native tái sử dụng `Sheet`/Modal theo flow hiện có, kiểm tra nút Back và keyboard. Gắn nhãn, giữ nút đóng/hủy và kiểm tra khi nội dung vượt chiều cao màn hình.

**Responsive.** Web hiện có mobile gate ở màn hình nhỏ/mobile user agent. Kiểm tra cả gate và web sau bypass; chỉ thay chính sách gate khi task yêu cầu. Ưu tiên nội dung chính, cho filter/action wrap, giữ nút dễ chạm và tránh fixed width gây tràn. Mobile app là frontend riêng.

## Xác minh rồi bàn giao

Chọn kiểm tra trong [review-checklist.md](references/review-checklist.md) theo phần đã đổi. Nếu có browser, xem render thật ở desktop/hẹp và các theme liên quan; kiểm tra luồng chính, bàn phím và trạng thái lỗi/rỗng. Không suy ra chất lượng render từ build thành công.

Khi chỉ tạo hoặc sửa skill, chạy validator của `skill-creator`, kiểm tra liên kết references và thử một yêu cầu thực tế. Không cần chạy toàn bộ test ứng dụng chỉ vì thay tài liệu skill.

Bàn giao ngắn gọn: thay đổi gì, giúp tác vụ nào, đã kiểm tra gì và giới hạn còn lại. Nếu chưa chạy được browser/backend/native device, nói rõ phạm vi kiểm tra đã thực hiện.
