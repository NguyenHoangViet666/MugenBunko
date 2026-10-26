<p align="center">
  <img src="public/assets/default_novel_cover.png" alt="MugenBunko" width="160" />
</p>

<h1 align="center">📖 MugenBunko — 無限文庫</h1>

<p align="center">
  <b>Hệ thống đọc, xuất bản và mạng xã hội tiểu thuyết đa nền tảng</b><br>
  Đồ án chuyên ngành 4 — Trường Đại học Công nghệ Kỹ thuật Hưng Yên (HYUTE)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React 19.2" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-6%20Web%20%2F%205%20Server-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6 web / 5 server" />
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white" alt="Node.js 24" />
  <img src="https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white" alt="MySQL 8.x" />
</p>

**Phiên bản bàn giao Đồ án 4.** Repository gồm web React, ứng dụng Expo, API Express, kiểm thử và tài liệu phục vụ báo cáo, trình diễn và bảo vệ đồ án.

| Thông tin | Nội dung |
| --- | --- |
| Đề tài | Hệ thống đọc, xuất bản và mạng xã hội tiểu thuyết đa nền tảng MugenBunko |
| Học phần | Đồ án chuyên ngành 4 |
| Cơ sở đào tạo | Trường Đại học Công nghệ Kỹ thuật Hưng Yên (HYUTE) |
| Sinh viên | Nguyễn Hoàng Việt |
| Mã số sinh viên | 10123357 |
| Lớp | 12523W.1 |
| Giảng viên hướng dẫn | TS. Hoàng Quốc Việt |
| Mã nguồn | [NguyenHoangViet666/MugenBunko](https://github.com/NguyenHoangViet666/MugenBunko) |

## Mục lục

1. [Giới thiệu và tính năng](#1-giới-thiệu-và-tính-năng)
2. [Kiến trúc và công nghệ](#2-kiến-trúc-và-công-nghệ)
3. [Cài đặt và chạy local](#3-cài-đặt-và-chạy-local)
4. [Email OTP và mật khẩu](#4-email-otp-và-mật-khẩu)
5. [Quy định cộng đồng và bầu chọn mod](#5-quy-định-cộng-đồng-và-bầu-chọn-mod)
6. [Dữ liệu và bảo mật](#6-dữ-liệu-và-bảo-mật)
7. [Kiểm thử và build](#7-kiểm-thử-và-build)
8. [Triển khai production bằng Docker](#8-triển-khai-production-bằng-docker)
9. [Cấu trúc repository và tài liệu](#9-cấu-trúc-repository-và-tài-liệu)
10. [Xử lý lỗi thường gặp và phạm vi hiện tại](#10-xử-lý-lỗi-thường-gặp-và-phạm-vi-hiện-tại)

## 1. Giới thiệu và tính năng

**MugenBunko (無限文庫 — Vô Hạn Văn Khố)** là nền tảng đọc và xuất bản Light Novel/Web Novel, kết hợp thư viện cá nhân, công cụ sáng tác và cộng đồng. Web và mobile dùng chung API, tài khoản và dữ liệu. Phân quyền gồm `reader`, `author`, `moderator` và `admin`; một tài khoản có thể có nhiều vai trò.

### Tài khoản và độc giả

- Đăng ký bằng email và OTP; đăng nhập bằng tên tài khoản hoặc email. Web có trang đăng nhập, đăng ký và quên mật khẩu riêng, giữ trang đích sau khi xác thực.
- Khôi phục mật khẩu bằng OTP email; đổi mật khẩu chủ động trong hồ sơ. Đổi thành công yêu cầu đăng nhập lại trên các thiết bị.
- Khám phá, tìm kiếm và lọc truyện; xem chi tiết, thể loại, thẻ, mục lục theo tập và đánh giá.
- Reader tùy chỉnh nền, font, cỡ chữ và giãn dòng; chuyển chương, lưu vị trí theo đoạn và đồng bộ tiến độ theo tài khoản. Vị trí chưa gửi được sẽ thử đồng bộ khi có mạng.
- Tủ sách, lịch sử đọc, bookmark và bộ sưu tập công khai/riêng tư có liên kết chia sẻ. Trang chủ có lối tiếp tục tác phẩm đang đọc.
- Bình luận, trả lời, báo cáo và đánh giá sao. Điều kiện hoàn thành chương để đánh giá được kiểm tra ở server.
- Web có ba theme Washi, Sepia, Charcoal và bố cục cho điện thoại, máy tính bảng, desktop; hiệu ứng trang chủ/giới thiệu hỗ trợ tùy chọn giảm chuyển động của thiết bị.

### Author Studio

- Đăng ký quyền tác giả và chờ admin phê duyệt; tạo, sửa và quản lý tác phẩm theo tập/chương.
- Soạn thảo, xem trước, chế độ tập trung, thống kê số từ và xuất bản dự phòng TXT/MD trên web.
- Lưu nháp, gửi duyệt, hẹn giờ phát hành; rút chương về nháp sẽ hủy lịch đăng.
- Bản đang soạn được lưu cục bộ theo tài khoản/chương; web tự lưu nháp mỗi 30 giây và hỗ trợ Ctrl+S/⌘S. Nội dung sửa chương đã đăng được giữ trên máy đến khi chủ động cập nhật.
- Kiểm tra phiên bản để tránh ghi đè cập nhật đồng thời; xem và khôi phục tối đa 50 phiên bản nội dung gần nhất. Khôi phục tạo bản nháp và giữ nội dung hiện tại trong lịch sử.
- Tìm/lọc chương, đổi tên tập, chuyển chương giữa các tập và sắp xếp mục lục; thứ tự được áp dụng cả ở Reader.

### Cộng đồng, kiểm duyệt và quản trị

- Diễn đàn có chủ đề, ảnh, lượt thích và bình luận; hồ sơ, theo dõi tác giả, kết bạn, chat 1–1, trạng thái online và thông báo qua Socket.IO.
- Cấp độ, XP, điểm tích lũy, sự kiện và thông báo tác giả.
- Mod duyệt/trả chương về nháp, ẩn nội dung đã đăng và xử lý báo cáo bình luận. API kiểm tra quyền cho từng thao tác; khóa/mở tài khoản thuộc quyền admin.
- Admin quản lý tài khoản, vai trò, yêu cầu tác giả, tác phẩm, thể loại, gộp thẻ, sự kiện và quy định cộng đồng. Dashboard có tìm kiếm, lọc và phân trang.
- Bộ quy định mặc định gồm **25 điều**; trang đọc có mục lục, tìm kiếm không dấu và liên kết đến từng điều. Admin soạn nháp, xem trước và chủ động công bố.
- Bầu chọn mod gồm ứng cử/đề cử có đồng ý, kiểm tra hồ sơ, phiếu cộng đồng, đánh giá hội đồng, chốt kết quả, khiếu nại và bổ nhiệm theo nhiệm kỳ.

Ứng dụng mobile có Reader, tủ sách, bộ sưu tập, cộng đồng, Studio và các màn hình quản lý theo vai trò. Chi tiết cách chạy và phạm vi từng luồng ở [mobile/README.md](mobile/README.md). Các biểu mẫu quên/đổi mật khẩu mới được triển khai trên web; mobile dùng chung backend xác thực.

## 2. Kiến trúc và công nghệ

```text
React Web (Vite) ──┐
                  ├── HTTP REST / Socket.IO ── Express API ── MySQL
Expo Mobile ──────┘                                ├── SMTP / Nodemailer
                                                  └── Cloudinary hoặc uploads
```

Backend là một ứng dụng Express chia theo module nghiệp vụ. Khi build triển khai, Express phục vụ cả web tĩnh và API; môi trường development chạy Vite và backend riêng.

| Thành phần | Công nghệ trong repository |
| --- | --- |
| Web | React 19.2, Vite 8, TypeScript 6, CSS thuần |
| Mobile | Expo SDK 57, React Native 0.86, Expo Router, TypeScript 6 |
| Backend | Node.js 24, Express 4, TypeScript 5, `tsx` |
| Cơ sở dữ liệu | MySQL 8.x, `mysql2/promise`, connection pool; Compose dùng MySQL 8.4 |
| Xác thực | JWT, bcrypt, cookie HttpOnly trên web; SecureStore trên native |
| Thời gian thực | Socket.IO 4.8 |
| Email và ảnh | Nodemailer qua SMTP; Cloudinary hoặc thư mục upload cục bộ |
| Đóng gói và kiểm thử | Docker Compose, Node test runner, kiểm thử trình duyệt qua Chromium/Edge headless |

Web điều hướng bằng URL hash trong `src/App.tsx` (ví dụ `#/login`), còn mobile dùng Expo Router. Phiên bản dependency cụ thể được khóa trong ba file `package-lock.json`.

## 3. Cài đặt và chạy local

### Yêu cầu

- Node.js **24.x**, npm và MySQL **8.0 trở lên** đang chạy.
- Tài khoản MySQL development có quyền tạo database/bảng và cập nhật schema. Các bộ kiểm thử API cần thêm quyền tạo/xóa database thử nghiệm.
- Mobile: thiết bị hoặc emulator phù hợp; build native Android cần Android SDK, build iOS cần macOS/Xcode. Expo Go chỉ dùng khi tương thích SDK và các module của dự án.

### Cài web và backend

Các lệnh bên dưới dùng PowerShell, chạy từ một bản clone mới:

```powershell
git clone https://github.com/NguyenHoangViet666/MugenBunko.git
cd MugenBunko
npm ci
npm --prefix server ci
Copy-Item server/.env.example server/.env
```

Điền kết nối MySQL, `JWT_SECRET` và SMTP trong `server/.env`. Backend luôn đọc file này kể cả khi chạy lệnh từ thư mục gốc. Có thể sinh JWT secret riêng bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

| Biến | Cách dùng local |
| --- | --- |
| `PORT` | Cổng backend, mặc định `5000` |
| `NODE_ENV` | `development` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kết nối MySQL của máy chạy backend |
| `DB_POOL_SIZE`, `DB_QUEUE_LIMIT` | Giới hạn pool và hàng đợi; mặc định `10` và `100` |
| `JWT_SECRET` | Chuỗi ngẫu nhiên riêng, giữ ổn định giữa các lần khởi động |
| `FRONTEND_URL` | Origin web, mặc định mẫu là `http://localhost:5173` |
| `PUBLIC_URL` | URL backend dùng tạo liên kết ảnh, ví dụ `http://localhost:5000` |
| `SMTP_*`, `DEV_OTP` | Cấu hình email ở mục 4 |
| `CLOUDINARY_*` | Cấu hình Cloudinary nếu dùng; khi chưa cấu hình, ảnh được lưu cục bộ |

```powershell
npm run dev
```

- Web: `http://localhost:5173`.
- API: `http://localhost:5000/api`.
- Kiểm tra kết nối backend/database: `http://localhost:5000/healthz`.

Backend development tự tạo database/schema còn thiếu và chạy các migration bổ sung. **Không cần import `server/schema.sql` để khởi động một database mới.** File SQL có phần seed/reset dành cho development/test; import toàn bộ có thể xóa dữ liệu hiện có. Khởi tạo tự động không tạo tài khoản admin hay dữ liệu truyện mẫu.

Web mặc định gọi `http://localhost:5000/api` khi development và `/api` khi build. Nếu đổi API, đặt `VITE_API_BASE` trong `.env` ở thư mục gốc rồi khởi động lại Vite/build lại web. Chỉ đưa cấu hình công khai vào biến `VITE_*`.

### Tạo admin đầu tiên

Sau khi cấu hình MySQL, chạy trong terminal PowerShell tại thư mục gốc:

```powershell
npm --prefix server run build
$env:ADMIN_USERNAME = Read-Host 'Tên đăng nhập admin'
$adminPassword = Read-Host 'Mật khẩu admin: ít nhất 16 ký tự, tối đa 72 byte' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
npm --prefix server run create:admin
Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_USERNAME
$adminPassword.Dispose()
```

Lệnh tạo tài khoản mới với quyền `reader` và `admin`; không ghi đè hoặc nâng quyền tài khoản đã tồn tại. **Bản khởi tạo hiện tại không có tài khoản/mật khẩu admin mặc định.** Tài khoản chưa gắn email có thể đổi mật khẩu bằng mật khẩu hiện tại; khôi phục qua email cần email đã gắn với tài khoản.

### Chạy mobile

```powershell
npm --prefix mobile ci
Copy-Item mobile/.env.example mobile/.env
npm run dev:mobile
```

Điền `EXPO_PUBLIC_API_URL` bằng URL backend mà điện thoại truy cập được, ví dụ `http://192.168.1.10:5000`; `EXPO_PUBLIC_WEB_URL` là URL web để chia sẻ liên kết. Dùng cùng mạng khi chạy qua LAN và cấu hình `PUBLIC_URL` để ảnh cũng truy cập được từ điện thoại. Thay đổi `.env` cần khởi động lại Metro; hướng dẫn xóa cache và build native ở [tài liệu mobile](mobile/README.md).

`npm run dev:mobile` chỉ chạy Expo; giữ backend chạy ở terminal khác hoặc dùng `npm run dev:all` để chạy web, backend và Expo cùng lúc. Không đặt secret vào biến `EXPO_PUBLIC_*` vì chúng được đóng vào bundle.

## 4. Email OTP và mật khẩu

### Gửi email thật

Điền trong `server/.env` với tài khoản SMTP của môi trường chạy:

```env
DEV_OTP=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Tên biến được sử dụng là `SMTP_USER`/`SMTP_PASS`; `EMAIL_USER`/`EMAIL_PASS` cũ không có tác dụng. Gmail dùng App Password theo [hướng dẫn Google](https://support.google.com/accounts/answer/185833) của tài khoản đã bật xác minh hai bước. Cổng `587` dùng STARTTLS (`SMTP_SECURE=false`); cổng `465` dùng TLS ngay khi kết nối (`SMTP_SECURE=true`). Sau khi đổi cấu hình, khởi động lại backend.

```powershell
npm run check:smtp
```

Lệnh kiểm tra kết nối và xác thực SMTP, **không gửi email**. Kết quả thành công chưa bảo đảm thư vào hộp thư đến; kiểm tra cả thư mục spam khi thử luồng đăng ký/khôi phục.

Nếu thử local khi chưa có SMTP, chủ động đặt `DEV_OTP=true`: web hiển thị mã thử nghiệm và nói rõ chưa gửi thư. Khi có SMTP, OTP không được trả về JSON. Production luôn tắt cơ chế trả mã thử nghiệm, kể cả khi cờ này được đặt thành `true`.

Mẫu thư tại [server/emails/registrationOtp.ts](server/emails/registrationOtp.ts) gồm email xác thực, mã khôi phục và thông báo đổi mật khẩu, với HTML mang thương hiệu MugenBunko và bản text dự phòng. Có thể sửa bố cục/nội dung và tên hiển thị người gửi; địa chỉ gửi phụ thuộc tài khoản SMTP. Thư không tải ảnh/font ngoài, không chèn OTP vào tiêu đề và không gửi mật khẩu. Mẫu mới áp dụng cho email gửi sau khi cập nhật.

### Luồng tài khoản trên web

| Chức năng | Vị trí / API |
| --- | --- |
| Đăng nhập | `#/login` → `POST /api/auth/login` |
| Đăng ký | `#/register` → `POST /api/auth/send-otp`, `POST /api/auth/register` |
| Quên mật khẩu | `#/forgot-password` → `POST /api/auth/forgot-password` |
| Đặt lại mật khẩu | Nhập email, OTP và mật khẩu mới → `POST /api/auth/reset-password` |
| Đổi mật khẩu chủ động | Hồ sơ → Thông tin cơ bản → Mật khẩu & bảo mật → `POST /api/auth/change-password` |

OTP gồm **6 chữ số**, có hiệu lực **5 phút**, chờ **60 giây** trước khi gửi lại và tối đa **5 lần thử sai** cho mỗi mã. Mã đăng ký và khôi phục có mục đích riêng, không dùng thay nhau. Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa ASCII, chữ số và ký tự đặc biệt, tối đa 72 byte UTF-8; không được trùng mật khẩu hiện tại khi đổi/đặt lại.

Yêu cầu quên mật khẩu trả thông báo chung cho email tồn tại, không tồn tại, bị khóa hoặc đang chờ gửi lại. SMTP xử lý ở nền; thông báo tiếp nhận không xác nhận email đã được gửi. API đặt lại dùng `{ email, otp, newPassword }`; API đổi chủ động cần phiên đăng nhập và `{ currentPassword, newPassword }`.

Cập nhật mật khẩu và tiêu thụ OTP khôi phục diễn ra trong transaction. Đổi/đặt lại thành công tăng `users.auth_version`, vô hiệu các phiên cũ, xóa mã khôi phục còn chờ và ngắt socket của tài khoản trên tiến trình xử lý. Người dùng đăng nhập lại bằng mật khẩu mới; tài khoản có email được gửi thông báo thay đổi.

## 5. Quy định cộng đồng và bầu chọn mod

Trang `#/rules` hiển thị bộ quy định; liên kết từng điều dùng `#/rules?section=<id>`. Admin quản lý ở `#/manage-rules`, có bản nháp cục bộ theo tài khoản, xem trước và nút **Công bố**. Khi lưu gặp cập nhật đồng thời, API trả `409` cùng bản mới để xử lý xung đột. Bản nháp trên trình duyệt chưa đồng bộ giữa các thiết bị.

Bộ mặc định tại [server/communityRules.ts](server/communityRules.ts) gồm **25 điều**, bổ sung 20 điều so với bộ 5 điều ban đầu: tài khoản, quyền tác giả, AI, đăng lại, phân loại nội dung, ứng xử, quyền riêng tư, đánh giá, spoiler, spam, tin nhắn, bầu chọn, báo cáo, chế tài và khiếu nại. Quy định hướng dẫn thành viên và người quản lý; các thời hạn xử lý/chế tài cần người quản lý thực hiện.

Migration chỉ nâng cấp khi toàn bộ 5 điều hiện có khớp chính xác bản mặc định cũ, giữ ID để bảo toàn liên kết. Tài liệu đã được admin sửa/thêm/xóa hoặc cố ý để trống được giữ nguyên; chạy lại không nhân bản nội dung. Bảng mới được khởi tạo bộ 25 điều.

Bầu chọn mod mở tại `#/elections`, tab **Bầu chọn mod** trong Admin và **Hội đồng bầu chọn** trong Mod. Hai luồng phiếu cộng đồng/hội đồng được chốt riêng; admin quyết định bổ nhiệm, có giải trình, khiếu nại và nhật ký. Quyền mod gắn với nhiệm kỳ được kiểm tra ở backend.

## 6. Dữ liệu và bảo mật

Schema hiện tại được ghép từ [server/schema.sql](server/schema.sql), [server/db.ts](server/db.ts), [server/readerSchema.ts](server/readerSchema.ts) và [server/electionSchema.ts](server/electionSchema.ts), cùng các migration OTP/quy định. File SQL ban đầu không đại diện đầy đủ cho các bảng và cột bổ sung.

| Nhóm dữ liệu | Bảng tiêu biểu |
| --- | --- |
| Tài khoản và phiên | `users`, `user_roles`, `email_otps`, `revoked_tokens` |
| Tác phẩm | `novels`, `novel_tags`, `chapters`, `chapter_versions`, `genres` |
| Đọc và tủ sách | `reading_progress`, `chapter_reads`, `reading_sessions`, `bookmarks`, `library_collections`, `collection_novels`, `read_cooldowns` |
| Cộng đồng | `comments`, `reviews`, `reports`, `forum_posts`, `forum_comments`, `forum_post_likes`, `friends`, `messages`, `follows` |
| Điều hành | `rules`, `events`, `announcements`, `notifications`, `deleted_novels` |
| Bầu chọn | `elections`, `election_candidates`, `election_voters`, `election_ballots`, `election_reviews`, `election_complaints`, `election_audit` |

- Mật khẩu được băm bcrypt với cost 12 cho đăng ký/đổi/khôi phục; OTP lưu HMAC-SHA-256 theo email/mục đích, không lưu mã thuần.
- Web dùng cookie `HttpOnly`, `SameSite=Strict`, thêm `Secure` trong production; native lưu token bằng SecureStore. Token cũ được chuyển khỏi localStorage/AsyncStorage theo luồng nâng cấp phiên.
- Đăng xuất thu hồi token trên server và đóng socket cùng phiên; thao tác cần mạng. Token thu hồi lưu hash trong `revoked_tokens`; phiên có `auth_version` cũ bị từ chối sau khi đổi mật khẩu.
- Backend kiểm tra tài khoản, trạng thái và quyền hiện hành từ database; kiểm tra origin cho thao tác dùng cookie, CORS allowlist, Helmet/CSP, giới hạn payload và tốc độ request.
- Nội dung HTML được làm sạch; upload tối đa 5 MB, kiểm tra MIME/signature và dùng tên UUID. Ảnh lưu ở Cloudinary khi có đủ cấu hình, hoặc thư mục upload của backend.
- Tiến độ đọc gắn theo tài khoản; điều kiện hoàn thành chương và cộng XP được server kiểm tra. Feed công khai lọc nội dung chưa xuất bản/bị khóa theo quyền.

Development áp dụng migration khi khởi động. **Production phải chạy migration trước khi chạy bản server mới**: gồm `users.auth_version`, khóa OTP `(email, purpose)`, phiên thu hồi, thứ tự chương, tiến độ, bộ sưu tập, lịch sử bản thảo và bầu chọn. Bảng OTP thuần kiểu cũ được nâng cấp và mã cũ vô hiệu; mã đăng ký đã ở định dạng hash hợp lệ được giữ khi bổ sung `purpose`.

## 7. Kiểm thử và build

Chạy tại thư mục gốc sau khi cài dependency tương ứng:

```powershell
npm run typecheck
npm run lint
npm run build
npm --prefix server run build
npm --prefix mobile run typecheck
```

Build Vite không thay thế kiểm tra TypeScript. Các bộ kiểm thử có sẵn:

| Phạm vi | Lệnh |
| --- | --- |
| Điều hướng xác thực | `npm run test:auth` |
| API mật khẩu/thu hồi phiên | `npm run test:passwords` |
| Bảo mật, OTP, email, mật khẩu | `npm --prefix server run test:security` |
| Đăng nhập/đăng ký/khôi phục/đổi mật khẩu trên web | `npm run test:auth:browser` |
| Reader và tủ sách | `npm run test:upgrades`, `npm run test:upgrades:browser` |
| Studio | `npm run test:studio`, `npm run test:studio:browser` |
| Quy định cộng đồng | `npm run test:rules`, `npm run test:rules:browser` |
| Header, trang chủ, giới thiệu | `npm run test:header:browser`, `npm run test:hero:browser`, `npm run test:about:browser` |
| Bầu chọn | `npm run test:elections`, `npm run test:elections:browser`, `npm run test:elections:mobile` |
| Mobile API/giao diện | `npm run test:mobile`, `npm run test:mobile:browser` |

Kiểm thử integration/browser đọc cấu hình kết nối MySQL từ `server/.env`, dùng database tạm `mugenbunko_test_*` và tự dọn sau khi chạy; SMTP được tắt trong fixture, không gửi email thật. Tài khoản DB test cần quyền tạo/xóa database. Trình duyệt mặc định là Edge headless trên Windows; đặt `UPGRADE_BROWSER_PATH` để dùng executable Chromium khác. Ảnh kiểm tra được lưu dưới `artifacts/` và các thư mục ảnh sinh tự động đã được Git bỏ qua.

Mobile có các lệnh đóng gói riêng: `npm --prefix mobile run export:web`, `export:android`, `export:ios`. Kết quả là bundle JavaScript; APK/IPA ký phát hành cần quy trình build native. Kiểm thử trình duyệt không thay thế kiểm tra Android/iOS thật.

Kiểm tra dependency riêng cho từng phần: `npm audit`, `npm --prefix server audit`, `npm --prefix mobile audit`. Xem kết quả tại thời điểm bàn giao/triển khai; không dùng `audit fix --force` để ép đổi Expo sang phiên bản không tương thích. Mobile có script `postinstall` vá bộ giải mã query; nếu cài bằng `--ignore-scripts`, chạy `npm --prefix mobile run postinstall` trước khi build/test.

## 8. Triển khai production bằng Docker

Compose chạy **MySQL 8.4**, web/API chung container và một service migration trong profile `tools`. MySQL chỉ nối mạng nội bộ, không mở cổng host. Cổng app mặc định bind `127.0.0.1:5000` để đặt sau reverse proxy HTTPS; image chạy bằng user `node` và không đóng gói `.env`.

### Cấu hình

```powershell
Copy-Item .env.production.example .env.production
```

Điền `DB_ADMIN_PASSWORD`, `DB_PASSWORD` và `JWT_SECRET` bằng ba secret riêng; `DB_APP_USER` mặc định là `mugen_app`. Đặt `FRONTEND_URL` thành origin HTTPS của web (nhiều origin cách nhau bằng dấu phẩy), `PUBLIC_URL` là URL HTTPS công khai của backend, `TRUST_PROXY` đúng theo reverse proxy và điền SMTP để đăng ký/khôi phục nhận thư.

Cookie production yêu cầu web/API cùng site. Backend từ chối JWT secret thiếu/ngắn/mặc định và không cho ứng dụng chạy production bằng DB user `root`.

### Database mới

```powershell
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production --profile tools run --rm --build migrate
docker compose --env-file .env.production up -d --build app
```

Migration chạy bằng tài khoản quản trị DB, tạo/nâng schema, sau đó thu hẹp quyền ứng dụng về `SELECT/INSERT/UPDATE/DELETE`. Không chạy phần seed/TRUNCATE và không tạo admin mặc định. Production khởi động chỉ kiểm tra schema, không tự sửa bảng.

Tạo admin bằng cách nhập `ADMIN_USERNAME` và `ADMIN_PASSWORD` vào môi trường shell quản trị như bước tạo admin local, rồi chạy:

```powershell
docker compose --env-file .env.production exec -e ADMIN_USERNAME -e ADMIN_PASSWORD app node server/dist/createAdmin.js
```

Xóa các biến mật khẩu khỏi shell sau khi chạy. Chỉ reverse proxy nên truy cập cổng app; kiểm tra `/healthz` qua địa chỉ triển khai sau khi khởi động.

### Nâng cấp database đang có dữ liệu

Backup và thử migration trên bản sao trước, gồm cả nâng MySQL 8.0 lên 8.4 nếu cần. `DB_ADMIN_PASSWORD` phải khớp mật khẩu hiện tại; đổi `.env.production` không tự đổi mật khẩu hoặc tạo user trong volume cũ. Tạo `DB_APP_USER` với đúng mật khẩu trước khi chạy migration nếu database chưa có tài khoản này.

Nếu chuyển từ cách chạy dùng thư mục `server/uploads`, sao chép ảnh vào volume `uploads_data` trước khi chuyển traffic. Backup cả database và ảnh; Cloudinary cần quản lý media tại dịch vụ tương ứng. Khi đổi JWT secret, phiên đăng nhập và OTP đang chờ sẽ hết hiệu lực. Không import toàn bộ `server/schema.sql` lên database đang sử dụng.

## 9. Cấu trúc repository và tài liệu

```text
MugenBunko/
├── src/                      # React web, điều hướng hash trong App.tsx
│   ├── components/           # Biểu mẫu, reader/editor, thành phần dùng chung
│   ├── pages/                # Home, Reader, Studio, cộng đồng, quản trị
│   ├── hooks/                # Đồng bộ, bản nháp, chuyển động, quy định
│   ├── styles/               # CSS theo chức năng; design system ở index.css
│   └── utils/                # Tiến độ, xác thực, mật khẩu và tiện ích
├── server/                   # Express API và Socket.IO
│   ├── routes/               # auth, passwords, reader, library, elections...
│   ├── middleware/           # Xác thực, phân quyền, bảo mật, log
│   ├── emails/               # HTML/text email OTP và bảo mật tài khoản
│   ├── utils/                # OTP, SMTP, session, upload, mật khẩu
│   ├── tests/                # API integration, migration và fixture
│   ├── db.ts                 # Khởi tạo kết nối và điều phối migration
│   ├── migrateProduction.ts  # Migration tách khỏi startup production
│   └── .env.example          # Mẫu cấu hình local, không chứa secret thật
├── mobile/                   # Expo / React Native; có README riêng
├── shared/                   # Hợp đồng/nhãn bầu chọn dùng chung
├── tests/                    # Unit và kiểm thử trình duyệt
├── docs/                     # Hướng dẫn vận hành và kế hoạch cộng đồng
├── artifacts/                # ERD, báo cáo kiểm thử, script dựng tài liệu
├── public/                   # Tài nguyên tĩnh
├── Dockerfile
├── docker-compose.yml
└── .env.production.example   # Mẫu cấu hình triển khai
```

| Tài liệu | Đường dẫn |
| --- | --- |
| Cài đặt và kiểm thử mobile | [mobile/README.md](mobile/README.md) |
| Thiết kế cơ sở dữ liệu | [Word](artifacts/database-design/Muc_3_6_Thiet_ke_co_so_du_lieu_MugenBunko.docx), [ERD](artifacts/database-design/ERD_MugenBunko_word.png) |
| Báo cáo test case và kết quả | [Word](artifacts/test-report/MugenBunko_TestCase_KetQua_NguyenHoangViet.docx) |

Các tài liệu báo cáo phản ánh thời điểm xuất bản; lệnh chạy và cấu hình hiện tại được mô tả trong README này. `.env`, secret SMTP/JWT, ảnh test và file tạm không được đưa vào Git.

## 10. Xử lý lỗi thường gặp và phạm vi hiện tại

| Hiện tượng | Kiểm tra |
| --- | --- |
| Backend không khởi động/kết nối database | MySQL đang chạy, thông tin `DB_*`, quyền tạo schema ở local; production đã chạy migration và dùng DB user riêng |
| Web không tải dữ liệu | Backend `/healthz`, `VITE_API_BASE`, cổng đang dùng và `FRONTEND_URL`; khởi động lại Vite khi đổi `.env` |
| Không gửi được OTP | Điền đủ `SMTP_USER`/`SMTP_PASS`, đúng cổng/TLS, khởi động lại backend rồi chạy `npm run check:smtp`; Gmail cần App Password |
| Báo đã tiếp nhận khôi phục nhưng chưa có thư | Kiểm tra email gắn tài khoản đang hoạt động, thư mục spam và log SMTP; phản hồi chung không xác nhận tài khoản tồn tại |
| Mã không hợp lệ | Dùng mã mới nhất đúng luồng đăng ký/khôi phục; mã hết hạn sau 5 phút hoặc bị khóa sau 5 lần sai |
| Đổi mật khẩu xong bị đăng xuất | Hành vi dự kiến: đăng nhập lại bằng mật khẩu mới |
| Điện thoại không gọi API/tải ảnh | URL LAN thay cho `localhost`, khả năng truy cập mạng, `PUBLIC_URL`, biến `EXPO_PUBLIC_*` và cache Metro |
| Test API báo thiếu quyền DB | Dùng tài khoản development có quyền tạo/xóa database tạm; không dùng DB user production chỉ có quyền đọc/ghi |

Phạm vi vận hành hiện tại là **một instance backend**. Presence và rate limiter HTTP nằm trong bộ nhớ; triển khai nhiều instance cần shared store/Socket.IO adapter. Một số màn hình còn ghép dữ liệu từ nhiều trang API để lọc toàn bộ; cần tối ưu truy vấn và kiểm thử tải trước khi mở rộng dữ liệu/người dùng.

Lựa chọn banner trong Admin là cấu hình trên trình duyệt hiện tại. Bản nháp cục bộ chưa đồng bộ giữa các thiết bị. Mobile cần kiểm tra thiết bị thật và build native trước khi phát hành; API production của mobile yêu cầu HTTPS. Kết quả audit dependency và cấu hình hạ tầng cần được kiểm tra tại mỗi lần triển khai; không công khai Metro/dev server.

<p align="center">
  <i>Không gian dành cho những câu chuyện chưa có hồi kết.</i><br>
  © 2026 MugenBunko
</p>
