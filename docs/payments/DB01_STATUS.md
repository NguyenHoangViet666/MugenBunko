# Checkpoint DB01 ngày 28 tháng 10 năm 2026

Nhánh: `codex/payment-integration`. Bắt đầu từ checkpoint T01 `a18b0c4`.

## Kết quả triển khai

- `initializeDbConnection({ migrate: true })` tạo/nâng cấp năm bảng thanh toán qua migration v1. Local mặc định chạy nhánh này; công cụ `migrate:production` dùng cùng đường xử lý.
- `initializeDbConnection({ migrate: false })` chỉ đọc schema và version trước khi cho server mở HTTP. Probe bắt buộc cả khi checkout chưa bật. App production vẫn dùng tài khoản DML, không cần quyền DDL.
- `payment_schema_migrations` ghi version, tên, SHA-256, trạng thái `applying`/`applied`, thời điểm bắt đầu/kết thúc. Checksum không phụ thuộc CRLF/LF; SQL và seed v1 là bất biến.
- Khóa MySQL theo database ngăn hai tiến trình migration thanh toán chạy cùng lúc. Seed gói và ghi `applied` cùng transaction; không tự sửa giá, bật lại hoặc phục hồi gói đã xóa ở lần chạy sau.
- Đối chiếu metadata của toàn bộ cột, thứ tự/type/null/default/collation/generated expression, index/unique, FK và CHECK có thực thi. Chấp nhận metadata đúng của T01 chưa có journal, giữ giá gói hiện có rồi ghi version.
- Sau migration đã hoàn tất, thiếu bảng/cột hoặc drift làm startup/migration thất bại. Không tự tạo lại bảng bị mất và không ghi lại checksum cho qua kiểm tra.
- Nhánh lỗi đóng connection migration và pool chưa sẵn sàng, tránh tiếp tục dùng kết nối sau readiness thất bại.

DDL dùng charset/collation rõ ràng để database mới và database nâng cấp có cùng contract. Contract schema chỉ chứng minh cấu trúc; không thay thế điều kiện ví đã backfill hoặc đủ điều kiện bật thanh toán.

## Chạy và kiểm tra

```powershell
npm --prefix server run test:payments:foundation
npm --prefix server run test:payments:migration
npm --prefix server run test:security
npm --prefix server run payments:preflight
```

Suite migration dùng database riêng và thử cả khởi tạo từ rỗng, nâng cấp legacy, chạy lại, nhận schema T01, DDL bị ngắt, hai connection chạy đồng thời, lock contention, version/checksum sai, thiếu cột/bảng, unique bị bỏ, FK cascade, CHECK bị tắt/sửa và readiness chỉ đọc. Ca startup production dùng tài khoản MySQL test ngẫu nhiên chỉ có SELECT/INSERT/UPDATE/DELETE trên DB test và xác minh DDL bị từ chối.

Kết quả trên MySQL local **9.2.0**, backend TypeScript build thành công:

| Nhóm | Kết quả |
| --- | --- |
| Foundation T01 | 14/14 đạt |
| Migration/startup DB01 | 20/20 đạt |
| Hồi quy security, OTP và mật khẩu | 35/35 đạt |
| Tổng | **69/69 đạt, không bỏ qua test** |

Các file test được chạy cùng một lượt Node test runner sau build; log local ở `.cache/payment-db01/verification.log` và không đưa vào Git. Preflight chỉ đọc sau các thay đổi vẫn thấy 23 tài khoản, tổng 26.000 xu, không có NULL/âm/vượt trần, giống baseline T01. Default 1000 và nullable được giữ nguyên cho đợt DB02; merchant sandbox chưa được cấu hình.

Mục tiêu triển khai là MySQL 8.4+; MariaDB và MySQL cũ hơn bị từ chối. Docker Desktop chưa chạy nên chưa có kết quả container MySQL 8.4 trong checkpoint này. Không coi kết quả MySQL local là bằng chứng triển khai staging.

## Trình tự migration khi triển khai

1. Sao lưu, thử restore và chạy thử trên bản sao đúng phiên bản MySQL mục tiêu trước khi thay schema đang dùng.
2. Build backend, dùng tài khoản migration đủ quyền và đúng `DB_NAME`; với cấu hình deploy hiện có chạy:

   ```powershell
   npm --prefix server run build
   npm --prefix server run migrate:production
   ```

   Trong Docker dùng service `migrate` và biến môi trường deploy đã cấu hình. Lệnh này thực thi cả migration ứng dụng cũ; không dùng nó như một công cụ preflight chỉ đọc.
3. Khởi động backend production bằng tài khoản DML. Nếu probe báo thiếu schema/version/checksum/drift, xử lý migration trước khi cho nhận HTTP.
4. Tiếp tục DB02/DB03, xác minh ledger và writer trước khi triển khai checkout. Chưa cấp key VNPAY ở DB01.

Checkpoint này chỉ chạy migration trên các fixture; không chạy lệnh migration ứng dụng trên database local đang dùng.

## DDL bị ngắt hoặc schema sai

MySQL DDL có thể implicit commit, nên không có cam kết rollback toàn bộ migration. Trạng thái `applying` được ghi trước DDL. Sau khi tiến trình cũ đã dừng, chạy lại bằng binary có cùng checksum: runner đối chiếu các bảng đã tồn tại, tạo bảng còn thiếu và hoàn tất seed/marker. Khóa được giữ trên connection riêng qua các câu DDL và giải phóng khi kết thúc/mất connection.

Nếu drift, checksum khác hoặc version tương lai xuất hiện: dừng, kiểm tra bản triển khai và backup. Không xóa journal, đổi checksum, vô hiệu CHECK hoặc lấy schema lỗi làm contract mới. Version `applied` nhưng thiếu bảng có thể là mất dữ liệu; không tạo bảng rỗng để vượt readiness. V1 hiện là version duy nhất được đăng ký; thay đổi tiếp theo cần migration mới cùng contract tương ứng.

Metadata so sánh nghiêm ngặt, gồm cả index phụ. Thay schema thủ công hoặc thêm index ngoài migration cũng có thể làm probe dừng; đưa thay đổi qua version mới. Mỗi migration dùng connection riêng ở autocommit, không gọi từ transaction nghiệp vụ.

Thiết kế dựa trên tài liệu chính thức về [implicit commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html), [GET_LOCK](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html) và [metadata CHECK](https://dev.mysql.com/doc/refman/8.4/en/information-schema-check-constraints-table.html).

## Việc tiếp theo

DB02 sẽ chuẩn hóa `users.coins` thành `INT NOT NULL DEFAULT 0`, giữ nguyên số dư, tạo một opening/user theo batch và chuyển đăng ký/admin/seed sang chính sách ledger. Phần này được giữ cùng một đợt thay writer theo checkpoint T01; schema v1 không tự thực hiện việc đó. DB03 đối chiếu sổ, chuẩn hóa connection UTC và xác minh index bằng truy vấn thực tế trước khi viết service cấp xu.
