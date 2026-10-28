"""Technical implementation plans for the nine editable Word deliverables."""

SOURCES = {
    'vnpay': ('VNPAY Hướng dẫn tích hợp PAY IPN và Return URL', 'https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html'),
    'query': ('VNPAY API truy vấn và hoàn tiền', 'https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html'),
    'momo': ('MoMo Môi trường và quy trình tích hợp', 'https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/'),
    'payos': ('payOS Môi trường kiểm thử', 'https://payos.vn/docs/moi-truong-test/'),
    'apple': ('Apple App Review Guidelines phần thanh toán', 'https://developer.apple.com/app-store/review/guidelines/#in-app-purchase'),
    'google': ('Google Play Payments policy', 'https://support.google.com/googleplay/android-developer/answer/9858738?hl=en'),
}


def md(text): return ('md', text.strip())


def task(code, title, files, steps, done, verify, depends='Không có phụ thuộc bổ sung'):
    return f'''### {code} {title}

**Điểm sửa:** {files}.

**Phụ thuộc:** {depends}.

{chr(10).join(f'{i+1}. {step}' for i, step in enumerate(steps))}

**Hoàn thành khi:** {done}.

**Kiểm chứng:** {verify}.
'''


CATALOG = '''
## Cách dùng bộ kế hoạch

Đọc tài liệu 01 để nắm ranh giới module và thứ tự làm. Mỗi tài liệu còn lại xác định đầu vào, hợp đồng kỹ thuật, các việc cần sửa trong repo và tiêu chí hoàn thành của một phần. Khi bắt đầu code, chuyển từng đầu việc thành issue hoặc checklist của commit; cập nhật trạng thái theo bằng chứng thực tế.

| Tài liệu | Phần triển khai | Phụ thuộc chính |
| --- | --- | --- |
| 01 | Kiến trúc và thứ tự triển khai | Hiện trạng repo và phạm vi P0 |
| 02 | Cơ sở dữ liệu và migration | Kiến trúc và bất biến số dư |
| 03 | Backend API và sổ giao dịch | Schema 02 |
| 04 | VNPAY Sandbox và callback | Service 03 và merchant sandbox |
| 05 | Worker đối soát và phục hồi | Adapter 04 và transaction 03 |
| 06 | Frontend web | Hợp đồng API 03 và Return URL 04 |
| 07 | Expo mobile | API chung và đường quay lại từ 04 |
| 08 | Bảo mật cấu hình và triển khai | Áp dụng từ đầu và rà lại trước khi bật checkout |
| 09 | Kiểm thử và nghiệm thu kỹ thuật | Viết cùng từng module từ 02 đến 08 |

Mã công việc DB BE VN RC WEB MOB SEC QA dùng để tham chiếu chéo. Các tên file mới là vị trí đề xuất. Trước khi tạo module, kiểm tra lại cấu trúc repo để tránh có hai nơi cùng xử lý một nghiệp vụ.
'''

ARCH_TASKS = '''
## Ranh giới module và nguyên tắc dùng chung

Express route chịu trách nhiệm đọc request, auth và chuyển lỗi sang HTTP. PaymentService tạo đơn, xử lý idempotency và áp dụng kết quả xác nhận. Adapter chỉ biết giao thức cổng. WalletService đọc sổ giao dịch và thực hiện thay đổi số dư trong connection được truyền vào.

Worker truy vấn bên ngoài transaction rồi gọi lại PaymentService. Frontend đọc trạng thái đã lưu; không tự xác nhận tiền hoặc cộng xu. MySQL giữ bằng chứng chống xử lý lặp. Redis hỗ trợ điều phối và rate limit khi chạy nhiều replica, nhưng mất Redis không được làm mất lịch sử đã cấp xu.

Hợp đồng adapter dự kiến gồm createCheckout, verifyIpn, verifyReturn và queryPayment. Kết quả chuẩn hóa cần có provider, environment, merchant, reference, amountVnd, currency, trạng thái, transactionId và paidAt. Dữ liệu chưa qua xác minh không được truyền vào đường cấp xu như một VerifiedPayment.

## Thứ tự làm để có mốc chạy được

1. DB và migration đạt kiểm tra giữ nguyên số dư.
2. Service và API chạy với provider test, có test concurrent và rollback.
3. Nối VNPAY và kiểm tra IPN thật ở sandbox.
4. Worker xử lý được giao dịch thiếu callback.
5. Web và mobile dùng cùng hợp đồng backend.
6. Bật checkout trong staging sau khi hoàn thành checklist bảo mật và nghiệm thu.

Web có thể phát triển với fixture sau khi DTO ổn định, nhưng không được coi UI mock là bằng chứng cổng thật đã chạy. Giai đoạn chờ merchant vẫn có thể hoàn thành schema, service và test tự động.

## Các quyết định kiến trúc cần giữ

| Quyết định | Cách triển khai | Lý do kỹ thuật |
| --- | --- | --- |
| Số dư hiện tại | Giữ users.coins và thêm ledger | Tương thích DTO đang dùng trên hai frontend |
| Cấp xu | Một transaction cho order ledger và coins | Tránh lệch số dư nếu tiến trình dừng giữa chừng |
| Nhận kết quả | IPN và query dùng chung service | Loại bỏ hai đường cộng xu khác nhau |
| Kết quả chưa rõ | Giữ pending hoặc needs_review | Timeout không chứng minh thanh toán thất bại |
| Kiểm thử | Provider test tách merchant thật | Test lặp lại được, không phát sinh giao dịch live |
| Tắt tính năng | Tắt tạo đơn mới, giữ xử lý đơn cũ | Checkout đã phát hành vẫn cần được hoàn tất |

## Rủi ro và cách xử lý trước khi code

| Rủi ro | Việc cần làm | Điểm chặn |
| --- | --- | --- |
| Merchant chưa được cấp | Xác nhận thông tin sandbox và API query ở G0 | Chưa ghi nhận G3 hoàn thành |
| Xu cũ không khớp | Kiểm kê và backfill opening balance có khóa ghi | Chưa bật checkout |
| Callback bị middleware chặn | Test request không có phiên qua proxy thật | Chưa nghiệm thu tích hợp |
| Callback đến nhiều lần | Khóa order và unique ledger | Bắt buộc có test hai replica |
| Code cũ ghi coins trực tiếp | Tìm mọi writer và chuyển qua service | Chưa triển khai song song phiên bản cũ |
| Giới hạn phát hành native | Tách demo sandbox và kế hoạch phát hành store | Chưa tuyên bố sẵn sàng store |
'''


