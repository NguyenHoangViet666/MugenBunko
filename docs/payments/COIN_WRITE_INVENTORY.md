# Kiểm kê đường ghi xu

Ngày khảo sát: **28/10/2026**, bắt đầu từ baseline `bde6fa2`. Phạm vi: SQL, route, CLI, seed và fixture trong repo; chưa bao gồm job hoặc câu SQL do người vận hành chạy ngoài repo.

## Đường ghi trực tiếp và ngầm

| Nơi | Hành vi hiện tại | Việc phải làm khi DB01/DB02 |
| --- | --- | --- |
| `server/schema.sql`, bảng `users` | `coins INT DEFAULT 1000`, cho NULL | Preflight, rồi đổi sang `INT NOT NULL DEFAULT 0` bằng migration có kiểm soát; giữ số dư hiện có |
| `server/routes/auth.ts`, đăng ký | Chèn `coins = 0` trong transaction tạo user | Giữ 0; thêm opening 0 cùng transaction nếu áp dụng chính sách một opening/user; không cho client chọn xu |
| `server/createAdmin.ts` | Chèn user không chỉ định `coins`, nên nhận default 1000 | Chỉ định 0 và tạo opening theo cùng chính sách; không cấp tiền vì role admin |
| Cuối `server/schema.sql` | `TRUNCATE users` rồi seed admin 1000 xu | Chỉ dành cho reset demo có chủ đích; không dùng toàn bộ file làm migration của DB có lịch sử thanh toán |
| `server/seed_novels.js` | Xóa user `id > 1`, tạo tác giả với 1200 xu | Tách dữ liệu demo; không chạy lên DB đã có order/ledger; seed xu phải có opening hoặc chạy trước backfill |
| `server/seed_forum_50.js` | User mới được chèn xu mẫu qua tham số; user có sẵn chỉ cập nhật hồ sơ/XP/level | Tách seed demo và ghi sổ tương ứng; không coi xu seed là doanh thu |
| `server/tests/fixture.ts` | Chèn user không chỉ định xu; DTO `fixture.user.coins` lại ghi 0 | Khi đổi default, chốt fixture về 0 tường minh và khớp response thực; giữ fixture legacy riêng cho test migration |
| `server/tests/passwords.test.ts`, `elections.test.ts` | Chèn user test và dựa vào default | Chốt seed test tường minh khi DB01 đổi default |
| `tests/backend-load.mjs`, `browser-elections.mjs`, `browser-upgrades.mjs` | Chèn user tải/browser test và dựa vào default | Cập nhật fixture test đồng bộ, không gắn xu mẫu vào báo cáo tiền thật |

`server/db.ts` hiện chỉ lấy phần DDL trước `-- Disable constraints` khi bootstrap DB mới; không nạp reset/seed cuối `schema.sql`. Cần bảo toàn ranh giới này khi tích hợp thanh toán.

`server/drop-db.js` xóa toàn bộ database cấu hình, bao gồm xu và mọi bảng tương lai. Đây là công cụ reset, không phải migration hoặc rollback thanh toán. `server/migrate.js` hiện thêm các bảng cộng đồng, không ghi `coins`; production migration đang ở `server/migrateProduction.ts`.

## Đường đọc và endpoint cũ

- `server/routes/auth.ts`: lấy `coins` cho session và refresh.
- `server/routes/mod.ts`: lấy xu trong danh sách quản lý user; đây là đường đọc.
- `src/types/index.ts`, `mobile/src/types/index.ts`: `User.coins` là number.
- `mobile/app/(tabs)/profile.tsx`: hiển thị xu từ session; sau thanh toán cần refresh từ API ví.
- `POST /api/auth/deposit-coins` vẫn trả `403`, không ghi số dư. Giữ nguyên cho tới khi có luồng tạo đơn và xác nhận riêng.
- Các bộ đọc truyện, XP/level và thưởng hiện tại không có câu SQL cập nhật `coins` được tìm thấy trong khảo sát. Không suy rằng XP hoặc lượt đọc là xu đã mua.

## Các quyết định đã chốt cho P0

1. Người dùng/admin mới bắt đầu ở 0 xu; role không tạo quyền tự cộng xu.
2. Giữ nguyên số dư cũ, ghi `opening_balance` theo user trước khi bật checkout.
3. Có tối đa một opening/user, kể cả khi migration được gọi với key khác.
4. Xu demo/opening không tính là doanh thu. Chuyển live phải xử lý dữ liệu thử nghiệm riêng.
5. Sau DB02, mọi thay đổi xu phải qua transaction nghiệp vụ có ledger; không có endpoint sửa `coins` từ client.
6. Tài khoản có lịch sử thanh toán không xóa cứng bằng các script seed/reset. FK thanh toán dùng hành vi chặn xóa.

## Tìm lại khi code thay đổi

```powershell
rg -n -i '\bcoins\b|deposit-coins' server src mobile tests shared --glob '!**/dist/**' --glob '!**/node_modules/**'
rg -n -i 'INSERT\s+INTO\s+`?users|DELETE\s+FROM\s+`?users|TRUNCATE\s+TABLE\s+`?users' server tests --glob '!**/dist/**' --glob '!**/node_modules/**'
```

Kết quả `rg` cần đọc theo ngữ cảnh, nhất là `INSERT` bỏ trống cột xu và SQL nhiều dòng. Đây là checklist kiểm kê, không phải bộ phân tích SQL có thể bảo đảm phát hiện mọi writer mới.
