# DB03 UTC runtime và nghiệm thu nền dữ liệu

Ngày triển khai: **16/11/2026**. Nhánh `codex/payment-integration`, baseline `5f54391`, revision code và CI đã kiểm chứng `0da763d`.

DB03 bổ sung UTC cho kết nối runtime, contract truy vấn có kiểm tra EXPLAIN và audit ledger chỉ đọc. Các phần này đã có kiểm thử fixture; chưa triển khai API thanh toán, cấp xu hoặc worker. Tài liệu hướng dẫn kiểm tra dữ liệu và các điều kiện còn thiếu trước khi chuyển sang backend thanh toán.

## UTC của driver và session

`server/databaseTime.ts` dùng `timezone: 'Z'` cho chuyển đổi Date của mysql2 và `SET SESSION time_zone = '+00:00'` cho SQL. Cấu hình driver không tự đổi timezone của session; phải áp dụng cả hai. Offset số không cần nạp bảng timezone có tên vào MySQL.

`db.query()` và `db.transaction()` đều chờ thiết lập session trước khi chạy SQL nghiệp vụ. Mỗi lần checkout đều đặt lại UTC, kể cả connection vừa được caller trước đổi timezone. Nếu thiết lập session lỗi, connection bị hủy và không trả về pool. Startup production chạy probe trên connection đã thiết lập UTC; connection migration cũng đặt UTC trước DDL. Không đổi timezone toàn cục của MySQL hoặc hệ điều hành.

Các DATETIME trong module thanh toán được quy ước lưu UTC; Date khi đi qua JSON mang ISO 8601 có hậu tố `Z`. TIMESTAMP được MySQL chuyển đổi theo session UTC. Không tự viết lại DATETIME lịch sử không biết timezone nguồn. Các HTTP API thanh toán chưa tồn tại, nên việc ánh xạ DTO thực tế còn phải nghiệm thu ở BE03.

Pool chung chỉ đổi timezone, giữ cách đọc số của các API cũ. Truy vấn thanh toán cần trả khóa BIGINT thành chuỗi tường minh; không dựa vào ép kiểu Number của JavaScript.

## Kế hoạch truy vấn

Các truy vấn trong `server/payments/queryPlans.ts` là contract có thể thực thi cho các bước backend và worker tiếp theo. Đây chưa phải endpoint HTTP hoặc worker đang chạy. Không sửa DDL hoặc checksum migration v1/v2 để làm test đi qua.

| Truy vấn | Index hiện có | Thứ tự và phân trang |
| --- | --- | --- |
| Lịch sử ví | idx_wallet_history | user_id cố định, id giảm dần; trang sau dùng id nhỏ hơn cursor |
| Lịch sử đơn | idx_payment_history | user_id cố định, created_at và id giảm dần; cursor giữ đủ hai trường |
| Đơn cần đối soát | idx_payment_reconcile | Một status mỗi lượt, reconcile_after rồi lease_until rồi id tăng dần |

Ví dùng `CAST(id AS CHAR)` để trả chính xác BIGINT ngay cả khi pool chung không bật bigNumberStrings. Cursor nhận chuỗi thập phân, giới hạn trong BIGINT UNSIGNED; không ép qua Number. Lịch sử đơn dùng điều kiện created_at nhỏ hơn mốc hoặc cùng thời gian và id nhỏ hơn mốc, tránh bỏ sót khi nhiều đơn trùng mili giây. Tất cả truy vấn giới hạn 1 đến 100 dòng và dùng tham số bind.

Truy vấn candidate lọc provider, environment và merchant, chỉ lấy đơn đến hạn, chưa credited và không có lease còn hiệu lực. `FOR UPDATE SKIP LOCKED` dành cho transaction claim tương lai; RC01 phải ghi lease rồi commit trước khi gọi mạng. Worker cần phục vụ công bằng các status đủ điều kiện, thay vì liên tục quét một status. DB03 chưa triển khai các thao tác claim/update hoặc lịch chạy đó.

Fixture kế hoạch truy vấn có 4.096 đơn và 64 user, gồm mốc thời gian trùng nhau, đơn chưa đến hạn, merchant khác và lease còn hạn/hết hạn. EXPLAIN FORMAT JSON kiểm tra index optimizer tự chọn, loại truy cập ref/range và việc không cần filesort. Không dùng FORCE INDEX hoặc ràng buộc một con số ước lượng chính xác. Giới hạn 256 dòng ước lượng chỉ là ngưỡng cho fixture này, không phải cam kết hiệu năng production. Cần đo lại với phân bố dữ liệu thật khi triển khai BE03 và RC01.