DB_FIELDS = [
('coin_packages', [
('id','INT PK','Định danh nội bộ; API nhận code thay vì tin ID do client tự đoán.'),
('code','VARCHAR(32) UNIQUE','Mã ổn định như xu_500; không đổi sau khi có đơn.'),
('name','VARCHAR(100)','Tên gói hiển thị.'),
('amount_vnd','INT UNSIGNED','Số VND nguyên dương, trong hạn mức.'),
('coin_amount','INT UNSIGNED','Số xu nguyên dương.'),
('active và sort_order','BOOLEAN và INT','Ngừng bán bằng active; không xóa gói đã được tham chiếu.'),
('created_at và updated_at','DATETIME(3)','Lưu UTC ở mọi connection.')]),
('payment_orders', [
('id','CHAR(36) PK','UUID không tuần tự cho API.'),
('user_id và package_id','INT FK','Chủ đơn và gói gốc; không cascade xóa lịch sử.'),
('provider environment merchant_code','VARCHAR có giới hạn','Ràng buộc phạm vi định danh và bí mật dùng xác minh.'),
('provider_txn_ref','VARCHAR(100)','Tham chiếu checkout; unique theo provider môi trường merchant.'),
('package_code','VARCHAR(32)','Snapshot mã gói.'),
('amount_vnd và coin_amount','INT UNSIGNED','Snapshot bất biến; không đọc lại giá hiện tại khi cấp xu.'),
('currency','CHAR(3)','P0 chỉ chấp nhận VND.'),
('status','VARCHAR(16)','created pending paid failed cancelled expired; CHECK danh sách.'),
('fulfillment_status','VARCHAR(16)','pending credited needs_review; độc lập trạng thái thu tiền.'),
('provider_transaction_id','VARCHAR(100) NULL','Unique trong phạm vi merchant khi có ID hợp lệ; placeholder thành NULL.'),
('provider_response_code','VARCHAR(32) NULL','Giữ mã cổng; client dùng trạng thái chuẩn hóa.'),
('provider_paid_at và credited_at','DATETIME(3) NULL','Thời điểm thanh toán và thời điểm cấp xu.'),
('review_reason','VARCHAR(100) NULL','Mã nguyên nhân ổn định; không chứa payload nhạy cảm.'),
('idempotency_key','VARCHAR(80)','ASCII collation phân biệt hoa thường; unique cùng user_id.'),
('request_fingerprint','CHAR(64)','SHA256 của payload nghiệp vụ đã chuẩn hóa.'),
('client','VARCHAR(16)','web hoặc native_demo; từ enum cho phép.'),
('checkout_snapshot','JSON','Các trường cố định cần tái tạo cùng URL; không chứa hash secret.'),
('created_at updated_at expires_at','DATETIME(3)','Giờ server và hết hạn checkout.'),
('reconcile_after last_reconciled_at','DATETIME(3) NULL','Lịch và lần query gần nhất.'),
('reconcile_attempts','INT UNSIGNED','Đếm lần thử để áp backoff.'),
('lease_owner và lease_until','VARCHAR(80) NULL và DATETIME(3) NULL','Quyền claim có hạn; hỗ trợ phục hồi sau crash.')]),
('wallet_entries', [
('id','BIGINT UNSIGNED PK','Cursor tăng dần; serialize thành chuỗi khi đưa vào JSON.'),
('user_id','INT FK','Chủ tài khoản bị tác động.'),
('payment_order_id','CHAR(36) NULL UNIQUE','Một bút toán cấp xu trên mỗi đơn trong P0.'),
('entry_type','VARCHAR(32)','opening_balance hoặc topup trong P0.'),
('delta_coins','INT','Số xu thay đổi có dấu; không dùng float.'),
('balance_after','INT','Số dư sau khi ghi; không âm, không vượt hạn mức.'),
('reason','VARCHAR(255)','Diễn giải cho chủ ví; không lưu secret.'),
('migration_key','VARCHAR(100) NULL UNIQUE','Khóa ổn định theo version và user cho backfill.'),
('created_at','DATETIME(3)','Thời gian UTC; phân trang bằng id để xử lý trùng giờ.')]),
('payment_events', [
('id','BIGINT UNSIGNED PK','Định danh sự kiện; JSON serialize chuỗi.'),
('order_id','CHAR(36) NULL FK','Có thể chưa tìm thấy đơn ở bước tiếp nhận.'),
('provider environment merchant_code','VARCHAR có giới hạn','Phạm vi nguồn nhận.'),
('source','VARCHAR(20)','ipn reconciliation hoặc return.'),
('event_fingerprint','CHAR(64)','Hash trường nghiệp vụ chuẩn hóa; không hash thứ tự query thô.'),
('verification_result processing_result','VARCHAR(32)','Kết quả kiểm tra và áp dụng.'),
('safe_payload','JSON NULL','Chỉ trường cho phép; không nguyên bản request.'),
('created_at','DATETIME(3)','Thời gian tiếp nhận.')]),
('payment_audit', [
('id','BIGINT UNSIGNED PK','Định danh audit; JSON serialize chuỗi.'),
('order_id','CHAR(36) NULL FK','Đơn liên quan nếu có.'),
('actor_user_id','INT NULL FK','Admin hoặc NULL cho tác vụ hệ thống; giữ dấu vết khi ẩn danh hóa.'),
('action','VARCHAR(64)','Ví dụ request_reconciliation và resolve_review_reason.'),
('reason','VARCHAR(500)','Lý do thao tác; bắt buộc với thao tác quản trị cần giải thích.'),
('request_id','VARCHAR(80)','Liên kết request hoặc job.'),
('created_at','DATETIME(3)','Thời gian UTC.')]),
]


def db_dictionary():
    blocks=[md('''## Từ điển trường và kiểu lưu trữ

Các kiểu sau là đề xuất để viết DDL ở giai đoạn DB. Tiền và số dư dùng INT có giới hạn để tương thích User.coins hiện tại. Những khóa BIGINT của ledger và audit được trả bằng chuỗi, tránh mất chính xác khi JSON đi qua JavaScript. Không bật tùy chọn driver tự biến mọi BIGINT thành number.
''')]
    for table,rows in DB_FIELDS:
        blocks.append(md('### Bảng ' + table.replace('_',' ')))
        blocks.append(('table',(['Trường','Kiểu đề xuất','Ràng buộc và cách dùng'],rows,[4.1,3.7,7.7])))
    return blocks


DB_TASKS = task('DB01','Thêm schema và kiểm tra lúc khởi động',
'`server/schema.sql`, `server/paymentSchema.ts`, `server/db.ts`',
['Tạo năm bảng và FK đúng kiểu users.id; thêm index theo truy vấn thực tế.',
 'Đặt default coins về 0; kiểm tra null, số âm và trần trước khi thêm ràng buộc.',
 'Nhánh production không migrate phải probe bảng/cột mới trước khi mở server.'],
'DB mới và DB nâng cấp có cùng contract; thiếu schema gây lỗi khởi động rõ ràng',
'Fixture database mới; database legacy; thử khởi động với schema thiếu một cột') + task(
'DB02','Backfill số dư và chặn writer cũ','`server/paymentSchemaMigration.ts`, `server/routes/auth.ts`, script seed có coins',
['Kiểm kê và đóng băng các đường ghi xu trong cửa sổ migration.',
 'Tạo opening_balance theo batch bằng migration_key version/user; không reset số dư.',
 'Đăng ký mới ghi số dư 0; mọi script tạo xu mẫu ghi ledger tương ứng hoặc chỉ chạy trước backfill.'],
'Mỗi user đã chuyển có một opening entry; chạy lại không làm tăng xu',
'So SUM(delta_coins) với coins cho từng user và toàn hệ thống; chạy migration hai lần',
'DB01') + task('DB03','Chốt ràng buộc và chuẩn hóa thời gian','Schema, connection mysql2 và truy vấn ledger',
['Cấu hình timezone UTC và không phụ thuộc timezone hệ điều hành.',
 'Unique topup theo order; unique idempotency theo user; unique transaction cổng theo merchant.',
 'Chọn CHECK và guard service cho tiền, status, balance; không dùng CASCADE cho lịch sử tài chính.'],
'Schema ngăn được hai topup cùng đơn và dữ liệu ngoài miền',
'Insert lỗi có chủ đích và kiểm tra rollback; xác minh explain cho lịch sử và worker',
'DB01')

