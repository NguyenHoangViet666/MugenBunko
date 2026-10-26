# Chuẩn bị MugenBunko cho nhiều người truy cập

Thay đổi này giảm lượng dữ liệu và yêu cầu nền ở các luồng công khai. Các số đo bên dưới là kiểm thử trên loopback, không phải cam kết phục vụ 3.000 người thật.

## Những gì đã triển khai

- Web Home dùng /api/novels/home: các nhóm được chọn ở database, thống kê toàn kho, bản tóm tắt có tối đa hai chương đầu/cuối. Thông tin cá nhân được lấy riêng.
- Header lấy tối đa 20 tác phẩm theo tiến độ cục bộ và 30 tác phẩm cá nhân để giữ nút đọc tiếp trên mọi trang, kể cả mở thẳng Explore. Không tải toàn kho để dựng nút này.
- Explore dùng /api/novels/catalog: 12 tác phẩm/trang; tìm tên, tác giả, tag và lọc/sắp xếp trên toàn kho. Chỉ mở trang chi tiết/đọc mới tải đủ mục lục.
- Forum dùng 20 bài/trang, không tải toàn bộ bình luận trong bảng tin. Thống kê cộng đồng và bài viết trong hồ sơ có API riêng/phân trang.
- Tủ sách/Studio/hồ sơ chỉ lấy dữ liệu trong phạm vi tài khoản/tác giả; tìm để thêm vào bộ sưu tập dùng catalog. Các luồng này vẫn có thể tải nhiều trang trong phạm vi đó. API cũ được giữ cho mobile và quản trị.
- Chat đẩy tin nhắn sau khi transaction đã commit, dù gửi bằng HTTP hay socket. Cập nhật đọc/chưa đọc giữa các cửa sổ. Widget không hỏi mỗi 5 giây; khi mất socket chỉ đối soát mỗi 60–75 giây nếu trang đang hiển thị, và khi kết nối lại/quay lại trang.
- Đồng bộ vị trí đọc chống gửi trùng lúc đang có yêu cầu; chu kỳ 8–12 giây có độ lệch để tránh dồn nhịp. Lưu cục bộ và flush khi rời trang vẫn hoạt động.
- Bộ nhớ đệm công khai giới hạn 200 mục/8 MiB, tối đa 512 KiB mỗi mục, TTL thường 15 giây; gộp các cache miss cùng khóa. Thống kê 30 giây. Không lưu phiên đăng nhập hay bản thảo ở đây.
- Cache phép biến đổi HTML chương trong 60 giây; mỗi lần đọc vẫn kiểm tra quyền/trạng thái ở database. HTTP phản hồi cá nhân không được cache công khai.
- Ghi thành công nội dung liên quan làm mất hiệu lực cache. Các bộ đếm lượt đọc/thích/dấu trang cập nhật theo TTL. Nếu bật Redis, thông báo xóa cache truyền giữa các API.
- Bổ sung chỉ mục tag, bài diễn đàn theo chuyên mục/ngày, chương theo tác phẩm/trạng thái/thứ tự. Pool mặc định 10 kết nối, hàng đợi 100, truy vấn thông thường có timeout 15 giây.
- Home/Explore/chi tiết/reader được tách thành các gói mã theo trang. Asset Vite có tên chứa hash được cache một năm; HTML yêu cầu kiểm tra lại.
- Rate limit có lớp IP rộng và lớp tài khoản riêng. Redis dùng chung các bộ đếm khi chạy nhiều API. Các giới hạn OTP/khôi phục mật khẩu vẫn được giữ.

Giới hạn mặc định: API 30.000 yêu cầu/IP/15 phút, các luồng bắt buộc đăng nhập 1.200/tài khoản/15 phút, đăng nhập/đăng ký 3.000/IP/5 phút và 15/định danh/5 phút. Đây là giá trị khởi đầu cần điều chỉnh bằng số liệu thật; định danh đăng nhập được băm trước khi dùng làm khóa. Giới hạn ứng dụng vẫn cần đi cùng giới hạn lưu lượng tại proxy/CDN.

## Đo tại máy phát triển

Node v24.13.0, MySQL cục bộ, pool 10. Benchmark: 100 tác phẩm × 50 chương, 100 bài × 50 bình luận. Mỗi endpoint đo 20 yêu cầu, đồng thời 5, sau ba lần làm nóng cache. Kích thước là JSON chưa nén.

| Luồng | API cũ | API web mới | p95 API mới |
| --- | ---: | ---: | ---: |
| Danh mục | 843.283 byte/100 tác phẩm kèm mục lục | 11.111 byte/12 bản tóm tắt | 11 ms |
| Bảng tin | 1.251.074 byte/100 bài kèm bình luận | 8.681 byte/20 bài, không có nội dung bình luận | 40 ms |

Danh mục giảm khoảng 98,7% dữ liệu mỗi trang. Đây là so sánh hai cách tải dữ liệu khác nhau, không phải cùng một payload được tăng tốc. API cũ vẫn trả payload cũ. Phản hồi Home 10.978 byte trong bộ dữ liệu này do nhiều nhóm trùng nhau; kích thước thực tế tùy nội dung, có tối đa 76 ứng viên công khai trước khi hợp nhất.

