# Checklist merchant VNPAY Sandbox

Đối chiếu tài liệu chính thức ngày **28/10/2026**. T01 chỉ chuẩn bị checklist; chưa đăng ký tài khoản merchant, gửi thông tin đăng ký hoặc gọi gateway.

## Thông tin cần chuẩn bị

- [ ] Người sở hữu merchant chọn email nhận thông tin và thông tin website/dịch vụ dùng đăng ký.
- [ ] Đăng ký tại [trang sandbox VNPAY](https://sandbox.vnpayment.vn/devreg/), nhận thông tin của chính merchant.
- [ ] Có `vnp_TmnCode` và `vnp_HashSecret` dùng cho môi trường test.
- [ ] Xác nhận mô hình mua xu nội bộ của MugenBunko phù hợp phạm vi merchant được cấp.
- [ ] Chuẩn bị base URL HTTPS public cho backend callback.
- [ ] Chốt IPN `GET /api/payments/vnpay/ipn` và Return `GET /api/payments/vnpay/return`, đăng ký/xác nhận cấu hình tương ứng.
- [ ] Xác nhận sử dụng được API query cho đối soát; thử với tham chiếu đã lưu khi tới VN04.
- [ ] Chốt bộ thông tin test và các ca yêu cầu từ phía merchant trước nghiệm thu sandbox.

Các path trên là hợp đồng dự kiến, chưa tồn tại trong app. Không coi URL localhost hoặc việc điền biến môi trường là bằng chứng IPN đã truy cập được.

## Cấu hình và nơi lưu

| Biến | Mục đích | Trạng thái T01 |
| --- | --- | --- |
| `VNPAY_TMN_CODE` | Định danh merchant | Cần thông tin được cấp |
| `VNPAY_HASH_SECRET` | Ký và kiểm tra dữ liệu | Chỉ để ở server/secret store; không đưa vào Git hoặc frontend |
| `PAYMENT_PUBLIC_BASE_URL` | Dựng callback public | Cần host HTTPS và xác nhận đường callback |
| `PAYMENT_WEB_BASE_URL` | Đích kết quả web cho phép | Chốt cùng WEB01/VN03 |
| `PAYMENT_NATIVE_RETURN_URL` | Đích native cho demo | Chốt và kiểm tra với MOB02 |
| `PAYMENTS_ENABLED` | Dự kiến chặn tạo đơn mới | Mặc định false; chưa được app đọc ở T01 |
| `PAYMENT_ENV` | Tách sandbox/live | Đề xuất sandbox; validation thực hiện ở VN01 |

`payments:preflight` chỉ báo true/false về sự hiện diện của ba cấu hình đầu, không kiểm tra key có đúng, merchant đã duyệt hoặc callback đã online. Cấu hình mẫu ở `server/.env.example`; không cần gửi secret trong chat để hoàn thành T01.

## Điều kiện chuyển sang tích hợp

Tài liệu [PAY của VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) tách Return URL của trình duyệt và IPN phía server, đồng thời yêu cầu SSL cho IPN. Adapter phải tuân phiên bản merchant được cấp; bảng phản hồi, chữ ký và quyền query cần được xác nhận khi triển khai VN01–VN04.

Đường [query và refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html) có hợp đồng riêng. P0 dùng query để xác nhận lại, chưa triển khai refund. Cần lưu tham chiếu và thời gian tạo giao dịch ở đơn để query đúng giao dịch.

Trong lúc chờ merchant, DB và service vẫn phát triển bằng fixture/provider test. Không lấy thông tin demo công khai làm secret của dự án và không coi mock là bằng chứng sandbox đã chạy.