BACKEND_TASKS = task('BE01','Tạo đơn có idempotency','`server/payments/paymentService.ts`, `server/routes/payments.ts`',
['Validate strict payload packageCode/client, key ASCII có giới hạn và user từ phiên.',
 'Tính fingerprint từ payload chuẩn hóa; reserve order bằng unique key trong transaction.',
 'Chụp gói và tham số checkout; trả URL chỉ sau commit. Cùng key/payload trả cùng order.',
 'Nếu key trùng nhưng fingerprint khác trả 409; nếu đơn cũ hết hạn không tự tạo lại.'],
'Concurrent create chỉ sinh một order và không có client nào tự định giá',
'PAY01 PAY02 PAY04 PAY05 PAY31; fixture không gọi cổng thật',
'DB01 và DB03') + task('BE02','Áp dụng kết quả đã xác minh','`server/payments/paymentService.ts`, `walletService.ts`',
['Thiết kế VerifiedPayment chỉ được tạo từ adapter xác minh; route không ép kiểu dữ liệu tùy ý vào đó.',
 'Khóa order rồi user trên cùng PoolConnection; so lại snapshot và nguồn xác nhận.',
 'Insert ledger, cộng coins, update order và notification trong một transaction.',
 'Đơn paid nhưng chưa cấp được vào needs_review với lý do; không ghi entry giả.'],
'IPN và query gọi cùng service; một order chỉ có một lần cấp xu',
'PAY06 PAY07 PAY08 PAY11 PAY17 PAY18 PAY19 PAY27',
'DB01 DB03 và contract trạng thái') + task('BE03','Expose API đọc ví và đơn','`server/routes/wallet.ts`, `payments.ts`, `src/types/index.ts`, mobile types',
['Scope mọi query bằng user_id trong auth; không nhận userId để đổi chủ ví.',
 'DTO chỉ có dữ liệu người dùng cần; khóa BIGINT/cursor trả chuỗi và timestamp trả ISO8601.',
 'Cursor phân trang có giới hạn; kiểm tra user scope trên từng request; đặt no-store.',
 'Map lỗi ổn định; không để lỗi SQL, hash hoặc checkout của người khác ra response.'],
'Hai frontend dùng cùng tên trường và semantics; đơn không thuộc user trả 404',
'PAY22 PAY29 cùng test phân trang không lặp hoặc bỏ mục khi trùng timestamp',
'BE01 BE02') + task('BE04','Tách quyền quản trị và cấu hình feature','`server/routes/admin.ts` hoặc module admin payment riêng, `server/server.ts`',
['Mount route admin dưới authenticateToken và checkRole admin; không cấp cho moderator.',
 'GET list/summary có filter và khoảng thời gian hữu hạn, luôn tách môi trường.',
 'POST reconcile chỉ xếp việc, có cooldown theo order và audit reason.',
 'Giữ deposit-coins cũ trả 403; feature flag chỉ chặn tạo checkout mới.'],
'Admin không có thao tác sửa số dư hoặc tự đặt paid trong P0',
'PAY22 PAY24 và test role reader author moderator admin',
'BE03 và RC01')

DTO = '''
## DTO và quy ước HTTP

API người dùng dùng camelCase; cột DB dùng snake_case. Tiền và xu là JSON number nguyên trong giới hạn đã chốt; ID UUID là string, ID BIGINT và cursor là string. Timestamp là ISO8601 UTC. Không serialize bigint của JavaScript trực tiếp vào JSON.

| DTO | Trường tối thiểu | Quy tắc |
| --- | --- | --- |
| CoinPackage | code name amountVnd coinAmount | Chỉ gói active; backend vẫn kiểm tra lại khi tạo |
| TopupOrder | orderId status fulfillmentStatus amountVnd coinAmount environment createdAt expiresAt paidAt creditedAt reviewCode | paidAt/creditedAt có thể null; thiếu creditedAt không được báo đã nhận xu |
| CreateTopupResult | TopupOrder và checkoutUrl | URL chỉ trả cho chủ đơn và còn hạn; không log |
| Wallet | balanceCoins updatedAt | Đọc DB; không suy từ cache user ở frontend |
| WalletEntry | id type deltaCoins balanceAfter orderId createdAt reason | id dạng chuỗi; orderId có thể null cho opening |
| PagedResult | items nextCursor | nextCursor null khi hết; max limit 50 |
| ApiError | error code requestId | error đọc được; code phục vụ client; không có stack |

POST tạo mới trả 201, replay cùng key trả 200, key xung đột trả 409. Validation trả 400; gói ngừng bán hoặc hạn mức nghiệp vụ dùng mã ổn định với status thống nhất. Không có phiên trả 401; tài khoản không active giữ semantics 403 hiện tại. Rate limit trả 429 với thời gian thử lại khi có.

## Payload mẫu để frontend và test thống nhất

```json
{
  "packageCode": "xu_500",
  "client": "web"
}
```

```json
{
  "orderId": "<UUID>",
  "status": "pending",
  "fulfillmentStatus": "pending",
  "amountVnd": 50000,
  "coinAmount": 500,
  "environment": "sandbox",
  "checkoutUrl": "<checkout do backend tao>",
  "expiresAt": "<ISO8601 UTC>"
}
```

Client tạo một Idempotency-Key cho một ý định mua. Mất response thì retry bằng cùng key; người dùng chủ động mua lần khác mới tạo key khác. Header này phải được CORS cho phép trong môi trường tách origin.

## Kiểm tra từng nhóm endpoint

GET packages không trả secret, merchant key hoặc giá trị số dư. POST topups không nhận URL quay về do client tự đặt. GET topups và entries giới hạn page size và chỉ query của chủ phiên. GET order không được gọi API cổng trên mỗi lượt poll.

GET IPN và Return là adapter routes công khai; cấu trúc phản hồi bám giao thức cổng. API admin luôn có auth và quyền admin, kể cả khi route phía UI đã bị ẩn. Summary chỉ đếm amount của paid và xu của credited theo đúng từng môi trường; pending và opening balance không phải doanh thu.
'''

VNPAY_TASKS = task('VN01','Chốt merchant và cấu hình biên giao thức','`server/config.ts`, `server/.env.example`, `providers/vnpay.ts`',
['Xác nhận merchant sandbox, secret, URL IPN public HTTPS và quyền API query.',
 'Validate provider/environment/endpoints khi khởi động; cấm cấu hình trộn sandbox với live.',
 'Lưu version key dùng cho từng order để các đơn cũ còn xác minh được khi xoay khóa.'],
'Có cấu hình sandbox hợp lệ và checklist merchant không chứa secret trong Git',
'Test fail-fast với config thiếu secret hoặc sai host; kiểm tra endpoint public từ ngoài máy',
'Thông tin được cấp bởi nhà cung cấp') + task('VN02','Viết ký checkout và kiểm tra IPN','`server/payments/providers/vnpay.ts`, unit test adapter',
['Tách canonicalization, encode, ký và verify thành hàm thuần có test vector.',
 'Chặn query lặp key, object/array, hash sai định dạng trước khi xác minh.',
 'Chuẩn hóa trường về VerifiedPayment, so tiền và merchant rồi gọi BE02.',
 'Đối chiếu bảng phản hồi IPN theo merchant; chỉ ACK kết quả xử lý sau commit.'],
'Không phụ thuộc JSON stringify hoặc thứ tự req.query để ký; không cấp xu chỉ từ hash đúng',
'PAY09 PAY10 PAY12 PAY28; thành công sandbox có IPN về API',
'VN01 BE02') + task('VN03','Làm Return URL và điều hướng an toàn','`server/routes/payments.ts`, hash route web và scheme native',
['Return xác minh dữ liệu để giải thích kết quả, nhưng không là đường cấp xu.',
 'Lấy client từ order; dựng destination từ cấu hình cố định, chỉ truyền order ID.',
 'Nếu không nhận diện đơn hoặc signature lỗi, quay về màn hình lỗi chung không lộ dữ liệu.',
 'Kiểm tra redirect trước IPN, sau IPN, mất phiên và mở bằng tài khoản khác.'],
'Không có open redirect hoặc token trong URL; kết quả cuối đọc từ API có auth',
'PAY13 PAY14 PAY29 PAY30',
'VN02 BE03 và hợp đồng return đã thống nhất với web mobile') + task('VN04','Tách API truy vấn có xác minh riêng','`server/payments/providers/vnpay.ts`',
['Xây request query từ order đã lưu, không tạo lại tham chiếu hoặc CreateDate mới.',
 'Xác minh response theo đúng schema query; so merchant, tiền, tham chiếu và ID.',
 'Trả kết quả chuẩn hóa hoặc kết quả chưa rõ; không map timeout sang failed.'],
'RC02 có thể dùng query để phục hồi đơn thiếu IPN qua cùng BE02',
'PAY21 và một sandbox case thiếu callback đã được kiểm soát',
'VN01 và BE02')