Bài tải hỗn hợp riêng dùng 100 tác phẩm nhỏ, các lượt đọc chương, phân trang danh mục/diễn đàn và ghi tiến độ bằng tài khoản riêng. Mỗi mức chạy 10 giây, nghỉ 25–50 ms giữa yêu cầu:

| Luồng đồng thời | Yêu cầu | Yêu cầu/giây | p95 | p99 | Lỗi |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 1.964 | 195,4 | 30 ms | 51 ms | 0 |
| 50 | 5.650 | 559,9 | 157 ms | 212 ms | 0 |
| 100 | 5.999 | 591,0 | 498 ms | 585 ms | 0 |

Đây không phải 100 phiên đọc thật và không đo CPU/mạng máy chủ triển khai, CDN, TLS hay 3.000 socket. Kết quả chạy lại có thể khác. Báo cáo JSON sinh vào artifacts/performance/ (không đưa vào Git).

## Chạy kiểm thử

Cần MySQL và thông tin trong server/.env có quyền tạo/xóa database thử nghiệm. Fixture tạo database tên ngẫu nhiên mugenbunko_test_*, không dùng dữ liệu ứng dụng và không gửi email thật.

~~~powershell
npm run test:scalability
npm run test:scalability:browser
npm run benchmark:backend -- after-scale
npm run test:load:local
~~~

Browser smoke dùng Edge headless trên Windows; đặt UPGRADE_BROWSER_PATH nếu trình duyệt ở vị trí khác. Bộ smoke kiểm tra phân trang, lọc toàn kho, chi tiết, chat không polling, lưu bản nháp khi gửi lỗi, hồ sơ và bộ sưu tập. Có thể chỉnh LOAD_CONCURRENCY=10,50,100 và LOAD_SECONDS=10; runner local chỉ gọi HTTP server/database riêng của nó, giới hạn tối đa 200 luồng/60 giây mỗi mức.

## Chạy nhiều API

Một API hoạt động không cần Redis. Với nhiều API, dùng chung DB, JWT_SECRET, Redis, prefix và nơi lưu upload. API_REPLICAS > 1 sẽ từ chối khởi động nếu thiếu REDIS_URL. Prefix phải khác nhau giữa staging/production.

Redis dùng Socket.IO adapter, presence có hạn sử dụng, rate limit và invalidation. Việc thu hồi phiên truyền sang API khác. Redis bị gián đoạn làm socket tại API đó ngắt để xác thực lại; readiness báo lỗi, rate limit dùng Redis không tự chuyển sang bộ đếm riêng. Sau khi Redis vượt giới hạn thử nối lại, khởi động lại API sau khi hạ tầng đã phục hồi. Presence hết hạn sau khoảng 75 giây nếu máy chủ chết đột ngột.

Scheduler có khóa theo cửa sổ 30 giây trong Redis và chống chạy chồng tại một API. Tác vụ xuất bản vẫn phải giữ tính idempotent; cơ chế này không đảm bảo “exactly once”. Có thể đặt SCHEDULER_ENABLED=false ở các API không chạy tác vụ nền.

Cấu hình mẫu cho hai API cùng máy và một gateway:

1. Sao chép .env.production.example thành .env.production, điền bí mật/domain thật; REDIS_PASSWORD dùng chuỗi hex ngẫu nhiên 64 ký tự. Không đưa file này vào Git.
2. Docker Compose >= 2.24.4; chạy migration trước khi nâng API. Migration bổ sung các chỉ mục mới.
3. Cùng một compose project dùng chung volume uploads. Nếu API ở nhiều máy, dùng Cloudinary hoặc kho đối tượng chung; volume cục bộ không đồng bộ giữa các máy.

~~~sh
docker compose --env-file .env.production --profile tools run --rm migrate
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.scale.yml up -d --build
~~~

Gateway chỉ mở 127.0.0.1:8080, cần TLS proxy trên host chuyển tiếp tới đó. TLS proxy phải ghi đè X-Forwarded-Proto thành https và X-Forwarded-For thành IP khách, hỗ trợ WebSocket, timeout ít nhất 75 giây. TRUST_PROXY=2 trong mẫu tương ứng đúng hai proxy tin cậy; nếu thay topology phải sửa giá trị này.

Gateway dùng cookie để giữ HTTP polling của Socket.IO về cùng API, resolve lại địa chỉ replica, gzip JSON/JS/CSS và không thử gửi lại write sau lỗi kết nối không rõ kết quả. Redis adapter không tự giải quyết việc cần giữ phiên HTTP polling trên cùng API.

MySQL và Redis trong mẫu vẫn là điểm hỏng đơn. Máy chủ lớn hơn, HA, CDN, TLS, giám sát bên ngoài và dung lượng ổ đĩa cần cấu hình tại nơi triển khai. Tổng pool DB = số API × DB_POOL_SIZE; không tăng số API/pool vượt giới hạn DB.

## Kiểm thử Redis giữa hai tiến trình

Dùng Redis thử nghiệm, không dùng Redis production:

~~~powershell
$env:TEST_REDIS_URL='redis://127.0.0.1:6379'
npm run test:shared
~~~

Test tạo hai API ở hai tiến trình, cùng database fixture/prefix ngẫu nhiên; kiểm tra gửi tin HTTP sang socket API khác, presence, invalidation, rate limit dùng chung và logout ngắt socket ở máy khác. Không FLUSHDB; chỉ xóa khóa trong prefix riêng. Thiếu TEST_REDIS_URL thì test báo SKIP.

Trên máy hiện tại Docker engine/Redis chưa chạy: compose đã qua kiểm tra cấu hình, test Redis chưa được chạy thực tế. Cần chạy test này và smoke qua TLS/gateway trước khi chuyển production sang nhiều replica.

## Kiểm thử staging tới 3.000 phiên

Cài k6 riêng. Hai file tests/load/staging.k6.js và chat.k6.js có các mức 100 → 500 → 1.000 → 3.000, giữ tải rồi giảm. Chỉ chạy trên staging được phép thử tải.

~~~sh
k6 run -e BASE_URL=https://staging.example -e CONFIRM_STAGING=yes tests/load/staging.k6.js
k6 run -e BASE_URL=https://staging.example -e CONFIRM_STAGING=yes -e USERS_FILE=./users-staging.json tests/load/chat.k6.js
~~~

USERS_FILE là mảng JSON tài khoản thử nghiệm: [{"token":"JWT của tài khoản thử","friendId":123}]. Nên có một tài khoản/VU để tránh đo giới hạn dùng chung của một tài khoản. Cấp token còn hạn, dùng các cặp đã kết bạn. Các file users*.json trong tests/load được Git bỏ qua.

HTTP mặc định đo đọc công khai; có USERS_FILE thì thêm ghi tiến độ. NOVEL_ID/CHAPTER_ID cần trỏ tới chương xuất bản của staging. WebSocket chỉ giữ kết nối và nhận sự kiện; chỉ khi đặt SEND_MESSAGES=yes mới gửi một tin/30 giây tới friendId. Không dùng tài khoản người thật. Kịch bản WS này dùng WebSocket trực tiếp; smoke trình duyệt/gateway vẫn cần xác nhận HTTP polling và reconnect.

Ngưỡng HTTP: lỗi <1%, p95 <1 giây, p99 <2,5 giây; WS xác thực >99%. Đây là mục tiêu ban đầu, không phải SLA. Theo dõi CPU/RAM, event loop, DB wait, slow queries, Redis memory và mạng trong cả ramp/giữ tải. Chạy soak lâu hơn trên staging, thử cache lạnh, xuất bản khi có tải, Redis/API mất kết nối và phục hồi.

Một máy phát tải dùng chung một IP sẽ đụng giới hạn 30.000 yêu cầu/IP trước khi hoàn thành kịch bản lớn. Dùng nhiều IP nguồn thực hoặc tăng API_RATE_LIMIT riêng ở staging cho đủ khối lượng dự kiến, ghi lại cấu hình trong báo cáo. HTTP 429 vẫn được tính là lỗi; không giả mạo X-Forwarded-For để vượt giới hạn. ACCOUNT_RATE_LIMIT vẫn áp dụng cho các lần ghi tiến độ theo tài khoản.

## Quan sát và phục hồi

- /livez: tiến trình còn sống.
- /healthz: DB dùng được và kết nối Redis/pub-sub sẵn sàng nếu có cấu hình Redis. Dùng readiness ở từng API, không chỉ gateway.
- /metrics: tắt nếu thiếu METRICS_TOKEN; khi bật bắt buộc Authorization: Bearer <token>. Không mở scrape công khai không xác thực.
- Metrics gồm HTTP count/5xx/histogram thời gian, RAM/heap, event-loop p99, DB active/waiting/query/transaction/error và tổng thời gian. Nhãn route có giới hạn; không ghi SQL hoặc query string.
- LOG_LEVEL=warn giảm log thường; vẫn ghi JSON các lỗi 5xx và request >=1 giây, kèm X-Request-Id. LOG_LEVEL=info ghi mọi request.
- Scrape riêng từng API qua mạng nội bộ; cân bằng tải vào /metrics chỉ cho số liệu một replica tại một thời điểm. Có thể dùng Prometheus DNS discovery tên app, type A, port 5000 và bearer token từ secret file.

Sao lưu MySQL bằng snapshot nhất quán hoặc mysqldump --single-transaction; giữ cả upload/kho ảnh và cấu hình bí mật ở nơi bảo vệ riêng. Đặt lịch backup ở hạ tầng, mã hóa bản sao ngoài máy, theo dõi tuổi/lỗi backup. Thử restore vào database riêng và mở thử truyện, ảnh, tiến độ đọc trước khi tin vào backup. Repo chưa tự đặt lịch backup trên máy chủ thật.

## Tài liệu tham khảo

- [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/)
- [Nginx upstream và DNS resolve](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Docker Compose merge/reset](https://docs.docker.com/reference/compose-file/merge/)
- [k6 WebSocket API](https://grafana.com/docs/k6/latest/javascript-api/k6-ws/socket/)
