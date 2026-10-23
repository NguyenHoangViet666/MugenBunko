<p align="center">
  <img src="public/assets/default_novel_cover.png" alt="MugenBunko Logo" width="160" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</p>

<h1 align="center">📖 MUGENBUNKO (無限文庫)</h1>

<p align="center">
  <b>HỆ THỐNG ĐỌC, XUẤT BẢN VÀ MẠNG XÃ HỘI TIỂU THUYẾT ĐA NỀN TẢNG</b><br>
  <i>Đề tài Đồ án Chuyên ngành 4 (Đồ án 4) - Ngành Công nghệ Thông tin / Kỹ thuật Phần mềm</i><br>
  <b>Trường Đại học Công nghệ Kỹ thuật Hưng Yên (HYUTE - Hung Yen University of Technology and Engineering)</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React_Native-Expo_57-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 🎓 Thông Tin Đề Tài & Sinh Viên Thực Hiện

| Hạng mục | Chi tiết |
| :--- | :--- |
| **Đề tài** | **Hệ thống đọc, xuất bản và mạng xã hội tiểu thuyết đa nền tảng MugenBunko** |
| **Học phần** | **Đồ án chuyên ngành 4 (Đồ án 4)** |
| **Cơ sở đào tạo** | **Trường Đại học Công nghệ Kỹ thuật Hưng Yên (HYUTE - Hung Yen University of Technology and Engineering)** |
| **Sinh viên thực hiện** | **Nguyễn Hoàng Việt** |
| **Mã số sinh viên (MSV)** | **10123357** |
| **Lớp chuyên ngành** | **12523W.1** |
| **Giảng viên hướng dẫn (GVHD)** | **TS. Hoàng Quốc Việt** |
| **Mã nguồn dự án** | [NguyenHoangViet666/MugenBunko](https://github.com/NguyenHoangViet666/MugenBunko.git) |

> 🔑 **Tài khoản Quản trị viên mặc định (Seed Data):**
> - **Username:** `MugenBunko`
> - **Password:** `123456`
> - **Quyền hạn:** `admin`, `reader`

---

## 📌 Mục Lục

1. [Giới Thiệu Đề Tài](#1-giới-thiệu-đề-tài)
2. [Mục Tiêu & Ý Nghĩa Thực Tiễn](#2-mục-tiêu--ý-nghĩa-thực-tiễn)
3. [Kiến Trúc Tổng Thể Hệ Thống](#3-kiến-trúc-tổng-thể-hệ-thống)
4. [Các Tính Năng Chính](#4-các-tính-năng-chính)
   - [Dành cho Độc giả (Reader)](#41-dành-cho-độc-giả-reader)
   - [Dành cho Tác giả (Author Studio)](#42-dành-cho-tác-giả-author-studio)
   - [Diễn đàn & Mạng xã hội (Community & Social)](#43-diễn-đàn--mạng-xã-hội-community--social)
   - [Kiểm duyệt & Quản trị (Mod & Admin Dashboard)](#44-kiểm-duyệt--quản-trị-mod--admin-dashboard)
5. [Ngăn Xếp Công Nghệ (Tech Stack)](#5-ngăn-xếp-công-nghệ-tech-stack)
6. [Mô Hình Dữ Liệu (Database Design)](#6-mô-hình-dữ-liệu-database-design)
7. [Bảo Mật & Tối Ưu Hiệu Năng](#7-bảo-mật--tối-ưu-hiệu-năng)
8. [Cấu Trúc Thư Mục Dự Án](#8-cấu-trúc-thư-mục-dự-án)
9. [Hướng Dẫn Cài Đặt & Triển Khai](#9-hướng-dẫn-cài-đặt--triển-khai)
   - [Yêu cầu tiên quyết](#91-yêu-cầu-tiên-quyết)
   - [Cấu hình biến môi trường (.env)](#92-cấu-hình-biến-môi-trường-env)
   - [Khởi chạy bằng Docker Compose (Khuyên dùng)](#93-khởi-chạy-bằng-docker-compose-khuyên-dùng)
   - [Khởi chạy thủ công từng dịch vụ (Local Development)](#94-khởi-chạy-thủ-công-từng-dịch-vụ-local-development)

---

## 1. Giới Thiệu Đề Tài

**MugenBunko (無限文庫 - Vô Hạn Văn Khố)** là một nền tảng xuất bản và đọc tiểu thuyết số hiện đại (Light Novel & Web Novel) hỗ trợ đa nền tảng (**Web SPA** và **Mobile Application**). Dự án được thiết kế theo kiến trúc hướng dịch vụ với sự kết hợp giữa **RESTful API**, **Websocket Real-time** và cơ sở dữ liệu quan hệ **MySQL 8.0**.

Dự án ra đời nhằm giải quyết bài toán thiếu hụt các nền tảng đọc truyện mở, chuẩn hóa trải nghiệm người dùng, kết hợp mô hình sáng tác tự do có kiểm duyệt với mạng xã hội giao lưu trực tiếp giữa tác giả và độc giả.

---

## 2. Mục Tiêu & Ý Nghĩa Thực Tiễn

* **Trải nghiệm đọc xuất sắc:** Cung cấp giao diện trình đọc (Reader) chuyên sâu với khả năng cá nhân hóa cao (kích thước font chữ, chế độ tương phản nền, khoảng cách dòng, chuyển chương linh hoạt).
* **Không gian sáng tác chuyên nghiệp (Author Studio):** Hỗ trợ tác giả quản lý theo cấu trúc Quyển (Volume) - Chương (Chapter), lưu bản nháp, lên lịch phát hành tự động (Scheduled Release) và thống kê lượt đọc.
* **Cộng đồng tương tác thời gian thực:** Tích hợp diễn đàn thảo luận, bình luận đa cấp độ lồng nhau (nested comments), đánh giá truyện (review/star rating) và chat trực tiếp (Direct Message) qua Socket.IO.
* **Hỗ trợ đa nền tảng:** Đồng bộ hóa trải nghiệm giữa Web (React 19) và Mobile (React Native / Expo 57).
* **Quản trị & Kiểm duyệt chặt chẽ (RBAC):** Hệ thống phân quyền 4 cấp độ (`reader`, `author`, `moderator`, `admin`) giúp bảo đảm nội dung luôn trong sạch, an toàn.

---

## 3. Kiến Trúc Tổng Thể Hệ Thống

```
                     ┌──────────────────────────────────────────────┐
                     │                 CLIENT LAYER                 │
                     │  ┌────────────────────┐ ┌──────────────────┐ │
                     │  │   React 19 (Web)   │ │ React Native/Expo│ │
                     │  │   Vite + TS + CSS  │ │   Mobile App     │ │
                     │  └─────────┬──────────┘ └────────┬─────────┘ │
                     └────────────┼─────────────────────┼───────────┘
                                  │ HTTP/REST           │ WebSocket
                                  ▼                     ▼
                     ┌──────────────────────────────────────────────┐
                     │              API & SERVER LAYER              │
                     │  ┌────────────────────────────────────────┐  │
                     │  │      Node.js + Express (TypeScript)    │  │
                     │  │ ├─ JWT Auth & Role Middleware (RBAC)   │  │
                     │  │ ├─ OTP Mailer Service (Nodemailer)     │  │
                     │  │ ├─ Rate Limiting & Helmet Shield       │  │
                     │  │ └─ Socket.IO Event Server              │  │
                     │  └───────────────────┬────────────────────┘  │
                     └──────────────────────┼───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │              DATA & CLOUD LAYER              │
                     │  ┌────────────────────┐ ┌──────────────────┐ │
                     │  │    MySQL 8.0       │ │  Cloudinary CDN  │ │
                     │  │  (Relational DB)   │ │  (Media Assets)  │ │
                     │  └────────────────────┘ └──────────────────┘ │
                     └──────────────────────────────────────────────┘
```

---

## 4. Các Tính Năng Chính

### 4.1. Dành cho Độc giả (Reader)
- 🔍 **Khám phá thông minh:** Bộ lọc truyện đa tiêu chí theo thể loại (Genres), số chương, trạng thái xuất bản, lượt xem, điểm đánh giá.
- 📖 **Trình đọc chuẩn mực (Chapter Reader):** Tùy chỉnh chế độ đọc (màu nền, cỡ chữ, font chữ, giãn dòng), tự động lưu lịch sử đọc và tiến độ từng chương.
- 📚 **Tủ sách cá nhân (Library):** Đánh dấu truyện yêu thích (Bookmark), nhận thông báo ngay khi có chương mới phát hành.
- ⭐ **Đánh giá & Bình luận:** Chấm điểm sao (1 - 5 sao), viết nhận xét chuyên sâu, bình luận lồng nhau và báo cáo nội dung tiêu cực.
- 🛡️ **Cơ chế chống gian lận lượt xem:** Sử dụng IP Cooldown Rate-limiting để ngăn chặn việc spam tăng view ảo.

### 4.2. Dành cho Tác giả (Author Studio)
- 📝 **Soạn thảo & Tổ chức tác phẩm:** Phân chia truyện theo nhiều Quyển (Volume) và các Chương (Chapter).
- ⏱️ **Lên lịch đăng tự động:** Hẹn giờ phát hành chương theo thời gian thực tế (`scheduled_release`).
- 💾 **Bản nháp & Xuất bản:** Chế độ lưu nháp (`draft`) trước khi chính thức gửi kiểm duyệt hoặc xuất bản (`published`).
- **Bảo toàn bản thảo:** phục hồi bản chưa lưu theo từng tài khoản/chương, lưu nhanh bằng Ctrl+S hoặc ⌘S, chặn ghi đè khi bản máy chủ đã thay đổi. Nháp tự lưu mỗi 30 giây; phần sửa chương đã đăng được giữ trên máy cho đến khi bấm “Cập nhật chương”.
- **Xem trước & tập trung viết:** xem bản đang soạn với nền đọc, giữ nguyên editor khi đổi chế độ, xuất dự phòng TXT/MD và khôi phục lịch sử phiên bản.
- **Quản lý mục lục:** tìm/lọc đủ bốn trạng thái, thu gọn tập, đổi tên tập, chuyển nhiều chương giữa các tập và lưu thứ tự chương bằng nút lên/xuống. Thứ tự mới được dùng cả ở Reader.
- **Lịch đăng & kiểm duyệt:** tác giả gửi duyệt chương kèm lịch; lưu thay đổi giữ nguyên lịch đã duyệt. Rút chương về nháp hủy lịch đăng. Ngày giờ trong hộp thoại dùng múi giờ hiển thị bên cạnh ô nhập.
- 📊 **Thống kê:** Theo dõi số từ, lượt đọc, số lượng bookmark và tương tác bạn đọc.

### 4.3. Diễn đàn & Mạng xã hội (Community & Social)
- 💬 **Diễn đàn (Forum):** Tạo chủ đề trao đổi theo danh mục, đính kèm hình ảnh, thả tim (Like) và thảo luận.
- 🤝 **Hệ thống kết bạn (Social & Friends):** Gửi lời mời kết bạn, quản lý danh sách bạn bè, hiển thị trạng thái online/offline.
- ⚡ **Chat trực tiếp (Direct Message - ChatWidget):** Trò chuyện 1-1 theo thời gian thực sử dụng Socket.IO.
- 🔔 **Thông báo tức thời (Real-time Notifications):** Nhận thông báo khi có bình luận phản hồi, chương mới phát hành, hoặc tin nhắn mới.
- 🎮 **Gamification:** Hệ thống cấp độ (`level`), kinh nghiệm (`xp`) và điểm tích lũy (`coins`) thưởng khi tham gia hoạt động.

### 4.4. Kiểm duyệt & Quản trị (Mod & Admin Dashboard)

- 🛡️ **Mod Dashboard:**
  - Sidebar dọc chia năm tab: Tổng quan, Chờ duyệt, Báo cáo, Tài khoản và Nội dung đã đăng; cùng hệ giao diện với Admin và menu thu gọn trên màn hình nhỏ.
  - Tìm kiếm/phân trang hàng đợi, xem nội dung chương ngay trong trang, thử tải lại khi lỗi, duyệt xuất bản hoặc trả chương về nháp. Nội dung đã đăng có thể được ẩn để tác giả chỉnh sửa.
  - Báo cáo hiển thị bình luận, người gửi và lý do; giữ hoặc xóa đúng bình luận kể cả khi đang lọc danh sách.
  - Tab Tài khoản hỗ trợ tra cứu/lọc trạng thái. Chỉ Admin có thao tác khóa/mở khóa theo quyền API hiện có; Mod không được cấp thêm quyền quản trị.
  - Giữ danh sách khi mất mạng, có thử lại và khóa nút trong lúc xử lý; hỗ trợ bàn phím và các theme Washi/Sepia/Charcoal.
- 👑 **Admin Dashboard:**
  - Sidebar dọc chia sáu tab: Tổng quan, Tài khoản, Tác phẩm, Danh mục, Sự kiện và Trang chủ. Trên màn hình nhỏ, menu dọc có thể thu gọn.
  - Tổng quan hiển thị số tài khoản, tác phẩm, chương chờ duyệt và báo cáo; các hàng công việc mở đúng khu vực cần xử lý.
  - Tìm kiếm, lọc và phân trang tài khoản/tác phẩm; phân quyền thành viên và phê duyệt đơn đăng ký tác giả (`author_request`). Khu vực kiểm duyệt vẫn phụ trách khóa/mở khóa tài khoản.
  - Thêm/xóa thể loại, gộp thẻ, soạn nháp, xem trước, phát hành/dừng và xóa sự kiện. Nội dung đang soạn được giữ khi đổi tab hoặc lưu thất bại.
  - Tab Trang chủ chọn banner tiêu điểm trên trình duyệt hiện tại. Đây là lựa chọn cục bộ, chưa phải cấu hình banner dùng chung cho mọi người.
  - Hỗ trợ bàn phím trong sidebar, các theme Washi/Sepia/Charcoal, trạng thái đang xử lý và tải lỗi có thử lại. Xem trước sự kiện (`#/event/:id`) và quản lý quy định (`#/manage-rules`) hỗ trợ tải lại URL.

---

## 5. Ngăn Xếp Công Nghệ (Tech Stack)

| Hạng mục | Công nghệ sử dụng | Mục đích / Vai trò |
| :--- | :--- | :--- |
| **Web Frontend** | **React 19**, TypeScript, Vite 8 | Xây dựng giao diện Web SPA tốc độ cao, type-safe |
| **Web Styling** | Vanilla CSS, Glassmorphism, Micro-animations | Thiết kế giao diện Dark Cyber / Anime phong cách độc quyền |
| **Mobile App** | **React Native**, **Expo SDK 57**, Expo Router | Ứng dụng di động iOS/Android mượt mà |
| **Backend API** | **Node.js**, **Express 4**, TypeScript, tsx | RESTful API Server xử lý nghiệp vụ trung tâm |
| **Real-time Engine**| **Socket.IO 4.8** | Xử lý tin nhắn tức thì, cập nhật thông báo và trạng thái người dùng |
| **Database** | **MySQL 8.0** | Lưu trữ dữ liệu quan hệ với cấu trúc bảng chuẩn hóa |
| **Authentication** | **JWT (JSON Web Token)**, **Bcrypt.js** | Xác thực phiên làm việc, mã hóa mật khẩu người dùng |
| **Email Service** | **Nodemailer** | Gửi mã OTP xác thực đăng ký tài khoản qua Gmail |
| **Cloud Media** | **Cloudinary** | Lưu trữ và phân phối tài nguyên ảnh (bìa truyện, avatar) |
| **Bảo mật** | **Helmet**, **CORS**, **Express Rate Limit** | Phòng chống XSS, Clickjacking, Brute-force & DDoS |
| **DevOps** | **Docker**, **Docker Compose** | Đóng gói môi trường đồng nhất giữa dev và production |

---

## 6. Mô Hình Dữ Liệu (Database Design)

Cơ sở dữ liệu bao gồm **22 bảng** quan hệ với tính toàn vẹn tham chiếu chặt chẽ:

```
 users ◄───(1:N)─── user_roles
   ▲
   ├───────(1:N)─── novels ◄───(1:N)─── chapters
   ├───────(1:N)─── bookmarks
   ├───────(1:N)─── follows
   ├───────(1:N)─── comments ◄───(1:N)─── reports
   ├───────(1:N)─── reviews
   ├───────(1:N)─── forum_posts ◄───(1:N)─── forum_comments
   ├───────(1:N)─── forum_post_likes
   ├───────(1:N)─── notifications
   ├───────(M:N)─── friends
   └───────(1:N)─── messages (sender_id, receiver_id)
```

### Các bảng dữ liệu cốt lõi:
- `users`: Quản lý tài khoản, mật khẩu băm, email, level, xp, coins, trạng thái.
- `user_roles`: Hỗ trợ mô hình một người dùng sở hữu nhiều vai trò (RBAC).
- `novels`: Thông tin tác phẩm, tác giả (`author_id`), thể loại, điểm trung bình, số lượt xem.
- `chapters`: Nội dung chương (`LONGTEXT`), trạng thái duyệt (`draft`, `published`, `scheduled`), lịch hẹn phát hành.
- `comments`: Lưu trữ bình luận hỗ trợ 2 cấp (`parent_id`).
- `forum_posts` & `forum_comments`: Cấu trúc diễn đàn giao lưu người dùng.
- `messages`: Lưu trữ tin nhắn trực tiếp giữa 2 người dùng.
- `read_cooldowns`: Ghi nhận IP đọc truyện để kiểm soát lượt view hợp lệ.

---

## 7. Bảo Mật & Tối Ưu Hiệu Năng

1. **Bảo mật xác thực & Đăng ký tài khoản:**
   - Đăng ký qua Email với cơ chế **OTP (One-Time Password)** giới hạn thời gian hết hạn qua Gmail.
   - Mật khẩu yêu cầu độ phức tạp cao (chữ hoa, số, ký tự đặc biệt) và được băm bằng thuật toán **Bcrypt** (Salt rounds = 10).
2. **Kiểm soát truy cập (RBAC Middleware):**
   - Middleware kiểm tra chữ ký token JWT và vai trò người dùng trước khi cấp quyền vào các endpoint nhạy cảm (`auth`, `requireRole('author')`, `requireRole('admin')`, `requireRole('moderator')`).
3. **Phòng chống tấn công mạng:**
   - **Helmet**: Tự động thêm các HTTP security headers chống giả mạo clickjacking và XSS.
   - **Express Rate Limit**: Giới hạn tần suất request theo IP (đặc biệt tại các cổng đăng nhập, đăng ký và tải ảnh lên).
4. **Tối ưu trải nghiệm:**
   - Tự động nén ảnh và phân giải qua Cloudinary CDN.
   - Kết nối cơ sở dữ liệu qua **MySQL Connection Pool** (`mysql2/promise`) giải phóng kết nối tự động.

---

## 8. Cấu Trúc Thư Mục Dự Án

```
mugenbunko-react/
├── docker-compose.yml       # Cấu hình container Docker (App + MySQL 8.0)
├── Dockerfile               # Multi-stage Docker build cho cả Frontend & Backend
├── package.json             # Root scripts điều phối đồng thời các service
│
├── server/                  # BACKEND SERVER (Node.js + Express + TypeScript)
│   ├── middleware/          # auth.ts (JWT), roles.ts (RBAC)
│   ├── routes/              # admin.ts, auth.ts, novels.ts, chapters.ts,
│   │                        # forum.ts, mod.ts, social.ts, reviews.ts, v.v.
│   ├── schema.sql           # Kịch bản khởi tạo CSDL MySQL 22 bảng + Seed Data
│   ├── server.ts            # Entrypoint Backend & Khởi tạo Socket.IO
│   └── package.json
│
├── src/                     # WEB FRONTEND (React 19 + TypeScript + Vite)
│   ├── components/          # Header, Footer, ChatWidget, Modals, Icons
│   ├── pages/               # Home, Explore, NovelDetail, ChapterReader,
│   │                        # AuthorStudio, AdminDashboard, ModDashboard, Forum, Library
│   ├── App.tsx              # Điều hướng trang (React Router)
│   └── index.css            # Toàn bộ Design System & Theme Styling
│
└── mobile/                  # MOBILE APP (React Native + Expo 57)
    ├── app/                 # Expo Router file-based navigation ((tabs), reader, novel)
    ├── src/                 # Services (API, Socket), Components, Context
    ├── package.json
    └── app.json             # Cấu hình Expo Application
```

---

## 9. Hướng Dẫn Cài Đặt & Triển Khai

### 9.1. Yêu cầu tiên quyết
- **Node.js** 24.x và **npm** >= 10.x
- **MySQL** >= 8.0 (nếu chạy local không qua Docker)
- **Docker** & **Docker Compose** (khuyên dùng để chạy tự động toàn bộ)
- Thiết bị di động cài đặt app **Expo Go** (nếu muốn test Mobile App)

### 9.2. Cấu hình biến môi trường (.env)
Chạy local: sao chép `server/.env.example` thành `server/.env` và điền cấu hình tại đó; backend đọc file này cả khi chạy từ thư mục gốc. Các biến dành cho frontend/Vite đặt ở `.env` tại thư mục gốc. Chạy Docker production dùng `.env.production` theo phần triển khai production bên dưới.

```env
# Server Configuration
PORT=5000
HOST_PORT=5000
JWT_SECRET=

# Database Configuration (Local hoặc Docker)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mugenbunko

# Mailer OTP Verification (Gmail App Password)
DEV_OTP=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

OTP gửi email thật cần đủ `SMTP_USER` và `SMTP_PASS`; tên cũ `EMAIL_USER`/`EMAIL_PASS` không được backend sử dụng. Với Gmail, dùng [App Password theo hướng dẫn Google](https://support.google.com/accounts/answer/185833) của tài khoản đã bật xác minh hai bước. Điền thông tin trực tiếp trong `server/.env` (file đã được Git bỏ qua), sau đó khởi động lại backend. Nếu dùng cổng `465`, đặt `SMTP_SECURE=true`; cổng `587` dùng `false` để nâng cấp kết nối qua STARTTLS.

Chạy `npm run check:smtp` từ thư mục gốc để kiểm tra cấu hình, kết nối và xác thực SMTP mà không gửi email. Lệnh không in mật khẩu hoặc mã OTP; kết nối thành công chưa bảo đảm email sẽ vào hộp thư đến. Nếu chỉ thử local khi chưa có SMTP, có thể chủ động đặt `DEV_OTP=true`: mã được điền sẵn trên web và giao diện nói rõ chưa gửi email thật. Khi có SMTP hợp lệ, OTP chỉ được gửi qua email và không trả về JSON, kể cả khi cờ thử nghiệm đang bật. Production không cho phép lấy OTP qua chế độ thử nghiệm.

Mẫu thư xác thực ở `server/emails/registrationOtp.ts`, gồm HTML có thương hiệu MugenBunko và bản văn bản thuần chứa cùng mã. Thư dùng tên người gửi “MugenBunko” cùng địa chỉ SMTP đã cấu hình; bố cục bảng, CSS nội tuyến và điều chỉnh màn hình nhỏ. Mã được giữ thành một chuỗi 6 số để sao chép; không chèn vào tiêu đề hoặc phần xem trước hộp thư. Mẫu không tải ảnh/font ngoài và không có mã theo dõi. Thay mẫu áp dụng cho email gửi mới, không thay đổi email đã nhận.

---

### 9.3. Khởi chạy bằng Docker Compose (Khuyên dùng)
Dựng toàn bộ Database và Ứng dụng Backend/Frontend Web chỉ với một lệnh:

```bash
docker-compose up --build -d
```
- **Web App**: Truy cập tại `http://localhost:5000`
- **MySQL Container**: Mở tại cổng `3307` (hoặc `3306`)

---

### 9.4. Khởi chạy thủ công từng dịch vụ (Local Development)

#### Bước 1: Khởi tạo Database
Import file CSDL mẫu vào MySQL:
```bash
mysql -u root -p < server/schema.sql
```

#### Bước 2: Cài đặt Dependencies
```bash
# Cài đặt thư viện cho Web Root
npm install

# Cài đặt thư viện cho Server Backend
cd server && npm install && cd ..

# Cài đặt thư viện cho Mobile App
cd mobile && npm install && cd ..
```

#### Bước 3: Chạy ứng dụng

- **Chạy đồng thời cả Web Frontend và Backend Server:**
  ```bash
  npm run dev
  ```
  - Frontend Web: `http://localhost:5173`
  - Backend API: `http://localhost:5000`

- **Chạy tất cả (Web + Backend + Mobile Expo):**
  ```bash
  npm run dev:all
  ```

- **Chạy riêng Mobile App:**
  ```bash
  npm run dev:mobile
  # Sau đó quét mã QR bằng ứng dụng Expo Go trên điện thoại
  ```

---

## Kiểm tra các nâng cấp Reader, Tủ sách và Studio

Đăng nhập và đăng ký web là hai trang riêng tại `#/login` và `#/register`. Các liên kết cần tài khoản giữ trang đích trong `returnTo`; đăng nhập/đăng ký thành công quay về trang đó. Biểu mẫu đăng ký giữ OTP email, kiểm tra mật khẩu nhập lại và thời gian chờ gửi lại mã; lỗi hiển thị ngay trong trang. Mật khẩu chỉ được giữ trong bộ nhớ của biểu mẫu.

Khôi phục mật khẩu tại `#/forgot-password`, mở từ “Quên mật khẩu?” trên trang đăng nhập và giữ `returnTo` khi quay lại. Nhập email đã đăng ký, nhận mã 6 số rồi nhập mật khẩu mới hai lần; mã có hạn 5 phút, chờ 60 giây trước khi gửi lại và tối đa 5 lần thử mỗi mã. `POST /api/auth/forgot-password` trả thông báo chung cho email tồn tại, không tồn tại, bị khóa hoặc đang chờ gửi lại; xử lý gửi SMTP ở nền để thời gian gửi thư không làm lộ tài khoản. Email chưa đăng ký vẫn đi qua cùng bước lưu challenge/thời gian chờ nhưng không nhận thư. Chế độ thử nghiệm chỉ trả `devOtp` ở local khi không có SMTP. `POST /api/auth/reset-password` dùng `{ email, otp, newPassword }`; mã đăng ký và khôi phục có `purpose` riêng, không dùng thay nhau. Việc cập nhật mật khẩu và xóa mã diễn ra trong cùng transaction.

Đổi mật khẩu chủ động trong Hồ sơ → Thông tin cơ bản → Mật khẩu & bảo mật. `POST /api/auth/change-password` yêu cầu đăng nhập và `{ currentPassword, newPassword }`, kiểm tra mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ và cùng chính sách với đăng ký. Giới hạn thử đổi theo tài khoản; luồng khôi phục có giới hạn theo IP và theo challenge. Cả hai luồng tăng `users.auth_version`, xóa challenge khôi phục còn chờ và yêu cầu đăng nhập lại; token/cookie cũ hết hiệu lực, socket đang kết nối trên tiến trình xử lý được ngắt ngay. Kết nối ở tiến trình khác phải xác thực lại phiên khi gửi thao tác. Tài khoản có email nhận thư thông báo thay đổi, không chứa mật khẩu. Tài khoản chưa có email vẫn đổi được bằng mật khẩu hiện tại; khôi phục qua email cần email đã được gắn với tài khoản.

Migration bổ sung `users.auth_version` và chuyển khóa chính OTP sang `(email, purpose)`; mã đăng ký đang còn hạn được giữ nguyên. Production chạy migration trước khi khởi động bản mới. Chạy `npm run test:passwords` cho kiểm tra API, mã một lần, hết hạn, cập nhật đồng thời, rollback và thu hồi phiên; `npm run test:auth:browser` kiểm tra các biểu mẫu và điều hướng web. Các bộ kiểm tra dùng database tách biệt và không gửi email thật.

Quy định cộng đồng công khai tại `#/rules`, hỗ trợ mục lục, tìm kiếm không dấu và liên kết đến điều khoản `#/rules?section=<id>`. Admin soạn tại `#/manage-rules`; xem trước dùng cùng cách trình bày với trang công khai. Bản đang soạn được khôi phục từ trình duyệt theo tài khoản, chỉ nút “Công bố” mới cập nhật nội dung cho độc giả. Đây là bản lưu trên thiết bị, chưa đồng bộ giữa các thiết bị. API sửa/xóa yêu cầu `baseRule` gồm `title`, `content`, `order_index` để đối chiếu bản gốc; khi có cập nhật đồng thời trả `409` cùng bản mới, khi điều khoản đã bị xóa trả `404`. Xóa hết quy định sẽ giữ tài liệu rỗng qua các lần khởi động lại, không tự khôi phục dữ liệu mẫu.

Bộ mặc định gồm 25 điều tại `server/communityRules.ts`: giữ 5 chủ đề ban đầu và bổ sung 20 điều về tài khoản, phân loại tác phẩm, AI, đăng lại, ứng xử, quyền riêng tư, đánh giá, spoiler, diễn đàn, spam, số liệu, tin nhắn, bầu chọn, báo cáo, kiểm duyệt, chế tài và khiếu nại. Các tiểu mục có tiêu đề riêng khi đọc hoặc xem trước. Đây là quy định để thành viên và người quản lý áp dụng; thời hạn xử lý, cảnh báo và mở khóa cần được người quản lý thực hiện, chưa phải cơ chế chế tài tự động.

Khi khởi tạo hoặc chạy migration, `server/communityRulesMigration.ts` tạo bộ 25 điều cho bảng mới, hoặc nâng cấp nguyên tử nếu tài liệu hiện tại khớp chính xác cả 5 điều mặc định cũ; giữ ID của 5 điều để bảo toàn liên kết. Nếu admin đã sửa, thêm, xóa hoặc cố ý để trống, migration giữ nguyên toàn bộ tài liệu đó. Chạy lại không nhân bản hay ghi đè nội dung. Production áp dụng qua quy trình migration hiện có, không tự thay dữ liệu khi khởi động với `migrate: false`.

Kiểm tra tĩnh và build frontend trước khi bàn giao thay đổi:

```bash
npm run typecheck
npm run lint
npm run build
npm --prefix server run build
npm --prefix mobile run typecheck
```

Build web không thay thế bước kiểm tra TypeScript. Các trang Studio, diễn đàn, hồ sơ và quản trị được tải theo nhu cầu; khi sửa điều hướng cần kiểm tra cả mở trực tiếp URL và chuyển trang trong ứng dụng.

Backend development tự tạo các bảng tiến độ đọc, kệ sách và lịch sử bản thảo khi khởi động. Production chạy migration riêng trước khi khởi động ứng dụng theo hướng dẫn dưới đây.

Studio bổ sung cột `chapters.sort_order`; migration trên dữ liệu cũ gán thứ tự ban đầu theo ID để giữ mục lục hiện có. Khởi động lại backend development để áp dụng; production chạy `npm --prefix server run build` và `npm --prefix server run migrate:production` trước khi chạy bản mới.

- **Reader:** lưu đoạn đang đọc và đồng bộ theo tài khoản; vị trí khi mất mạng được gửi lại khi có kết nối. Khách chưa đăng nhập lưu trên thiết bị.
- **Tủ sách:** tạo kệ, chọn bìa từ truyện, quản lý tác phẩm và chia sẻ kệ công khai. Đổi sang riêng tư sẽ chặn liên kết công khai.
- **Studio:** nút “Lịch sử phiên bản” trong thanh công cụ cho xem và khôi phục 50 bản nội dung gần nhất. Khôi phục tạo bản nháp và giữ nội dung hiện tại trong lịch sử.

Chạy kiểm thử với Node.js 24 và cấu hình MySQL trong `server/.env`:

```bash
npm run test:upgrades
npm run test:upgrades:browser
npm run test:studio
npm run test:studio:browser
npm run test:auth
npm run test:auth:browser
npm run test:rules
npm run test:rules:browser
```

Bộ test dùng database riêng có tên `mugenbunko_test_*`, yêu cầu tài khoản MySQL có quyền tạo/xóa database và tự dọn sau khi chạy. Kiểm thử trình duyệt sử dụng Edge headless trên Windows; có thể đặt `UPGRADE_BROWSER_PATH` để chọn executable Chromium khác. Ảnh kiểm tra nằm trong `artifacts/upgrades/` và được Git bỏ qua.

## Bầu chọn và bổ nhiệm kiểm duyệt viên

Web có trang `#/elections`, tab **Bầu chọn mod** trong Admin và **Hội đồng bầu chọn** trong Mod. Mobile mở từ mục Cá nhân hoặc khu Quản trị/kiểm duyệt. Luồng gồm đề cử có đồng ý, hồ sơ, hai vòng phiếu riêng, thống kê đã chốt, quyết định admin, khiếu nại và nhiệm kỳ.

Xem thể lệ, phân quyền, migration và lệnh kiểm thử tại [docs/ELECTIONS.md](docs/ELECTIONS.md). Development tự tạo bảng mới khi khởi động backend; production cần chạy migration trước khi cập nhật server.

## Đưa lên production

### Bảo mật phiên và nội dung

Web dùng cookie phiên `HttpOnly`, `SameSite=Strict` và `Secure` trong production; frontend và API cần cùng site, với `FRONTEND_URL` khai báo đúng origin. JWT cũ trong localStorage được đổi sang cookie khi làm mới phiên và sau đó xóa khỏi localStorage. Mobile native dùng SecureStore; token AsyncStorage cũ chỉ bị xóa sau khi đã lưu an toàn. Expo web cũng dùng cookie thay vì lưu token.

Logout gọi server để thu hồi token; socket cùng phiên bị đóng và socket hết hạn tự ngắt ngay cả khi không gửi thao tác. Khi offline, ứng dụng báo chưa thể kết thúc phiên để người dùng thử lại. Token thu hồi được lưu dạng SHA-256 trong bảng `revoked_tokens`; **chạy migration trước khi cập nhật server production**. Startup production kiểm tra bảng này và dừng nếu schema chưa sẵn sàng.

API đánh giá kiểm tra số chương hoàn thành từ server (series 3 chương, oneshot 1 chương), chỉ cho tương tác với truyện đã công khai, và cộng XP một lần khi các request đến đồng thời. Feed bình luận/đánh giá/thông báo và bìa kệ công khai loại truyện chưa xuất bản hoặc đã khóa. Metadata truyện đã xóa chỉ hiện đầy đủ cho nhân sự điều hành; người dùng khác nhận thông báo gỡ bỏ chung vì dữ liệu cũ không ghi trạng thái công khai. Server kiểm tra luồng trả lời, người nhận thông báo, quyền tác giả và thông báo diễn đàn. Các thao tác đăng nội dung có giới hạn 30 request/phút/tài khoản.

API mobile production yêu cầu HTTPS. Native cần build lại để đóng gói SecureStore; kiểm tra lưu/khôi phục phiên trên Android/iOS trước khi phát hành. Chỉ bản xem thử web trên loopback được phép dùng API HTTP loopback.

Dependency mobile được cập nhật trong Expo SDK 57, vá Axios, shell-quote, UUID và decode-uri-component. `mobile/scripts/patch-query-decoder.mjs` chạy sau cài đặt để giữ API CommonJS của query-string 7 với decoder ESM đã vá; nếu cài bằng `--ignore-scripts`, chạy `npm --prefix mobile run postinstall` trước khi build/test. Kiểm tra tương thích và input URL bất thường nằm trong `tests/mobile-dependencies.test.mjs`.

Lockfile web cũng cập nhật các bản tương thích với khoảng phiên bản đã khai báo, gồm Vite và các dependency công cụ build. Khi kiểm tra bảo mật, quét cả dev dependency vì chúng được dùng khi xây dựng bản phát hành.

Hai advisory upstream chưa có bản phát hành vá: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) và [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Chúng còn kéo theo cảnh báo audit trong dependency công cụ Expo/Metro/code-signing. Không công khai Metro/dev server; chỉ phát hành bundle production và theo dõi bản sửa upstream. `npm audit` sạch ở web/backend không có nghĩa đã kiểm chứng cấu hình máy chủ triển khai.

Sử dụng Node.js 24. Docker image chạy bằng user `node`, chỉ chứa dependency backend cần lúc chạy và không đóng gói file `.env`. MySQL chỉ nối mạng nội bộ; cổng ứng dụng mặc định bind `127.0.0.1` để đặt sau reverse proxy HTTPS.

Sao chép `.env.production.example` thành `.env.production`, điền domain, SMTP và ba secret riêng biệt: mật khẩu quản trị DB, mật khẩu DB của ứng dụng, JWT secret. Sinh mỗi secret bằng `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. `FRONTEND_URL` là danh sách origin HTTPS cách nhau bằng dấu phẩy; `PUBLIC_URL` là URL HTTPS công khai của backend. Đặt `TRUST_PROXY` đúng với proxy thực tế và chỉ cho proxy truy cập cổng app. SMTP chưa cấu hình sẽ trả 503; production không trả OTP qua JSON, kể cả khi đặt `DEV_OTP=true`.

Với **database mới**, chạy:

```bash
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production --profile tools run --rm --build migrate
docker compose --env-file .env.production up -d --build app
```

Migration chạy bằng tài khoản quản trị; sau đó thu hẹp `mugen_app` về SELECT/INSERT/UPDATE/DELETE trên database ứng dụng. Startup production không tự sửa schema và từ chối DB user `root`. Migration không chạy phần seed/TRUNCATE của `server/schema.sql`, không tạo admin có mật khẩu mặc định.

Tạo admin đầu tiên bằng cách đặt `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong shell quản trị, rồi chạy:

```bash
docker compose --env-file .env.production exec -e ADMIN_USERNAME -e ADMIN_PASSWORD app node server/dist/createAdmin.js
```

Mật khẩu admin phải có ít nhất 16 ký tự, tối đa 72 byte. Lệnh không ghi đè hay nâng quyền tài khoản đã tồn tại. Không lưu mật khẩu vào lịch sử lệnh hoặc repository.

Với **database đang có dữ liệu**, backup và thử migration trên bản sao trước, kể cả bước nâng MySQL 8.0 lên 8.4. Đặt `DB_ADMIN_PASSWORD` khớp mật khẩu root hiện tại; đổi biến môi trường không tự đổi mật khẩu trong volume cũ. Volume MySQL cũ không tự tạo user từ `MYSQL_USER`: cần tạo tài khoản `DB_APP_USER` với mật khẩu `DB_PASSWORD` trước khi chạy migration. Nếu chuyển từ Compose cũ, sao chép ảnh từ thư mục bind `server/uploads` sang volume `uploads_data` trước khi chuyển traffic. Khi thay JWT secret, các phiên đăng nhập và OTP đang chờ sẽ hết hiệu lực. Không import trực tiếp `server/schema.sql` lên production vì file đó vẫn chứa seed dành cho development/test.

Ứng dụng có `/healthz`, giới hạn payload và tốc độ request, CORS allowlist, CSP, OTP lưu hash trong DB và xác thực quyền từ DB ở mỗi request. Upload tối đa 5 MB, kiểm tra MIME/signature và dùng tên file UUID. Backup cả database lẫn volume `uploads_data`; nếu sử dụng Cloudinary thì quản lý backup media tại dịch vụ đó.

Migration nâng bảng `email_otps` cũ có `otp_code` và thời gian `TIMESTAMP` sang `code_hash`, thời gian mili giây, thời điểm gửi và số lần thử. Mã cũ bị vô hiệu hóa; người dùng cần yêu cầu mã mới. Chạy lại migration giữ nguyên mã mới và thời gian chờ gửi lại. Production kiểm tra đủ cột OTP khi khởi động; lỗi gửi mã được log theo bước xử lý và mã lỗi, không log email, OTP, mật khẩu hoặc tham số SQL. `npm --prefix server run test:security` bao gồm kiểm tra nâng cấp từ bảng OTP cũ.

Cấu hình hiện tại dành cho một instance. Presence socket và các rate limiter HTTP nằm trong bộ nhớ tiến trình; cần shared store/Socket.IO adapter khi chạy nhiều instance. API danh mục và diễn đàn đã phân trang, nhưng các view hiện tại vẫn ghép các trang để giữ tìm kiếm/lọc toàn bộ dữ liệu. Khi dữ liệu lớn cần chuyển tìm kiếm/lọc sang server, phân trang chương/bình luận và kiểm thử tải trên staging trước khi quyết định cấu hình máy.

Kiểm tra hồi quy (test dùng database tạm, không gửi email thật):

```bash
npm run test:upgrades
npm --prefix server run test:security
npm run test:upgrades:browser
npm run test:mobile
npm run test:mobile:browser
npm audit
npm --prefix server audit
npm --prefix mobile audit
```

Audit mobile hiện vẫn trả mã lỗi do hai advisory upstream nêu trên; không bỏ qua chúng hoặc dùng `audit fix --force` để hạ Expo xuống SDK không tương thích.

<p align="center">
  <i>Được xây dựng với niềm đam mê dành cho cộng đồng yêu thích Light Novel & Công nghệ phần mềm.</i><br>
  <b>© 2026 MugenBunko Team. All Rights Reserved.</b>
</p>