RECON_TASKS = task('RC01','Claim việc bằng DB lease','`server/payments/reconcile.ts`, schema order và scheduler',
['Chọn batch nhỏ tới reconcile_after, còn trong cửa sổ query hoặc có mâu thuẫn.',
 'Claim bằng FOR UPDATE SKIP LOCKED và lease_owner/lease_until; commit claim trước mạng.',
 'Chọn lease dài hơn timeout từng lần gọi và có biên xử lý; heartbeat nếu cần.',
 'Đọc/ghi kết quả bằng điều kiện lease owner, đồng thời áp transaction BE02.'],
'Hai worker không giữ cùng lease hợp lệ; worker chết có thể được thay thế',
'PAY19 PAY20 PAY32 trên hai connection/process',
'DB01 DB03') + task('RC02','Lập lịch truy vấn và retry','`server/payments/reconcile.ts`, provider query',
['Tách next schedule khỏi HTTP request của frontend; không query cổng theo mỗi lượt poll.',
 'Dùng exponential backoff có jitter và trần; cấu hình batch và rate theo merchant.',
 'Giữ pending khi timeout/chưa rõ; chỉ áp dụng trạng thái từ response xác minh.',
 'Sau cửa sổ đề xuất 48 giờ, chuyển hàng chờ kiểm tra thay vì xóa hoặc suy ra failed.'],
'Không tạo retry storm và không bỏ tiền vì callback đến muộn',
'Đồng hồ giả, response sai hash, timeout và 50 đơn chờ không làm treo scheduler',
'RC01 VN04') + task('RC03','Xử lý kết quả mâu thuẫn và needs review','PaymentService, admin payment và payment_audit',
['paid đã credited không hạ do callback cũ; mâu thuẫn chỉ tạo sự kiện và lịch đối soát.',
 'Đơn expired có bằng chứng paid hợp lệ vẫn đi qua BE02; lưu paidAt thực.',
 'Đơn paid needs_review giữ nghĩa vụ cấp; xử lý nguyên nhân có audit rồi áp lại cùng service.',
 'Admin request reconcile có cooldown; không sửa số xu hoặc tự đánh dấu paid.'],
'Các đường phục hồi vẫn tuân unique ledger và snapshot đơn',
'PAY15 PAY16 PAY19 PAY27 cùng test audit admin',
'RC02 BE04')

RECON_RULES = '''
## Ma trận phục hồi theo điểm dừng

| Điểm dừng | Dữ liệu đã bền vững | Hành động khi chạy lại |
| --- | --- | --- |
| Chưa commit order | Không có đơn | Retry cùng key tạo hoặc đọc lại một đơn |
| Order commit nhưng client mất response | Đơn và snapshot | Cùng key trả cùng checkout còn hạn |
| Đã claim nhưng chưa query | Lease DB | Hết lease cho worker khác tiếp tục |
| Query xong nhưng chưa ghi | Đơn chưa credited | Query/IPN lại rồi BE02 |
| Đang ghi ledger nhưng chưa commit | Transaction chưa bền vững | Rollback; retry áp toàn bộ |
| Commit xong nhưng chưa ACK | Order ledger coins nhất quán | Replay đọc kết quả cũ |
| DB restore từ backup cũ | Một phần lịch sử có thể quay lùi | Đối chiếu cổng theo khoảng mất dữ liệu trước khi mở mới |

## Guard để scheduler không ảnh hưởng phần khác

Không gộp toàn bộ batch query vào transaction đang xuất bản chương. Tick hiện có chỉ nhận trách nhiệm enqueue hoặc kích hoạt batch thanh toán giới hạn. Một order lỗi không được làm dừng mọi order sau. Có cờ enable riêng và metric tuổi đơn chờ; khi shutdown không nhận batch mới và để lease của việc dang dở hết hạn an toàn.

Lease chỉ giảm xử lý trùng; row lock và unique ledger mới bảo vệ tác động số dư. Worker có thể bị chậm sau khi lease hết hạn nên bước ghi phải kiểm tra lại trạng thái đơn và owner, không tin kết quả claim cũ.
'''

WEB_TASKS = task('WEB01','Bổ sung route và điểm vào ví','`src/App.tsx`, `src/utils/authNavigation.ts`, `src/pages/UserProfile.tsx`',
['Thêm wallet và payment result vào parser hash, listener và đồng bộ view/hash.',
 'Bảo vệ trang cá nhân bằng luồng auth hiện có; safeAuthReturn nhận lại đúng route đơn.',
 'Thêm điểm vào từ hồ sơ; không hiện giao dịch ở profile công khai.',
 'Tải số dư từ API và đồng bộ currentUser sau khi biết credited.'],
'Reload back forward và đăng nhập lại không mất order ID hoặc mở sai trang',
'PAY22 PAY29, browser navigation test hiện có sau khi sửa',
'BE03') + task('WEB02','Xây màn hình ví và tạo checkout','`src/pages/Wallet.tsx`, `src/styles/wallet.css`',
['Tải packages, số dư và lịch sử độc lập với trạng thái lỗi riêng.',
 'Giữ packageCode đã chọn; tạo key một lần cho ý định mua và reuse sau timeout.',
 'Chỉ chuyển tới checkoutUrl đã nhận từ server; khóa submit trong khi request chạy.',
 'Tách order history và wallet entries; số dư từ API là nguồn hiển thị cuối.'],
'Không double checkout, không tăng xu bằng localStorage và không xóa lựa chọn khi API lỗi',
'PAY04 PAY05 PAY13 PAY31 và UI keyboard/theme',
'WEB01 BE01 BE03') + task('WEB03','Trang kết quả và cơ chế refresh','`src/pages/PaymentResult.tsx`, helper polling nếu cần',
['Đọc order theo ID có auth; paid + pending/needs_review không hiển thị credited.',
 'Poll DB theo nhịp 2/4/8/15 giây rồi 15 giây trong tối đa hai phút.',
 'Abort request và clear timer khi unmount; pause tab ẩn; refresh một lần khi trở lại.',
 'Nếu mạng lỗi giữ trạng thái chưa xác định và mã đơn, cho kiểm tra lại; không tự tạo đơn mới.'],
'Redirect tới trước IPN và mất mạng không tạo thông báo thành công giả',
'PAY13 PAY14 PAY18 PAY29 và test không còn timer sau đổi route',
'WEB01 VN03') + task('WEB04','Tra cứu quản trị và kiểm tra responsive','`src/pages/AdminDashboard.tsx`, component quản trị mới nếu cần',
['Thêm filter user/order/status/time/environment; giữ page size hữu hạn.',
 'Hiện paid và credited riêng; needs_review nổi rõ, audit có lý do.',
 'Nút reconcile chỉ gửi request xếp việc và hiển thị cooldown.',
 'Kiểm tra 3 theme; width 320/390 sau bypass gate, tablet và desktop; dùng useDialogFocus cho dialog.'],
'Admin thấy trạng thái thật, không có nút sửa coins hoặc đặt paid',
'PAY22 PAY24 và browser smoke không runtime errors/overflow',
'BE04 RC03')