## Audit chỉ đọc

`payments:audit` dùng connection riêng, không import `db.ts`, không chạy migration hoặc khởi động ứng dụng. Audit yêu cầu schema thanh toán hoàn tất; không coi database legacy chưa có ledger là đạt.

Audit đặt REPEATABLE READ rồi mở transaction `WITH CONSISTENT SNAPSHOT, READ ONLY`. MySQL cưỡng chế chỉ đọc và mọi phép tổng hợp dùng cùng snapshot, nên một lần cấp xu atomic commit ở giữa các truy vấn không tạo cảnh báo lệch giả. Kết thúc luôn rollback và đóng connection CLI. Hàm dùng trực tiếp yêu cầu connection riêng đang rảnh; nếu caller đã mở transaction, nó từ chối trước khi có thể implicit commit công việc của caller.

Audit kiểm tra một opening đúng version cho mỗi user, tổng ledger theo từng user và toàn hệ thống, entry mồ côi, thứ tự opening và số dư sau từng entry. Nó cũng phát hiện đơn credited thiếu topup, topup chưa thuộc đơn paid/credited hoặc sai số xu snapshot. Một đơn paid/needs_review chưa có topup là hợp lệ; audit không tự cấp xu cho đơn đó.

Báo cáo JSON chỉ có tổng và số lỗi theo nhóm, không đưa user, order, merchant hoặc secret vào output. Tổng user/đơn/entry/xu là chuỗi thập phân; số lỗi là số nguyên an toàn. Một dữ liệu sai có thể thuộc nhiều nhóm lỗi, vì vậy không cộng các nhóm thành số sự cố độc lập. Audit quét toàn bộ ledger và dùng window function; chạy theo nhu cầu vận hành hoặc lịch phù hợp kích thước dữ liệu, chưa gắn vào request HTTP hay scheduler.

| Mã thoát | Ý nghĩa | Hành động |
| --- | --- | --- |
| 0 | Schema sẵn sàng và ledger khớp | Lưu bằng chứng của lần kiểm tra |
| 2 | Phát hiện dữ liệu không nhất quán | Điều tra writer và giao dịch liên quan; không tự sửa xu |
| 1 | Không hoàn thành kiểm tra | Xử lý kết nối, quyền hoặc schema rồi chạy lại |

CLI dùng cấu hình DB_NAME hiện tại và quyền SELECT; không cần quyền DDL. Giữ log tổng hợp theo revision triển khai. Thông báo lỗi chỉ in mã lỗi đã lọc, không in thông báo driver chứa SQL hoặc thông tin kết nối.

## Kiểm chứng và vận hành

TypeScript build thành công. Trên MySQL native **9.2.0** riêng, 118 ca hồi quy có sẵn đều đạt trong lượt tổng hợp. Lượt đó có 144 ca, bắt được một lỗi ORDER BY dùng alias CAST của truy vấn ví mới. Đã sửa sang cột BIGINT gốc và bổ sung ID khác độ dài cùng ID vượt Number.MAX_SAFE_INTEGER để kiểm tra thứ tự số độc lập.

Sau sửa, chạy lại toàn bộ suite truy vấn đạt **7/7**, rồi chạy bộ nghiệm thu DB03 trên binary cuối đạt **26/26**, gồm UTC 4 ca, audit 15 ca và truy vấn 7 ca. Không lỗi, hủy hoặc bỏ qua ca trong lượt nghiệm thu cuối. Không cộng các lượt chạy lại thành số test độc lập mới; phạm vi hiện có là 118 ca hồi quy và 26 ca DB03.

Log local trong `.cache/payment-db03/`: `regression-native92-final.log` ghi lượt tổng hợp 143/144 trước sửa, `query-plans-final.log` ghi 7/7 sau sửa, `acceptance-final.log` ghi 26/26 trên binary cuối. Các log và datadir fixture không đưa vào Git.

Trên GitHub Actions, MySQL container **8.4.13** đã chạy toàn bộ 14 file test đạt **144/144**, 13 suite, không lỗi/hủy/bỏ qua/todo. Thời gian test 64,695 giây; hoàn tất lúc 13:32 ngày 16/11/2026, Asia/Saigon. Kết quả gắn với revision `0da763db1d5634905ab74b71bbabc87e7d26fb94`, run `43817285917`. Đây là nghiệm thu bằng fixture trên phiên bản target; chưa thay cho staging HTTPS hoặc một giao dịch merchant thật.

