# DB02 Chuyển số dư và các đường ghi xu

Ngày triển khai: **28/10/2026**, làm trước phần việc dự kiến cho buổi tiếp theo. Nhánh `codex/payment-integration`, baseline `5bf0067`.

## Phạm vi đã có trong code

- Migration v2 nối tiếp v1, giữ nguyên SQL, seed và checksum v1; không nhận nhầm journal bị sửa hoặc version tương lai.
- Preflight chặn NULL, số âm, vượt 2 tỷ xu và kiểu cột xu không phù hợp. Không tự ép dữ liệu bất thường về 0 hoặc làm tròn số lẻ.
- Chuẩn hóa `users.coins` thành `INT NOT NULL DEFAULT 0`, thêm CHECK miền số dư và giữ nguyên giá trị từng user.
- Backfill một opening/user, gồm cả user 0 xu, bằng key `opening:v1:<id>`. Batch ghi ledger và checkpoint trong cùng transaction; batch lỗi rollback cả hai, batch đã commit được giữ khi resume.
- Bảng `payment_balance_migration` giữ số user/tổng xu ban đầu, user cuối và số batch. Kết thúc phải có đúng một opening/user, tổng ledger bằng coins từng user và tổng hệ thống, đồng thời khớp snapshot.
- Đăng ký và CLI tạo admin chỉ tạo 0 xu, ghi opening 0 bằng cùng connection và transaction. Fixture/browser/load seed user test cũng ghi opening; fixture legacy riêng vẫn mô phỏng dữ liệu cũ.
- Connection migration dùng UTC; opening mới ghi `UTC_TIMESTAMP(3)` kể cả khi session gọi có timezone khác. Chính sách UTC cho toàn bộ pool runtime và các API đọc vẫn thuộc DB03.
- `schema.sql` chỉ còn DDL, không còn TRUNCATE hoặc admin/mật khẩu mẫu. `seed_novels.js`, `seed_forum_50.js`, `drop-db.js` dùng guard chung và bị chặn khi có lịch sử tài chính hoặc v2 đã bắt đầu.

## Freeze và resume

Runner giữ named lock theo database như DB01. Trước khi ghi journal v2 applying, nó cài ba trigger BEFORE INSERT/UPDATE/DELETE trên users. UPDATE chỉ bị chặn khi coins đổi; profile/XP không thuộc đợt chuyển số dư.

Trigger đọc trạng thái journal bằng `FOR SHARE`, nên thấy trạng thái hiện tại ngay cả khi writer giữ snapshot REPEATABLE READ cũ. Shared next-key lock của writer trước freeze cũng buộc marker v2 chờ transaction đó kết thúc trước khi chụp snapshot/backfill. Khi v2 applying, chỉ connection sở hữu named lock được ghi xu; mất connection không mở lại writer vì trạng thái applying vẫn tồn tại.

Khi v2 hoàn tất và ledger khớp, runner ghi applied rồi dọn trigger. Nếu bị ngắt, chạy lại cùng binary bằng lệnh migration: giữ các batch đã commit, tiếp tục từ checkpoint. Nếu thiếu/sai trigger của đợt đang applying, opening mâu thuẫn, ledger có topup trước backfill hoặc snapshot lệch, runner dừng để xử lý có kiểm soát; không tự sửa, xóa hoặc ghi đè số dư.

Freeze bảo vệ DML của user; quyền DBA vẫn có thể chạy DDL/TRUNCATE hoặc vô hiệu các cơ chế bảo vệ. Khi chuyển dữ liệu thật vẫn phải dừng toàn bộ writer/seed cũ trong cửa sổ maintenance, không chạy nhiều phiên bản ứng dụng song song.

## Đường chạy tường minh

Startup production chỉ đọc schema. Startup development chỉ tự hoàn tất v2 cho DB rỗng hoặc kiểm tra DB đã hoàn tất. Với DB đang có user mà chưa đạt v2, startup báo `PAYMENT_BALANCE_EXPLICIT`; nó không tự backfill.

Sau khi sao lưu và thử restore trên môi trường đúng phiên bản, dừng writer cũ và chạy bằng tài khoản migration đủ quyền:

```powershell
npm --prefix server run build
npm --prefix server run payments:preflight
npm --prefix server run migrate:production
```

`migrate:production` gọi `initializeDbConnection({ migrate: true, allowBalanceMigration: true })`; đây là lệnh ghi schema/dữ liệu. Không dùng như preflight. Sau đó khởi động code mới bằng tài khoản DML và kiểm tra dữ liệu. Seed/reset chỉ dành cho database demo riêng trước v2 và chưa có lịch sử thanh toán.

## Kiểm thử

```powershell
npm --prefix server run test:payments:foundation
npm --prefix server run test:payments:migration
npm --prefix server run test:payments:opening
npm --prefix server run test:security
npm --prefix server run test:elections
npm --prefix server run test:upgrades
```

Các ca mới bao gồm số dư 0/trần, ID âm, chạy lại, gián đoạn qua connection khác, checkpoint, rollback batch, writer cũ/snapshot cũ, fail closed sau khi mất khóa, opening mâu thuẫn, CHECK/default sai, guard reset và đăng ký/admin thực. Test backup dùng `mysqldump --single-transaction` trên fixture v1 rồi restore vào một DB ngẫu nhiên khác; credentials ở file tạm được xóa sau test, không đưa vào Git hoặc argv.

Backend TypeScript build thành công. Lượt hồi quy tổng hợp đạt **117/117**, không lỗi và không bỏ qua test, gồm foundation, migration v1/v2, account writers, security/OTP/password, elections và reader/collections/chapter versions. Log ở `.cache/payment-db02/verification.log`.

Sau khi bổ sung chốt kiểm tra user xuất hiện giữa lúc startup đang freeze một DB rỗng, chạy lại ba ca liên quan trên binary cuối: giữ số dư, chặn tự backfill user vừa commit và yêu cầu lệnh migration cho DB có user. Kết quả **3/3 đạt**, log `.cache/payment-db02/final-startup-checks.log`. Đây là kiểm tra có mục tiêu sau lượt hồi quy, không cộng lặp hai ca cũ thành số test mới.

Preflight chỉ đọc cuối vẫn có 23 user, tổng 26.000 xu, không NULL/âm/vượt trần; default 1000 và nullable ở DB ứng dụng chưa đổi. Các script JS seed/reset và browser/load được kiểm tra cú pháp; chưa chạy lại bộ browser/load đầy đủ vì không thay giao diện. Bằng chứng local không đưa vào Git.

## Giới hạn và việc còn lại

- Chỉ chạy migration trên fixture. Database ứng dụng đang dùng chưa được backfill hoặc đổi mặc định trong công việc này.
- Backup/restore rehearsal là trên fixture, không phải chứng nhận backup staging/production. MySQL local 9.2.0 đã dùng cho kiểm thử; container MySQL 8.4 vẫn chưa được kiểm chứng.
- Chưa có checkout, VNPAY adapter, service cấp xu hoặc worker đối soát. Kết quả DB02 không thay thế các ca PAY cho gateway/service/UI.
- DB03 tiếp tục chốt UTC trên connection runtime, kiểm tra index bằng truy vấn thực tế và mở rộng audit vận hành trước BE02.