WEB_STATES = '''
## Hợp đồng trạng thái giao diện

| Dữ liệu backend | Thông báo | CTA chính |
| --- | --- | --- |
| created hoặc pending | Đang chờ xác nhận thanh toán | Kiểm tra lại |
| paid và credited | Thanh toán thành công và đã nhận xu | Về ví |
| paid và needs_review | Đã ghi nhận thanh toán và đang xử lý cấp xu | Xem chi tiết đơn |
| failed hoặc cancelled | Giao dịch thất bại hoặc đã hủy | Tạo giao dịch mới |
| expired nhưng chưa xác minh paid | Đường thanh toán đã hết hạn | Xem lịch sử trước khi tạo mới |
| Request đọc lỗi | Chưa lấy được kết quả | Thử lại |

Trạng thái loading không dùng lịch sử trống để thay thế. Chỉ báo không có giao dịch sau request thành công. Nếu refresh lỗi, giữ dữ liệu đã có và thông báo lỗi cập nhật.

## Bố cục và component cần tái sử dụng

Ví gồm số dư, nhãn sandbox, danh sách gói, đơn đang chờ và lịch sử có phân trang. Card gói dùng số tiền VND và số xu với phân cấp rõ. Dùng token --bg-base, --bg-card, --text-main và --border-color; màu Sakura nhấn chọn, CTA chính theo primary-btn.

Tái sử dụng PageLoading, PageError, Icons và useDialogFocus. Link dùng cho điều hướng, button dùng cho mutation. Mỗi trạng thái có chữ giải thích, không chỉ đổi màu. Trang kết quả phải đọc được bằng bàn phím và trình đọc màn hình, có cập nhật aria-live vừa phải cho kết quả chuyển trạng thái.
'''

MOBILE_TASKS = task('MOB01','Thêm API service và màn hình ví native','`mobile/src/services/api/paymentService.ts`, types, `mobile/app/wallet.tsx`',
['Dùng apiClient và token storage hiện có; không tạo thêm store phiên thứ hai.',
 'Render packages và histories bằng primitive Screen/Card/Button và palette hiện có.',
 'Giữ key cho retry tạo đơn; chỉ gửi packageCode và client native_demo.',
 'Mở điểm vào từ tab Cá nhân, giữ auth gate của root layout.'],
'Đọc cùng balance và history với web, không gọi cổng trực tiếp từ app',
'PAY02 PAY04 PAY22; mobile typecheck và API fixture',
'BE03') + task('MOB02','Mở checkout và quay lại app','`mobile/app/payment/result.tsx`, `mobile/app.json`, expo linking/browser helper',
['Dùng expo-web-browser hoặc trình duyệt hệ thống; không nhận thẻ trong WebView của app.',
 'Dựng deep link bằng API Expo theo scheme mugenbunko, chỉ truyền order ID.',
 'Cả warm start và cold start parse cùng contract; link không mang token/amount để cấp xu.',
 'Nếu quay lại thất bại, user vẫn có thể mở Ví để đọc trạng thái server.'],
'Đóng browser không đồng nghĩa thành công; deep link không làm lộ đơn ngoài tài khoản',
'PAY13 PAY14 PAY29 PAY30 trên Android thật hoặc emulator',
'VN03 MOB01') + task('MOB03','Đồng bộ khi app trở lại foreground','AuthContext, screen wallet/result và AppState listener',
['Khi active lại, refetch order và wallet một lần; debounce các tín hiệu trùng.',
 'Hủy listener/request khi screen unmount và ngăn cập nhật state từ response cũ.',
 'Mất mạng giữ order ID; user thử lại bằng cùng intent thay vì tạo checkout ngầm.',
 'Test app kill/reopen, đổi tài khoản và token hết hạn.'],
'Số dư chính xác sau app background và không có double submit/refresh storm',
'PAY14 PAY29 PAY30 PAY32; ghi platform và thiết bị đã thử',
'MOB02')

MOBILE_RULES = '''
## Phạm vi nền tảng và điều hướng

Mobile là frontend Expo Router riêng, không mang CSS/DOM hoặc hash router web sang native. Root có auth gate; giữ nguyên năm tab đang có. Màn hình ví đi từ Cá nhân, màn hình kết quả là route riêng để xử lý deep link và Back.

expo-linking và expo-web-browser đã có trong mobile/package.json. Tận dụng dependencies này trước khi thêm thư viện. Đích native trong cấu hình backend phải khớp đường mà Expo parse được; không chỉ ghép chuỗi scheme rồi coi là đã kiểm thử.

## Checklist native trước khi chốt

- Checkout mở từ một screen đã đăng nhập.
- Return hoạt động khi app đang mở và khi app đã bị kill.
- Return tới trước IPN hiển thị chờ, sau đó đọc lại được trạng thái mới.
- Browser đóng thủ công không báo đã trả tiền.
- Foreground refresh cập nhật ví từ backend.
- Đổi tài khoản giữa chừng không đọc được đơn của tài khoản cũ.
- Android Back không tạo lại giao dịch; bàn phím và safe area không che CTA.
- Ghi rõ kết quả Android và iOS riêng; export web không thay kiểm tra native.

## Ranh giới của bản demo và phát hành store

Kế hoạch này cho phép demo sandbox qua browser. Trước phát hành store, đối chiếu chính sách mua nội dung số của Apple và Google theo thị trường phân phối, sau đó quyết định luồng IAP/Billing hoặc ngoại lệ áp dụng. Không bật đường thanh toán live trong app chỉ dựa vào việc sandbox đã chạy.
'''

SEC_TASKS = task('SEC01','Rà quyền và biên dữ liệu','Auth, middleware security/limits và payment routes',
['Giữ Origin/CSRF cho mutation của người dùng và admin; ngoại lệ callback đúng method/path.',
 'Scope query theo user_id; callback chỉ dùng chữ ký và đối chiếu đơn, không dùng session mua.',
 'Validate strict scalar, độ dài, enum, số nguyên và trạng thái được chuyển.',
 'Đặt no-store cho wallet/order/admin và giới hạn riêng cho create/IPN/reconcile.'],
'Không có IDOR open redirect hoặc đường cấp xu từ payload client',
'PAY02 PAY03 PAY09 PAY10 PAY22 và security regression',
'Thiết kế từ BE01 VN02') + task('SEC02','Quản lý secret và endpoint theo môi trường','`server/config.ts`, env examples, Compose và proxy',
['Secret chỉ ở backend; không đưa vào VITE hoặc EXPO_PUBLIC, Git, image hay logs.',
 'Fail-fast khi enabled mà thiếu merchant/key/HTTPS hoặc endpoint trộn môi trường.',
 'Redact query string IPN/Return tại reverse proxy và observability.',
 'Key rotation giữ phiên bản cần cho các order cũ, có audit thay cấu hình.'],
'Checkout public chỉ dùng host cho phép và callback không lộ dữ liệu nhạy cảm',
'Quét build frontend/Git diff; thử config lỗi; kiểm tra log proxy staging',
'VN01') + task('SEC03','Triển khai theo thứ tự có thể quay lui','Deployment scripts hiện có, migration và readiness probes',
['Backup và thử restore vào DB riêng; tắt tạo checkout trước khi thay schema.',
 'Chạy migration bằng tài khoản đủ quyền rồi khởi động app bằng tài khoản hạn chế.',
 'Deploy code hiểu schema mới, kiểm tra health và sandbox một giao dịch đầy đủ.',
 'Bật tạo đơn sau checklist; rollback bằng feature flag hoặc bản tương thích, không drop ledger.'],
'Không có khoảng chạy code cũ ghi coins ngoài service mới',
'PAY24 PAY25 PAY26 cùng smoke staging và rehearsal rollback',
'DB02 BE02 VN02 RC02 và QA trọng yếu')