Bằng chứng CI: [Kết quả MySQL 8.4 trên GitHub Actions](https://github.com/NguyenHoangViet666/MugenBunko/actions/runs/43817285917)

Workflow `payment-db.yml` tự chạy khi source backend thay đổi trên nhánh payment và có thể gọi thủ công khi workflow khả dụng trên nhánh mặc định. Database và mật khẩu CI là tài nguyên dùng riêng cho test; không dùng secret hoặc dữ liệu ứng dụng. Wrapper `mysqldump-ci.sh` dùng client cùng image server, truyền file cấu hình qua stdin vào file tạm có quyền riêng, rồi dọn khi xong. Repo chỉ cấp quyền đọc cho job; service được dọn sau kiểm thử. Dependency socket.io-client phục vụ test đã được khai báo trong backend để clean install không phụ thuộc node_modules của web.

```powershell
npm --prefix server run test:payments:acceptance
npm --prefix server run test:payments
npm --prefix server run payments:preflight
npm --prefix server run payments:audit
```

Hai lệnh test dựng và dọn database ngẫu nhiên; TEST_DB_HOST/PORT/USER/PASSWORD chỉ định server kiểm thử. Bộ test thanh toán chạy các file tuần tự để hạn chế áp lực bộ nhớ. Preflight và audit là hai lệnh chỉ đọc database cấu hình ở DB_NAME; không gọi migrate:production để kiểm tra tình trạng.

Kiểm chứng 8.4 dùng runner riêng vì thử Docker local bị thiếu bộ nhớ khi chạy cùng hồi quy; Docker và hai container cũ tự khởi động đã được tắt lại. Instance MySQL native 9.2 dùng cho test cũng đã shutdown bình thường, PID đã thoát và port đã đóng. Không để lại tiến trình test đang chạy. Bằng chứng staging hoặc merchant vẫn là các mốc nghiệm thu tiếp theo.

## Trạng thái database ứng dụng

Kiểm tra chỉ đọc ngày 16/11 phát hiện journal v1 đã applied ngày 28/10 và v2 ngày **02/11/2026**. Có 23 user, tổng 26.000 xu; ledger cơ bản khớp từng user và tổng hệ thống. Cột coins đã là `INT NOT NULL DEFAULT 0`. Đây là trạng thái quan sát hiện tại, khác báo cáo lịch sử ngày 28/10; công việc DB03 hôm nay không chạy migration lên database này.

Preflight hôm nay chưa thấy `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` hoặc `PAYMENT_PUBLIC_BASE_URL`. Sự hiện diện của biến cấu hình chỉ là kiểm tra local, không chứng minh merchant đã được cấp hoặc callback hoạt động.

Trong đợt thiếu bộ nhớ, dịch vụ Windows MySQL92 đang dùng cũng dừng. Phiên công cụ không có quyền SERVICE_START và nhận Access denied khi thử khôi phục. Vì vậy chưa chạy audit CLI mới lên database ứng dụng; nhận định 23 user và 26.000 xu ở trên là kiểm tra chỉ đọc trước sự cố. Cần bật lại MySQL92 bằng PowerShell có quyền Administrator rồi chạy preflight và audit; không cần chạy migration để làm việc này.

```powershell
# PowerShell chạy bằng Administrator
Start-Service MySQL92
# Sau đó chạy ở thư mục repository bằng phiên làm việc thông thường
npm --prefix server run payments:preflight
npm --prefix server run payments:audit
```

## Việc tiếp theo

Sau nghiệm thu DB03, tiếp tục BE01 tạo đơn có idempotency, rồi BE02 cấp xu theo transaction và BE03 API đọc. Merchant Sandbox và địa chỉ HTTPS callback cần thông tin từ chủ dự án; không dùng key demo công khai hoặc tự gửi đăng ký thay chủ tài khoản. Chưa có checkout, adapter VNPAY, service cấp xu hay worker đối soát.

Nguồn kỹ thuật: [MySQL 8.4 về timezone](https://dev.mysql.com/doc/refman/8.4/en/time-zone-support.html). Các kết luận triển khai được đối chiếu với code và kiểm thử fixture của repository.
