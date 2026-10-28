# Thanh toán điện tử MugenBunko

Nhánh: `codex/payment-integration`. Checkpoint hiện tại: **DB01, 28/10/2026**.

Đã tích hợp migration schema v1 vào khởi tạo/nâng cấp database và kiểm tra schema trước startup production. Chưa có route checkout, adapter cổng, service cấp xu hoặc backfill opening balance. Checkpoint này được kiểm thử trên database riêng; chưa chạy migration lên database ứng dụng đang dùng.

## Đọc theo thứ tự

1. [Kết quả DB01 và cách chạy migration](DB01_STATUS.md).
2. [Checkpoint T01 trước khi tích hợp](T01_STATUS.md).
3. [Kiểm kê đường ghi xu](COIN_WRITE_INVENTORY.md).
4. [Quyết định schema và contract](SCHEMA_CONTRACT.md).
5. [Checklist merchant VNPAY Sandbox](VNPAY_SANDBOX_CHECKLIST.md).
6. [Kế hoạch tổng thể](../PAYMENT_INTEGRATION_PLAN.md) và bộ Word trong `artifacts/payment-documents/`.

## Các lệnh hiện chạy được

```powershell
# MySQL test riêng: bootstrap schema và kiểm tra các ràng buộc.
npm --prefix server run test:payments:foundation

# Migration/version/checksum, DDL bị ngắt, schema drift và startup production.
npm --prefix server run test:payments:migration

# Chỉ SELECT trên database cấu hình ở DB_NAME, không chạy app migrations.
npm --prefix server run payments:preflight
```

`test:payments:foundation` tạo database `mugenbunko_payment_test_<16 ký tự hex>` và dọn đúng database nó đã tạo khi kết thúc. Tài khoản test cần quyền tạo/xóa database. Mặc định dùng kết nối MySQL local trong `server/.env`; có thể đặt `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` cho server test riêng. Nếu host mặc định không phải loopback, test yêu cầu khai báo `TEST_DB_HOST` rõ ràng. Không có `TEST_DB_NAME`: không được đưa tên database ứng dụng vào fixture.

Fixture chỉ nạp phần định nghĩa bảng từ `server/schema.sql`, không nạp tài khoản mẫu, `TRUNCATE` hoặc seed ở cuối file. Không khởi động Express, SMTP, Redis, scheduler hay liên hệ cổng thanh toán. Kết nối UTC và đọc BIGINT bằng chuỗi.

Suite migration còn chạy `initializeDbConnection()` trong subprocess trỏ tới DB ngẫu nhiên. Ca kiểm tra production tạo tài khoản MySQL ngẫu nhiên `mb_paytest_<16 hex>`, cấp DML trên đúng DB test rồi tự xóa. Suite này cần thêm quyền `CREATE USER`, `DROP USER` và quyền cấp DML cho tài khoản test; không sửa tài khoản ứng dụng. Không mở HTTP hoặc chạy scheduler.

`payments:preflight` dùng transaction `READ ONLY`, trả thống kê tổng hợp và sự hiện diện của cấu hình sandbox; không in thông tin người dùng hoặc giá trị secret. Mã thoát `0`: không phát hiện số dư bất thường; `2`: có NULL/âm/vượt trần; `1`: không hoàn thành kiểm tra. `coinColumnNeedsMigration` là tín hiệu riêng cho default/nullability; mã `0` không có nghĩa migration hoặc merchant đã sẵn sàng.

## Phạm vi đã có trong code

- `server/payments/contracts.ts`: gói khởi đầu, giới hạn, trạng thái và DTO dự kiến.
- `server/paymentSchema.ts`: DDL bất biến của năm bảng trong migration v1.
- `server/paymentSchemaMigration.ts`: version/checksum, khóa migration, resume và readiness chỉ đọc.
- `server/payments/schemaV1Contract.ts`: metadata contract đối chiếu cột/index/FK/CHECK; không lấy contract từ DB ứng dụng.
- `server/payments/preflight.ts`: kiểm kê chỉ đọc, không tự sửa số dư.
- `server/tests/paymentFixture.ts`: database test ngẫu nhiên, không nhận tên database từ bên ngoài.
- `server/tests/paymentFoundation.test.ts`: kiểm tra ràng buộc DB, legacy balance và sự tách biệt của fixture.

DB02 sẽ đổi mặc định xu, backfill opening balance và xử lý các writer cũ. Chưa được bật checkout chỉ vì schema v1 đã sẵn sàng. Xem trình tự migration và giới hạn kiểm chứng trong [checkpoint DB01](DB01_STATUS.md).