OPERATIONS = '''
## Cấu hình cần chuẩn bị trước khi có module

Repo hiện chạy web bằng npm run dev và backend ở cổng 5000. Các biến PAYMENT và VNPAY trong tài liệu gốc là tên đề xuất cần implement validation; đặt chúng vào env hiện tại chưa làm xuất hiện tính năng thanh toán.

Sau khi code config, chuẩn bị merchant sandbox, secret phía server, base URL backend HTTPS công khai, base URL frontend và đường return native. PUBLIC_URL và FRONTEND_URL hiện có vẫn phục vụ chính sách origin; tránh dùng một biến cho hai mục đích khác nhau mà không kiểm tra.

## Lệnh hiện có và lệnh cần bổ sung

Các lệnh sau có trong repository và dùng kiểm tra build trước triển khai:

```powershell
npm run typecheck
npm run build
npm --prefix server run build
npm --prefix server run test:security
npm --prefix mobile run typecheck
```

Production migration hiện có là npm --prefix server run migrate:production sau build, nhưng chỉ xử lý bảng thanh toán sau khi DB01 được tích hợp. Script test:payments và các lệnh audit ledger cần được viết; không coi là lệnh đã có sẵn.

## Runbook cho các sự cố chính

### Không nhận được IPN

Kiểm tra DNS TLS URL merchant và proxy trước. Xem log theo order/reference với query đã redact. Đối chiếu middleware và limiter. Xếp query qua worker; không cấp xu dựa vào ảnh thanh toán hoặc redirect của người dùng.

### Có paid nhưng chưa credited

Đọc review_reason và event đã xác minh. Kiểm tra giới hạn số dư và bản ghi user. Sửa nguyên nhân bằng quy trình có audit, sau đó yêu cầu đối soát cùng order. Không tạo entry hoặc thay coins bằng SQL thủ công để làm mất dấu vết.

### Callback sai chữ ký tăng đột biến

Kiểm tra merchant/environment/version key, cách encode và đồng hồ cấu hình. Giới hạn request rác, không đổi verify sang chế độ bỏ qua. Nếu nghi key lộ, tắt checkout mới và thực hiện key rotation có kiểm soát cho đơn đang chờ.

### Ledger không khớp số dư

Dừng writer gây lệch và tắt checkout mới. Giữ bằng chứng DB/log, xác định order/user liên quan và so lịch sử với cổng. Chỉ sửa qua bút toán điều chỉnh được thiết kế và review; P0 không cung cấp nút cộng xu thủ công.

### Cổng chậm hoặc mất kết nối

Giữ đơn chưa rõ kết quả; worker backoff, không tạo retry storm. Thông báo chờ ở client. Tắt checkout mới nếu cần nhưng vẫn nhận callback và tiếp tục đối soát khi cổng hồi phục.

## Metric và ngưỡng cần theo dõi

Theo dõi pending age, thời gian từ paid tới credited, tỷ lệ query lỗi, số đơn needs_review và chênh lệch ledger. Ngưỡng cảnh báo cần lấy từ đo staging; không ghi con số SLO như kết quả đã đạt. Metric không gắn order ID/user ID thành label; log có thể dùng định danh an toàn để truy vết.
'''

TEST_DETAILS = [
('PAY01','Tạo đơn theo gói','Một user active và gói xu_500 active.','Gọi tạo đơn; đọc snapshot trong DB.','50.000 VND và 500 xu; có một order pending.'),
('PAY02','Sửa payload phía client','Có user A và user B.','Gửi thêm amount coinAmount userId và returnUrl khác; kiểm tra response và DB.','Bị từ chối hoặc bỏ trường theo contract strict; không đổi giá hoặc chủ ví.'),
('PAY03','Auth và tài khoản khóa','Không token, token hết hạn và user suspended.','Thử tạo đơn ở từng trạng thái.','401/403 phù hợp; không tạo checkout.'),
('PAY04','Tạo đơn đồng thời cùng key','Một key và cùng payload; hai connection.','Gửi nhiều request đồng thời, làm rơi một response rồi retry.','Một order và cùng checkout; không nhân đôi.'),
('PAY05','Xung đột idempotency','Đã dùng một key tạo đơn.','Dùng lại key với gói hoặc client khác.','409; giữ nguyên snapshot đơn cũ.'),
('PAY06','IPN thành công','Một pending order và payload chữ ký hợp lệ.','Nhận IPN rồi đọc order user ledger notification.','Một lần cấp đúng xu và cùng trạng thái đã commit.'),
('PAY07','IPN lặp và concurrent','Hai API process cùng DB.','Gửi cùng IPN mười lần và đồng thời.','Một topup entry; balance tăng một lần.'),
('PAY08','Hai đơn cùng ví','Hai order khác ID cho một user.','Xác nhận hai đơn đồng thời qua hai connection.','Tăng đủ hai khoản; balance_after tạo chuỗi nhất quán.'),
('PAY09','Payload và hash không hợp lệ','Adapter với test key.','Thử hash lỗi độ dài, chữ ký sai, query lặp key và array.','Không thay coins hoặc credited.'),
('PAY10','Sai merchant môi trường hoặc tiền','Payload được ký bằng test key nhưng trường sai.','Thử từng mismatch với snapshot.','Không cấp xu; có kết quả từ chối có thể truy vết.'),
('PAY11','Trùng transaction phía cổng','Hai order khác nhau.','Xác nhận cả hai với cùng transaction ID hợp lệ.','Unique/guard chặn cấp xu hai lần trên cùng giao dịch.'),
('PAY12','Không tìm thấy order','Mã tham chiếu chưa có trong DB.','Gửi IPN có cấu trúc hợp lệ.','Không tự tạo order/user; phản hồi theo giao thức.'),
('PAY13','Redirect không là bằng chứng cấp xu','Đơn pending, IPN chưa đến.','Mở Return và giả URL thành công; đọc số dư.','Số dư chưa đổi; UI chờ hoặc báo lỗi verify.'),
('PAY14','Không quay lại trang','Checkout đã mở.','Đóng client; xử lý IPN; mở ví trên thiết bị khác.','Kết quả còn trong DB và số dư đúng.'),
('PAY15','Paid đến sau expiry','Order đã hết hạn local.','Nhận bằng chứng paid hợp lệ đến muộn.','Cấp đúng một lần và lưu paidAt thực.'),
('PAY16','Event cũ sau khi paid','Đơn đã credited.','Nhận callback failed/cancelled cũ hoặc mâu thuẫn.','Không hạ paid hoặc trừ xu; có đối soát nếu cần.'),
('PAY17','Rollback giữa các lệnh ghi','Có fault injection sau insert ledger.','Gây lỗi trước update coins/commit; đọc DB rồi retry.','Lần lỗi rollback toàn bộ; lần retry chỉ cấp một lần.'),
('PAY18','Mất ACK sau commit','Transaction đã commit.','Mô phỏng mất phản hồi; cổng gửi lại.','Nhận diện đã xử lý, không tăng balance tiếp.'),
('PAY19','IPN chạy cùng worker','Order pending và worker có response đã xác minh.','Cho hai đường cùng áp BE02.','Một topup entry và một thông báo cấp xu.'),
('PAY20','Worker crash và lease','Worker A đã claim.','Dừng trước/sau query; cho hết lease rồi worker B chạy.','B tiếp tục được; response A muộn không cấp trùng.'),
('PAY21','Query timeout hoặc sai chữ ký','Provider test điều khiển lỗi.','Trả timeout, invalid hash và sai amount.','Giữ kết quả chưa rõ; backoff; không credited.'),
('PAY22','Quyền đọc đơn và admin','Đơn user A; phiên user B và moderator.','Đọc ID A, cursor khác scope, gọi route admin.','404 hoặc 403 phù hợp; không lộ dữ liệu A.'),
('PAY23','User khóa sau checkout','User active tạo order rồi bị suspended.','Nhận IPN thành công.','Quyền lợi được ghi; tài khoản vẫn bị khóa truy cập.'),
('PAY24','Tắt tạo mới khi có pending','Có một order chưa ngã ngũ.','Tắt feature; thử tạo mới và nhận IPN/query đơn cũ.','Tạo mới bị chặn; đơn cũ vẫn hoàn tất.'),
('PAY25','Migration lặp lại','DB cũ có user 0 và user có xu.','Backfill hai lần; so ledger và balance.','Một opening mỗi user và không đổi số dư.'),
('PAY26','Dữ liệu legacy bất thường','DB cũ có coins null/âm/ngoài giới hạn.','Chạy preflight và migration.','Dừng hoặc đưa xử lý rõ; không tự cắt số dư.'),
('PAY27','Không thể cấp vì trần số dư','Balance gần giới hạn; đơn hợp lệ.','Nhận paid khi coinAmount vượt trần sau cộng.','paid + needs_review, không entry giả; có đường xử lý nguyên nhân.'),
('PAY28','Encode và timezone','Vector fixed với Unicode khoảng trắng + và %.','Ký/verify ở máy timezone khác, so chuỗi và thời gian.','Vector khớp; thời gian gateway đúng quy ước.'),
('PAY29','Hết phiên trên trang kết quả','Đơn A và route kết quả.','Expire token, login lại A rồi thử login B.','A quay lại đúng đơn; B không xem được đơn A.'),
('PAY30','Native return và browser close','App Android/emulator; ghi rõ iOS nếu có.','Test warm/cold link, kill app, đóng browser, foreground.','Chỉ đọc backend; không báo thành công từ browser close.'),
('PAY31','Gói đổi sau khi tạo','Order snapshot từ gói cũ.','Tắt/đổi gói rồi xác nhận order cũ và tạo order mới.','Đơn cũ dùng snapshot; đơn mới theo danh mục mới.'),
('PAY32','Restart và hai replica','Hai API/worker dùng chung DB.','Tạo order, restart API, retry tạo và xác nhận.','Idempotency bền vững; không dựa RAM và không mất đơn.'),
]


