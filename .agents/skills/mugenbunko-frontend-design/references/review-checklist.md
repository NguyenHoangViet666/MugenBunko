# Kiểm tra UI/UX theo phạm vi thay đổi

Không chạy mọi mục cho một chỉnh sửa nhỏ. Chọn luồng có rủi ro bị ảnh hưởng và ghi rõ kết quả thực tế.

## Render và tương tác

- Xem màn hình thật ở desktop khoảng 1440px và kích thước hẹp phù hợp. Với web narrow, kiểm tra mobile gate và bản web sau bypass; không coi gate là bằng chứng nội dung phía sau responsive.
- Kiểm tra các theme màn hình hỗ trợ, đặc biệt input, placeholder, disabled, overlay, progress và màu lỗi. Tương phản phải đo trên cặp màu/nền đang render khi còn nghi ngờ.
- Dùng title tiếng Việt dài, author dài, ảnh thiếu/bị lỗi và nội dung ít/nhiều. Không tràn ngang, đè CTA, vỡ grid hoặc ép metadata thành chữ quá nhỏ.
- Kiểm tra clipping bằng mắt và bounding box của các action chính. `overflow-x: hidden` có thể che lỗi; `scrollWidth <= innerWidth` chưa đủ nếu layout viewport tự rộng hơn màn hình/visual viewport.
- Tab qua tác vụ chính; thấy focus, Enter/Space hoạt động đúng, không keyboard trap. Modal có tên, đóng/hủy, Escape theo caller, trả focus và scroll hợp lý.
- Thử touch/viewport hẹp cho thao tác từng chỉ có hover. Hover decoration không được là đường duy nhất tới hành động.
- Kiểm tra reduced motion của animation được thêm/sửa, tránh chuyển động liên tục quanh nội dung đọc; ảnh có kích thước ổn định để hạn chế layout shift.

## Trạng thái và luồng

| Khi đổi | Kiểm tra có ý nghĩa |
| --- | --- |
| Fetch/list/filter | Loading → success; lỗi → retry; empty khác error; filter rỗng → reset; trang hiện tại hợp lệ |
| Form/mutation | Busy/khóa gửi lặp; API lỗi giữ input; thành công có phản hồi đúng; rollback nếu optimistic |
| Navigation | Link trực tiếp, reload, back/forward, guest và role phù hợp |
| Reader/resume | Đi tới đúng published chapter; đọc dở → rời → quay lại; đổi font/theme; local/cloud sync không mất vị trí |
| Library/collections | Tab/search, kệ trống, thêm/xóa truyện, public link và thu hồi chia sẻ |
| Forum | Mở bài, tải comments theo nhu cầu, like/reply, lỗi feed, nội dung nhập sau lỗi |
| Studio | Đổi chapter, dirty/autosave, giữ selection, preview/restore version, nháp/gửi duyệt/xuất bản |

## Lệnh theo mức ảnh hưởng

Đọc `package.json` hiện tại trước khi chạy. Với frontend web, `npm run build` kiểm tra bundling nhưng không thay thế TypeScript/lint/browser.

```powershell
npm run build
npm run typecheck
```

Khi sửa logic/components, chạy ESLint đúng file đã đổi, ví dụ `npx eslint src/components/NovelShelfCard.tsx`. Repo có legacy code; phân biệt lỗi có sẵn với lỗi do thay đổi, không mở rộng thành dọn lint toàn repo nếu không được yêu cầu.

Khi đổi reading-progress/library/version-history và backend test environment sẵn sàng:

```powershell
npm run test:upgrades
npm run test:upgrades:browser
```

Browser suite dùng Edge/CDP và MySQL fixture, tạo database test riêng và screenshot ở `artifacts/upgrades/`. Kiểm tra prerequisites của `server/tests/fixture.ts` trước khi chạy; không chạy script reset/migrate/seed production để phục vụ preview UI.

Nếu cần preview không có backend, dùng dữ liệu mẫu cục bộ trong fixture hoặc browser interception, không cài mock vào flow sản phẩm. Nêu rõ kiểm tra bố cục bằng mock chưa xác minh quyền/API/persistence thật. Không thay dữ liệu thật chỉ để màn hình demo đầy hơn.

## Khi chỉ sửa skill

Chạy `quick_validate.py` từ skill-creator trên thư mục skill, xác minh YAML metadata, mọi reference link và source path còn tồn tại. Thử một yêu cầu web/mobile thực tế để xem skill chọn đúng stack và giữ luồng. Không cần chạy test/build ứng dụng nếu mã sản phẩm không đổi.

## Cách báo kết quả

Báo thay đổi chính, lợi ích cho tác vụ và kiểm tra đã chạy. Với review, đưa phát hiện có file/vị trí và tác động; gọi phần chưa quan sát là rủi ro hoặc đề xuất. Nói rõ browser dùng mock, backend chưa chạy hoặc native device chưa kiểm tra khi các giới hạn đó thực sự áp dụng.
