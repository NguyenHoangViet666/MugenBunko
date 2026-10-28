# Checkpoint T01 ngày 28 tháng 10 năm 2026

Nhánh: `codex/payment-integration`. Baseline tài liệu đã được lưu ở commit `bde6fa2` trước khi bắt đầu công việc này.

## Đầu ra đã chuẩn bị

- [x] Kiểm kê đường ghi xu trực tiếp, writer dựa vào default và script reset/seed.
- [x] Chốt contract số liệu, trạng thái tiền/cấp xu và DTO trong `server/payments/contracts.ts`.
- [x] Viết schema năm bảng có thể thực thi, chưa tích hợp vào startup ứng dụng.
- [x] Chuẩn bị fixture MySQL riêng, không nhận tên DB từ env và tự dọn database nó tạo.
- [x] Viết công cụ preflight chỉ đọc, không tự migrate hoặc sửa số dư.
- [x] Chuẩn bị checklist merchant, IPN/Return và query theo tài liệu chính thức.

## Kết quả kiểm tra

```powershell
npm --prefix server run test:payments:foundation
npm --prefix server run payments:preflight
```

Bộ foundation đạt **14/14 kiểm tra trên MySQL local 9.2.0**, backend TypeScript build thành công. Bao gồm DB ngẫu nhiên không chứa admin mẫu, bootstrap lặp không thay số dư, hạn mức, idempotency theo user, phạm vi giao dịch merchant, trạng thái nhất quán, lease/expiry, chủ order, topup/opening không trùng, snapshot giá, millisecond, audit, BIGINT và dữ liệu legacy bất thường.

Preflight local hiện không phát hiện số dư NULL, âm hoặc vượt trần. Cột xu vẫn có default 1000 và còn nullable nên cần migration ở DB01/DB02. Cấu hình merchant/secret/base callback chưa được đặt trong môi trường local được kiểm tra. Báo cáo tổng hợp có thể lưu ở `.cache/payment-t01/`; không đưa credentials hay snapshot dữ liệu người dùng vào Git.

Kết quả foundation không thay thế 32 ca nghiệm thu PAY của service/gateway/UI. Backend build và suite foundation được chạy lại sau khi hoàn tất schema; phạm vi nền dữ liệu local không chứng minh đã tương thích mọi phiên bản DB staging.

## Phần chưa triển khai

- `server/db.ts` và schema database ứng dụng chưa được thay đổi.
- Chưa chạy backfill opening balance hoặc đổi số dư/default của dữ liệu đang dùng.
- Chưa có route tạo đơn/ví, adapter VNPAY, worker hay giao diện thanh toán.
- Chưa thử restore backup trên môi trường staging; phải hoàn thành trước migration dữ liệu đang dùng.
- Merchant sandbox và URL public là đầu vào cần chuẩn bị theo checklist, không chặn việc tiếp tục DB01.

## Việc tiếp theo theo thứ tự

1. **DB01:** tích hợp schema vào fresh install và startup probe; có đường nâng cấp theo version thay vì chỉ CREATE IF NOT EXISTS.
2. **DB02:** backup/restore rehearsal, tạm dừng writer, preflight rồi opening balance theo batch và cập nhật đăng ký/admin/seed.
3. **DB03:** đối chiếu ledger, kiểm thử migration lặp, dữ liệu bất thường và index bằng truy vấn thực tế.
4. Qua mốc DB mới bắt đầu service tạo đơn/cấp xu ở BE01 và BE02.

Chi tiết nằm trong [schema contract](SCHEMA_CONTRACT.md), [inventory](COIN_WRITE_INVENTORY.md) và [checklist sandbox](VNPAY_SANDBOX_CHECKLIST.md).
