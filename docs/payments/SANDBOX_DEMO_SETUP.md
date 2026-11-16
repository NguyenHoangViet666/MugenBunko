# Chuẩn bị merchant và tunnel thanh toán demo

Cập nhật **16/11/2026**, nhánh `codex/payment-integration`.

Chủ dự án chọn dùng tunnel HTTPS cho demo và chưa đăng ký merchant VNPAY Sandbox. MySQL92 local được giữ tắt theo yêu cầu; chưa khởi động backend, mở tunnel, tạo URL public hoặc gửi đăng ký merchant. Việc phát triển BE01 và service bằng fixture/provider test không phụ thuộc merchant đã được cấp.

## Thông tin đăng ký cần chuẩn bị

Người sở hữu merchant dùng [trang đăng ký VNPAY Sandbox](https://sandbox.vnpayment.vn/devreg/). Email nhận thông tin và nội dung khai trên form cần do chủ tài khoản xác nhận. Không dùng email giả, key demo công khai hoặc mặc định việc cấp merchant đã hoàn tất.

Mô tả dịch vụ dự thảo: **MugenBunko là hệ thống đọc và sáng tác tiểu thuyết phục vụ đồ án tốt nghiệp. Phạm vi thử nghiệm là mua gói xu nội bộ bằng VNPAY Sandbox, xem số dư và lịch sử giao dịch; chưa thu tiền thật.** Cần xác nhận phạm vi này với merchant được cấp, theo checklist hiện có.

Thông tin kỹ thuật đã chốt trong repo:

| Hạng mục | Giá trị dự kiến |
| --- | --- |
| Môi trường | Sandbox |
| Tiền tệ | VND |
| IPN | GET /api/payments/vnpay/ipn |
| Return | GET /api/payments/vnpay/return |
| Backend local | http://127.0.0.1:5000 theo cổng mặc định |
| Base URL public | URL HTTPS của phiên tunnel khi chạy demo |

Hai route callback hiện chưa tồn tại. Chỉ dùng địa chỉ callback để nghiệm thu sau khi có adapter và middleware phù hợp; HTTP 200 đơn thuần chưa chứng minh chữ ký, IPN hoặc cấp xu đúng.

## Tunnel đề xuất cho phiên demo

Cloudflare Quick Tunnel tạo URL HTTPS tạm thời mà không cần tài khoản hoặc domain. URL đổi mỗi lần tạo tunnel và ngừng hoạt động khi dừng tiến trình; dịch vụ này dành cho thử nghiệm, không có bảo đảm uptime. Vì vậy phải giữ nguyên phiên tunnel trong lượt demo và cập nhật callback đã đăng ký nếu hostname đổi. [Tài liệu Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Khi backend và callback đã sẵn sàng, có thể chạy bằng binary cloudflared từ [nguồn chính thức](https://developers.cloudflare.com/tunnel/downloads/):

```powershell
# Chỉ chạy khi đã chủ động mở lại môi trường demo và backend.
cloudflared tunnel --url http://127.0.0.1:5000
```

Lệnh này công khai dịch vụ local qua URL được cấp. IPN là request giữa server với server, nên đường IPN không dùng bước đăng nhập email tương tác của tunnel. Phần hạn chế truy cập và xác minh request thuộc cấu hình callback/adapter; không tắt auth hoặc CSRF của các route người dùng để làm IPN chạy.

Nếu merchant yêu cầu một callback hostname ổn định, cần chọn tunnel có hostname cố định trước khi đăng ký callback. Quick Tunnel phù hợp kiểm thử ngắn; chưa có bằng chứng VNPAY chấp nhận URL tạm của dự án.

## Đăng nhập và origin của bản web demo

Ưu tiên web và API cùng origin HTTPS trong buổi demo. Cookie hiện dùng SameSite=Strict; chỉ mở tunnel backend trong khi frontend vẫn ở localhost tạo luồng khác site, nên thêm CORS không tự làm cookie đăng nhập hoạt động. Nếu dùng Bearer token, cần kiểm chứng đúng luồng đã hỗ trợ thay vì đổi chính sách cookie để né lỗi.

`FRONTEND_URL` phải chứa đúng origin trình duyệt được phép, độc lập với `PUBLIC_URL` và PAYMENT_PUBLIC_BASE_URL. Khi chạy production, cấu hình hiện yêu cầu PUBLIC_URL và FRONTEND_URL dùng HTTPS. `TRUST_PROXY` phải khớp proxy thực tế; true hoặc dấu * bị code từ chối. Kiểm tra các giá trị này theo topology demo khi tunnel được bật, không đổi global config trong lúc môi trường local đang tắt.

## Cấu hình khi đã nhận thông tin merchant

Các biến mẫu nằm trong `server/.env.example`; giá trị thật chỉ đặt trong `server/.env` đang được Git bỏ qua. Không đưa HashSecret vào frontend, Git hoặc chat.

```dotenv
PAYMENTS_ENABLED=false
PAYMENT_PROVIDER=vnpay
PAYMENT_ENV=sandbox
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
PAYMENT_PUBLIC_BASE_URL=
PAYMENT_WEB_BASE_URL=
PAYMENT_NATIVE_RETURN_URL=mugenbunko://payment/result
```

`PAYMENT_PUBLIC_BASE_URL` là origin HTTPS của backend tunnel, không thêm path IPN hoặc Return vào biến này. `PAYMENT_WEB_BASE_URL` là đích web được cho phép; chốt cùng luồng Return khi triển khai VN03. Các biến hiện là contract dự kiến, chưa có validation runtime hoặc route checkout để bật thanh toán. Giữ PAYMENTS_ENABLED false tới khi VN01 triển khai và nghiệm thu.

## Thứ tự mở lại môi trường

Chưa chạy các bước này trong lúc chủ dự án muốn giữ MySQL tắt. Khi tiếp tục demo:

1. Bật lại MySQL92 bằng quyền Windows phù hợp, chạy preflight và audit chỉ đọc. Không dùng migrate:production như một bước kiểm tra.
2. Hoàn tất backend thanh toán bằng fixture, gồm idempotency và transaction cấp xu, rồi adapter xác minh callback.
3. Khởi động backend demo, mở tunnel và ghi lại URL của đúng phiên đang chạy.
4. Điền base URL, cấu hình/đăng ký callback tương ứng và kiểm tra HTTPS từ bên ngoài.
5. Chạy giao dịch Sandbox có bằng chứng order/ledger; đóng tunnel sau buổi demo.

Kiểm chứng MySQL 8.4 và 144 ca CI hiện có không thay thế bằng chứng merchant, IPN public hoặc một giao dịch Sandbox thực tế.