def test_blocks():
    blocks=[md('''## Cách ghi bằng chứng thực thi

Tất cả ca dưới đây có trạng thái ban đầu Chưa thực hiện. Khi chạy, bổ sung ngày giờ, commit, môi trường, request ID, trạng thái trước sau và đường dẫn bằng chứng. Không dùng HTTP 200 làm bằng chứng duy nhất cho việc coins và ledger đúng.

Chuẩn bị provider test có thể tạo chữ ký hợp lệ với key riêng, timeout và event mâu thuẫn. Database test được fixture tạo ngẫu nhiên; không dùng dữ liệu production. Với concurrent test cần nhiều connection hoặc process thật, cùng thời điểm áp transaction.
''')]
    for code,title,pre,steps,expected in TEST_DETAILS:
        blocks.append(md(f'''### {code} {title}

**Tiền điều kiện:** {pre}

**Thao tác:** {steps}

**Kết quả cần đạt:** {expected}

**Trạng thái:** Chưa thực hiện. Bằng chứng cần lưu: request hoặc job ID, order ID test, response đã che dữ liệu nhạy cảm và truy vấn DB trước sau nếu có thay đổi số dư.
'''))
    return blocks


QA_RULES = '''
## Tầng kiểm thử và thứ tự chạy

1. Unit adapter: canonicalization, ký, parse scalar, mapping trạng thái và thời gian.
2. Integration MySQL: idempotency, row lock, unique, rollback và migration.
3. Worker: lease, timeout, retry và phối hợp IPN bằng đồng hồ điều khiển được.
4. HTTP authorization: user scope, admin role, callback không session và middleware.
5. Browser/native: route, foreground, mất mạng và các trạng thái cấp xu.
6. Sandbox E2E: merchant thật của môi trường test, HTTPS IPN và API query.

## Fixture và script cần bổ sung

server/tests/fixture.ts hiện mount danh sách route cố định. Thêm payment/wallet routes, admin route tương ứng và cách inject provider test, đồng hồ, fault injection. Chặn live endpoint trong môi trường test. Không để env local khiến test gửi SMTP, dùng Redis namespace thật hoặc gọi merchant live.

Đề xuất file payments.test.ts, paymentMigration.test.ts và test worker riêng nếu dài. Thêm test:payments, test:payments:migration và test:payments:browser sau khi test đã tồn tại. Các script này là công việc cần làm, chưa có trong package hiện tại.

## Điều kiện chặn bật checkout

- Chống cấp trùng và rollback phải đạt với DB thật.
- Migration không reset xu và chạy lặp không nhân đôi.
- Phân quyền không lộ đơn của user khác.
- IPN và query cùng một service, qua signature và snapshot validation.
- Tắt feature vẫn xử lý pending cũ.
- Có bằng chứng một giao dịch sandbox đã cấp xu và một đơn thiếu IPN được query phục hồi.
- Web/native không suy thành công từ redirect hoặc browser close.

Nếu chưa có merchant hoặc chưa chạy native, ghi rõ hạng mục chưa nghiệm thu trong kết quả, không thay bằng PASS của mock. Bộ test có thể hoàn thành dần theo module; không đợi tới cuối mới viết các ca dữ liệu trọng yếu.
'''


def spec(number, slug, title, intro, blocks, sources=(), related=()):
    return dict(number=number,filename=f'{number:02d}_{slug}.docx',title=title,intro=intro,
                blocks=blocks,sources=sources,related=related)


