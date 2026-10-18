# MugenBunko Mobile

Ứng dụng Expo dùng chung tài khoản, API và dữ liệu với web.

## Chạy trên điện thoại

```powershell
# Tại thư mục gốc repo: chạy backend
npm --prefix server run dev

# Trong terminal khác
cd mobile
npm install
Copy-Item .env.example .env
npm start
```

Đặt `EXPO_PUBLIC_API_URL` trong `.env` thành URL backend, ví dụ `http://192.168.1.10:5000`. Có thể kèm `/api`; client tự chuẩn hoá. Điện thoại và máy chạy backend cần truy cập được nhau. Khi không khai báo URL ở development, app lấy host từ Metro; Android Emulator dùng `10.0.2.2` khi không có host Metro. Sau khi sửa `.env`, chạy `npm start -- --clear`; khi xuất bundle sang API khác, thêm `-- --clear` vào lệnh export để tránh dùng URL trong cache cũ.

`EXPO_PUBLIC_WEB_URL` là địa chỉ web dùng cho liên kết chia sẻ bộ sưu tập. Production cần URL HTTPS thực tế. Biến `EXPO_PUBLIC_*` được đóng vào bundle và không được chứa bí mật.

App có thêm bộ chọn ảnh, xử lý ảnh và WebView cho trình soạn thảo. Với development build đã cài trước đây, chạy lại `npm run android` hoặc `npm run ios` để cập nhật module native. Build iOS cần macOS và Xcode. Có thể dùng Expo Go tương thích với SDK của dự án để thử các module được hỗ trợ.

## Các luồng đã có

- Đăng nhập, đăng ký và xác thực email OTP.
- Trang chủ, tìm kiếm theo tên/tác giả/tag, lọc thể loại và sắp xếp.
- Chi tiết truyện, mục lục theo tập, bookmark đồng bộ với web.
- Đọc và chuyển chương; ảnh minh hoạ và định dạng; khôi phục vị trí theo đoạn; cỡ chữ, font, màu nền và giãn dòng.
- Tủ sách cập nhật khi quay lại; tách đang đọc và toàn bộ lịch sử.
- Bộ sưu tập: tạo/sửa/xoá kệ, thêm/bỏ truyện, ảnh bìa, công khai/riêng tư và chia sẻ.
- Diễn đàn: phân trang, tạo bài có ảnh, xem chi tiết, thích, trả lời bình luận, xoá bài của mình; admin giới hạn bình luận.
- Bình luận truyện, trả lời, báo cáo bình luận và gửi/cập nhật đánh giá sao.
- Hồ sơ người dùng, theo dõi tác giả, tìm bạn và gửi/chấp nhận/huỷ lời mời kết bạn.
- Chat realtime, trạng thái online, lịch sử tin nhắn phân trang và tải lại khi kết nối trở lại.
- Studio: tạo/sửa/xoá truyện, quản lý tập/chương, soạn trực quan, ảnh từ thư viện, tự lưu nháp trên máy, gửi duyệt, hẹn giờ, xem và khôi phục phiên bản, thông báo tới độc giả.
- Kiểm duyệt: đọc/duyệt/trả chương về nháp, xử lý báo cáo bình luận.
- Quản trị: khoá/mở tài khoản và truyện, phân quyền, duyệt tác giả, sự kiện, nội quy, thể loại và gộp tags.
- Thông báo cá nhân, đánh dấu đã đọc, sự kiện, tin tác giả và nội quy cộng đồng.
- Sửa hồ sơ, giao diện sáng/tối/theo thiết bị; tab bar tính safe area và lưới điện thoại/tablet.

Mở Studio, bạn bè/chat, thông báo, bộ sưu tập và quản trị từ tab **Cá nhân**. Tủ sách có lối vào bộ sưu tập; diễn đàn có lối vào chat. Màn hình quản trị hiển thị theo vai trò; backend kiểm tra quyền trên các thao tác.

## Lưu và đồng bộ

Tiến độ và bản nháp được tách theo ID tài khoản. Vị trí đọc được lưu cục bộ trước; cập nhật chưa gửi sẽ thử lại khi đọc tiếp hoặc mở lại trang chủ/tủ sách. Server dùng thời điểm cập nhật để tránh vị trí cũ ghi đè vị trí mới. Bookmark và bộ sưu tập lưu qua server; thay đổi các mục này cần mạng.

Chương được ghi nhận hoàn thành qua phiên đọc server khi app đang hoạt động, đủ thời gian và đã tới cuối chương. Mở chương cuối không tự được tính hoàn thành cả truyện. Bản nháp Studio chưa gửi được lưu riêng và có lựa chọn khôi phục khi mở lại.

Dữ liệu cục bộ kiểu cũ dùng chung trên máy được giữ nguyên trong các key cũ; app không tự gán dữ liệu đó cho tài khoản khác. Nút xoá bộ nhớ tiến độ chỉ xoá cache của tài khoản hiện tại trên máy; lịch sử server sẽ tải lại khi đồng bộ.

## Kiểm tra

```powershell
npm run typecheck
npm run export:web
npm run export:android
npm run export:ios

# Từ thư mục gốc repo: kiểm tra với database thử nghiệm tách biệt
npm run test:mobile
npm run test:mobile:browser
```

Các kiểm tra API và trình duyệt cần MySQL theo cấu hình `server/.env`; chúng dùng database thử nghiệm tách biệt và tự dọn sau khi chạy. Kiểm tra trình duyệt xuất Expo web với backend thử nghiệm, mô phỏng điện thoại/tablet và lưu ảnh vào `artifacts/mobile/`. Mặc định dùng Edge trên Windows; đặt `UPGRADE_BROWSER_PATH` nếu cần trỏ tới Chromium khác.

Bundle trong `mobile/dist/` là kết quả đóng gói JavaScript, không phải APK/IPA đã ký. Trước khi phát hành, kiểm tra trên Android/iOS thật: bàn phím, chọn ảnh, soạn chương, thao tác chạm, chuyển nền và khôi phục phiên. Kiểm tra trình duyệt không thay thế kiểm tra thiết bị native.

Các lệnh export chạy từng nền tảng với một worker để giảm bộ nhớ. Trên máy Windows ít RAM trống, có thể đặt `$env:NODE_OPTIONS='--max-old-space-size=640'` trước khi xuất; cấu hình này đã dùng để kiểm tra bundle Android/iOS trong môi trường phát triển hiện tại.
