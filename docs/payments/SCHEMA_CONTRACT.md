# Schema và contract chốt tại T01

Ngày: **28/10/2026**. DDL v1 bất biến ở `server/paymentSchema.ts`; v2 và opening balance ở `server/payments/schemaV2.ts`, `balanceMigration.ts`. DTO và giới hạn ở `server/payments/contracts.ts`. Đã có migration/startup probe và kiểm thử bằng fixture; chưa chạy migration lên database ứng dụng đang dùng. Xem [DB02](DB02_STATUS.md).

## Quy tắc số liệu

| Thuộc tính | Giá trị P0 |
| --- | --- |
| Tiền tệ | VND, số nguyên; chỉ đổi đơn vị ở adapter cổng |
| Gói khởi đầu | `xu_100`: 10.000 VND/100 xu; `xu_500`: 50.000/500; `xu_1000`: 100.000/1.000 |
| Trần đơn | 500.000 VND |
| Trần số dư | 2.000.000.000 xu |
| Checkout | 15 phút; đề xuất tối đa 3 đơn đang chờ/user, thực thi ở BE01 |
| Môi trường | `sandbox` hoặc `live`, độc lập với `NODE_ENV` |
| Thời gian | Lưu UTC, DATETIME(3); chuyển giờ tại biên giao thức và UI |
| ID | UUID cho order; BIGINT của entry/event/audit trả qua JSON bằng chuỗi |

Giá và hạn mức được giữ từ plan. Client gửi `packageCode`, `client` và header idempotency; server lấy user từ phiên, lấy giá từ gói đang bật và lưu snapshot. Interfaces TypeScript chưa thay thế bộ validate request sẽ viết ở BE01.

## Năm bảng

| Bảng | Vai trò | Ràng buộc chính |
| --- | --- | --- |
| `coin_packages` | Danh mục gói | Code duy nhất; tiền/xu dương và có trần; ngừng bán bằng active |
| `payment_orders` | Snapshot và kết quả thu tiền/cấp xu | Key theo user; reference và transaction ID theo provider/environment/merchant; CHECK trạng thái và thời gian |
| `wallet_entries` | Sổ biến động xu | Một topup/order; một opening/user và một migration key; khóa ngoại ghép kiểm tra chủ order |
| `payment_events` | Các lần nhận hoặc query | Cho phép lưu nhiều lần cùng fingerprint; không dùng event uniqueness để thay thế bảo vệ cấp xu |
| `payment_audit` | Thao tác admin/hệ thống | Giữ record khi actor bị xóa bằng SET NULL; chặn xóa order đang được tham chiếu |

`wallet_entries.opening_user_id` là cột generated: trả `user_id` chỉ với opening, còn topup là NULL. Unique trên cột này bảo đảm một opening/user ngay cả khi key migration khác nhau. Không đưa cột này vào DTO.

DB01 bổ sung bảng kỹ thuật `payment_schema_migrations` để lưu version, tên, checksum, trạng thái applying/applied và thời gian. Đây không phải bảng nghiệp vụ thứ sáu và không xuất qua API.

DB02 thêm `payment_balance_migration` lưu snapshot tổng user/xu và checkpoint user cuối mỗi batch. `users.coins` sau v2 là `INT NOT NULL DEFAULT 0` với CHECK 0 đến 2.000.000.000. Các trigger freeze chỉ tồn tại trong lúc chuyển dữ liệu và được dọn khi v2 hoàn tất.

FK `(payment_order_id, user_id)` trỏ tới unique `(payment_orders.id, payment_orders.user_id)` để một entry không thể gắn vào đơn của người khác. FK này không khai báo cascade; thao tác xóa bị chặn. Không thêm action CASCADE/SET NULL vào cột đang dùng trong CHECK. Xem [quy tắc CHECK của MySQL](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html).

## Trạng thái nhất quán

- Chưa thu tiền: status là `created`, `pending`, `failed`, `cancelled` hoặc `expired`; fulfillment là `pending`.
- Đã thu và đã cấp: `paid + credited`, có `credited_at`, không có `review_reason`.
- Đã thu nhưng chưa cấp được: `paid + needs_review`, có `review_reason`, chưa có `credited_at`.
- Transaction ID chưa có hoặc placeholder phía cổng phải thành NULL; không lưu chuỗi rỗng hoặc `0` như một giao dịch thật.
- Lease phải có đồng thời owner và hạn, hoặc cả hai NULL. Checkout snapshot là JSON object.

Schema không thể tự kiểm tra tổng ledger bằng `users.coins`, số xu topup bằng snapshot ở bảng khác, chữ ký hợp lệ hay trạng thái chuyển tiếp của một đơn qua thời gian. BE02 phải kiểm tra những điều này trong transaction khóa **order → user**, dùng cùng connection cho order/entry/coins. Không được coi test DDL của T01 là test hoàn tất service cấp xu.

## Quy tắc migration cần làm ở DB01 và DB02

1. Sao lưu, thử restore và đóng băng writer trước backfill trên dữ liệu đang dùng.
2. Chạy preflight; có NULL/âm/vượt trần thì dừng để xử lý có dấu vết, không tự sửa về 0.
3. Tạo bảng mới; đổi `users.coins` sang `INT NOT NULL DEFAULT 0`, giữ số dư hiện có.
4. Backfill một opening/user theo batch bằng key `opening:v1:<userId>`; chạy lại phải đọc kết quả cũ.
5. Đăng ký và tạo admin mới ghi 0, tạo opening 0 trong cùng transaction để giữ chính sách thống nhất.
6. Seed/reset phải tách khỏi DB có lịch sử thanh toán. Mọi writer cũ cần chuyển trước khi bật checkout.
7. Đối chiếu ledger từng user và tổng; tích hợp startup probe cho production không tự migrate.

`CREATE TABLE IF NOT EXISTS` chỉ bootstrap bảng, không nâng cấp cột/ràng buộc. Runner đã đăng ký v1 và v2, xác minh prefix version/checksum và chặn downgrade/version tương lai. SQL/seed/checksum v1 giữ nguyên. Thay đổi default/nullability, backfill và chuyển writer được gom trong DB02. Startup thường không backfill database có user; công cụ migration tường minh thực hiện sau khi chuẩn bị backup/restore.

## Contract API để nối ở BE01 đến BE04

- Create: `{ packageCode, client }`, client thuộc `web | native_demo`; không nhận amount, coins, userId, status hay returnUrl tùy ý.
- `TopupOrderDto`: trạng thái tiền và cấp xu riêng, snapshot tiền/xu, môi trường và thời gian ISO8601; không trả merchant secret.
- `WalletDto`: số dư đọc từ DB; `WalletEntryDto`: delta, balanceAfter, reason và orderId có thể NULL.
- `PaymentPageDto`: items và nextCursor nullable; cursor cần validate/scope khi triển khai.
- Idempotency, tham chiếu và mã giao dịch dùng so sánh phân biệt hoa thường ở DB. Backend phải thống nhất validate/canonicalize trước khi insert.
- Không hạ paid đã credited vì event cũ; xử lý mâu thuẫn qua đối soát. Hạn checkout local không đủ để bỏ bằng chứng thanh toán đến muộn.