def documents():
    return [
    spec(1,'Kien_truc_va_thu_tu_trien_khai',
         'Kế hoạch kiến trúc và thứ tự triển khai thanh toán MugenBunko',
         'Bắt đầu bằng schema và sổ giao dịch, sau đó xây service cấp xu chống xử lý lặp rồi mới nối cổng thanh toán và giao diện. Tài liệu này xác định thứ tự phụ thuộc để mỗi mốc có thể kiểm chứng được trong repository hiện tại.',
         [md(CATALOG),('source',1),('figure',('architecture','Hình 1 Ranh giới module thanh toán và nguồn dữ liệu')),
          md(ARCH_TASKS),('source',14),('source',17)],
         ('vnpay','momo','payos'),('02 Cơ sở dữ liệu','03 Backend API','09 Kiểm thử')),
    spec(2,'Co_so_du_lieu_va_migration',
         'Kế hoạch cơ sở dữ liệu và migration thanh toán MugenBunko',
         'Giữ users.coins để tương thích ứng dụng hiện tại và thêm ledger để giải thích mọi biến động. Migration phải giữ số dư cũ, tạo opening balance có thể chạy lại và chặn mọi writer chưa đi qua cơ chế mới.',
         [('source',7),('figure',('erd','Hình 1 Các quan hệ dữ liệu thanh toán đề xuất')),*db_dictionary(),
          ('subsource',(12,1)),md('## Công việc triển khai\n\n'+DB_TASKS)],
         (),('01 Kiến trúc','03 Backend API','09 Kiểm thử')),
    spec(3,'Backend_API_va_so_giao_dich',
         'Kế hoạch backend API và sổ giao dịch MugenBunko',
         'Xây một service duy nhất cho việc xác nhận và cấp xu. API người dùng chỉ tạo ý định mua hoặc đọc dữ liệu của chính mình; IPN và worker phải đi qua cùng transaction và ràng buộc dữ liệu.',
         [('source',8),('source',9),md(DTO),md('## Công việc triển khai\n\n'+BACKEND_TASKS)],
         (),('02 Cơ sở dữ liệu','04 VNPAY Sandbox','05 Worker đối soát','06 Web','07 Mobile')),
    spec(4,'Tich_hop_VNPAY_Sandbox',
         'Kế hoạch tích hợp VNPAY Sandbox cho MugenBunko',
         'Tách giao thức VNPAY khỏi nghiệp vụ số dư bằng adapter. Mốc hoàn thành là checkout sandbox tạo được đơn, IPN được xác minh và API query có thể cung cấp bằng chứng phục hồi qua cùng service cấp xu.',
         [('source',3),('source',5),('source',10),md('## Công việc triển khai\n\n'+VNPAY_TASKS)],
         ('vnpay','query','momo','payos'),('03 Backend API','05 Worker đối soát','08 Bảo mật và triển khai')),
    spec(5,'Worker_doi_soat_va_phuc_hoi',
         'Kế hoạch worker đối soát và phục hồi giao dịch MugenBunko',
         'Worker phục hồi kết quả khi thiếu callback hoặc xuất hiện mâu thuẫn. Claim bằng lease trong DB, gọi cổng ngoài transaction và áp dụng kết quả bằng service dùng chung để việc restart hay chạy nhiều replica không làm cấp xu trùng.',
         [('source',6),('subsource',(12,3)),md(RECON_RULES),md('## Công việc triển khai\n\n'+RECON_TASKS)],
         ('query',),('02 Cơ sở dữ liệu','03 Backend API','04 VNPAY Sandbox','09 Kiểm thử')),
    spec(6,'Frontend_web',
         'Kế hoạch triển khai ví và thanh toán trên web MugenBunko',
         'Bổ sung ví và trang kết quả vào hash navigation hiện có. Frontend giữ ý định mua để retry an toàn và chỉ báo đã nhận xu khi backend xác nhận fulfillmentStatus là credited.',
         [md(WEB_STATES),md('## Công việc triển khai\n\n'+WEB_TASKS),md('''## Hợp đồng tích hợp cần chốt trước khi code

BE03 phải thống nhất DTO và mã lỗi; VN03 phải thống nhất hash kết quả và cách xử lý order không hợp lệ. Các route đề xuất là #/wallet và #/payment/result/:orderId. Không thêm router hoặc global store mới chỉ để triển khai ví.

Giao diện quản trị cần list, summary và request reconcile; quyền thật do backend kiểm tra. Khi code, kiểm tra API_BASE và fetchWithAuth hiện có, giữ cookie/Bearer behavior để không tạo cơ chế auth khác.

## Kiểm tra và điều kiện hoàn thành

Chạy typecheck, build và lint theo script hiện có sau khi sửa. Browser test có fixture cho pending, credited, needs_review, cancelled, expired và network error. Kiểm tra redirect tới trước IPN; refresh/back/forward; token hết hạn; hai click cùng lúc; đóng trang và quay lại.

Điểm hoàn thành: toàn bộ luồng đọc từ API thật hoặc fixture được khai báo; không có số dư cộng trên client; không timer/request còn sống sau unmount; hồ sơ công khai không lộ lịch sử thanh toán. Kiểm tra render thực tế trong Washi, Sepia và Charcoal, cùng màn hình hẹp sau bypass mobile gate.
''')],(),('03 Backend API','04 VNPAY Sandbox','08 Bảo mật','09 Kiểm thử')),
    spec(7,'Mobile_Expo',
         'Kế hoạch triển khai thanh toán trên Expo mobile MugenBunko',
         'Dùng chung đơn và số dư từ backend, mở checkout sandbox trong browser và đọc lại khi ứng dụng trở lại foreground. Mục tiêu native được xác minh riêng cho deep link, cold start và hành vi đóng browser.',
         [md(MOBILE_RULES),md('## Công việc triển khai\n\n'+MOBILE_TASKS),md('''## API và trạng thái dùng chung

Dùng DTO từ tài liệu 03, bao gồm status và fulfillmentStatus. paid chưa đủ để hiện đã nhận xu. Hiển thị các nhánh pending, credited, needs_review, failed, cancelled, expired và lỗi mạng; mỗi nhánh có hành động tiếp theo rõ ràng.

Không lưu secret hoặc bằng chứng thanh toán trong AsyncStorage. Auth token tiếp tục dùng storage abstraction đã có; order ID không thay thế auth. Đơn được mở từ deep link vẫn phải đọc bằng phiên đăng nhập và bị scope ở backend.

## File và lệnh kiểm tra hiện có

Đọc mobile/app/_layout.tsx, mobile/app/(tabs)/profile.tsx, mobile/src/context/AuthContext.tsx, mobile/src/services/api/client.ts và mobile/app.json trước khi thay navigation. Tái sử dụng primitive trong Screen.tsx và palette hiện tại.

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile run export:web
npm --prefix mobile run export:android
```

Các lệnh export kiểm tra bundle, không chứng minh native return hoạt động. Điểm hoàn thành cần một lần E2E sandbox trên thiết bị/emulator và test foreground/cold start, kèm mô tả platform đã thử. iOS chưa thử phải được ghi là chưa xác minh.
''')],('apple','google'),('03 Backend API','04 VNPAY Sandbox','06 Web','09 Kiểm thử')),
    spec(8,'Bao_mat_cau_hinh_va_trien_khai',
         'Kế hoạch bảo mật cấu hình và triển khai thanh toán MugenBunko',
         'Rà quyền, cấu hình môi trường và đường callback từ đầu, sau đó triển khai theo thứ tự schema tới code tương thích rồi mới bật tạo đơn. Khi có sự cố, tắt checkout mới nhưng vẫn giữ đường hoàn tất giao dịch đã phát hành.',
         [('subsource',(12,2)),md('## Công việc triển khai\n\n'+SEC_TASKS),md(OPERATIONS),('subsource',(12,4))],
         ('vnpay','query'),('02 Migration','04 VNPAY Sandbox','05 Đối soát','09 Kiểm thử')),
    spec(9,'Kiem_thu_va_nghiem_thu_ky_thuat',
         'Kế hoạch kiểm thử và nghiệm thu kỹ thuật thanh toán MugenBunko',
         'Viết test dữ liệu trọng yếu cùng service trước khi nối UI. Bộ ca dưới đây là checklist thực thi, có tiền điều kiện và kết quả mong đợi; trạng thái ban đầu là chưa thực hiện, không phải báo cáo kết quả đã chạy.',
         [md(QA_RULES),*test_blocks(),md('''## Mẫu ghi kết quả sau khi chạy

| Trường | Nội dung cần ghi |
| --- | --- |
| Mã ca và commit | PAYxx và revision chính xác |
| Môi trường | Fixture sandbox hoặc native cùng phiên bản DB và cấu hình đã che secret |
| Thời gian và người chạy | Thời điểm thực thi và người thực hiện |
| Kết quả thực tế | Dữ liệu HTTP DB và UI đã quan sát |
| Trạng thái | PASS FAIL BLOCKED hoặc Chưa thực hiện |
| Bằng chứng | Log đã redact ảnh trạng thái và truy vấn kiểm tra |
| Lỗi liên quan | Issue và bước tái hiện nếu có |

## Thứ tự nghiệm thu theo module

DB01 đến DB03 đạt trước BE02. BE01 đến BE03 đạt với provider test trước VN02. VN02 và VN04 phải có bằng chứng sandbox trước khi RC02 được coi là phục hồi cổng thật. WEB và MOB chỉ báo hoàn thành khi dùng trạng thái backend và xử lý được kết quả chưa rõ.

Nghiệm thu cuối gồm số dư khớp ledger, một giao dịch sandbox cấp đúng xu, chống callback lặp qua hai API, query phục hồi khi thiếu IPN, migration chạy lặp và rollback không mất lịch sử. Chưa có bằng chứng ở bước nào thì giữ bước đó chưa hoàn thành.
''')],(),('02 đến 08 Các kế hoạch triển khai thành phần',)),
    ]
