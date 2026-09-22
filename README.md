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
- 📊 **Thống kê:** Theo dõi số từ, lượt đọc, số lượng bookmark và tương tác bạn đọc.

### 4.3. Diễn đàn & Mạng xã hội (Community & Social)
- 💬 **Diễn đàn (Forum):** Tạo chủ đề trao đổi theo danh mục, đính kèm hình ảnh, thả tim (Like) và thảo luận.
- 🤝 **Hệ thống kết bạn (Social & Friends):** Gửi lời mời kết bạn, quản lý danh sách bạn bè, hiển thị trạng thái online/offline.
- ⚡ **Chat trực tiếp (Direct Message - ChatWidget):** Trò chuyện 1-1 theo thời gian thực sử dụng Socket.IO.
- 🔔 **Thông báo tức thời (Real-time Notifications):** Nhận thông báo khi có bình luận phản hồi, chương mới phát hành, hoặc tin nhắn mới.
- 🎮 **Gamification:** Hệ thống cấp độ (`level`), kinh nghiệm (`xp`) và điểm tích lũy (`coins`) thưởng khi tham gia hoạt động.

### 4.4. Kiểm duyệt & Quản trị (Mod & Admin Dashboard)
- 🛡️ **Mod Dashboard:** Xem và xử lý danh sách chương truyện chờ phê duyệt, xử lý các báo cáo vi phạm (`reports`) bình luận/nội dung.
- 👑 **Admin Dashboard:**
  - Thống kê toàn cảnh hệ thống (Tổng người dùng, tổng tác phẩm, tổng chương, doanh thu).
  - Quản lý danh sách người dùng: Phân vai trò (`reader`, `author`, `moderator`, `admin`), khóa/mở khóa tài khoản (`active`/`suspended`).
  - Phê duyệt đơn đăng ký tác giả (`author_request`).
  - Quản lý thể loại truyện (Genres) và thông báo toàn hệ thống.

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
- **Node.js** >= 20.x và **npm** >= 10.x
- **MySQL** >= 8.0 (nếu chạy local không qua Docker)
- **Docker** & **Docker Compose** (khuyên dùng để chạy tự động toàn bộ)
- Thiết bị di động cài đặt app **Expo Go** (nếu muốn test Mobile App)

### 9.2. Cấu hình biến môi trường (.env)
Tạo file `.env` tại thư mục gốc của dự án:

```env
# Server Configuration
PORT=5000
HOST_PORT=5000
JWT_SECRET=mugenbunko_super_secret_jwt_key_2026

# Database Configuration (Local hoặc Docker)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mugenbunko

# Mailer OTP Verification (Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

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

<p align="center">
  <i>Được xây dựng với niềm đam mê dành cho cộng đồng yêu thích Light Novel & Công nghệ phần mềm.</i><br>
  <b>© 2026 MugenBunko Team. All Rights Reserved.</b>
</p>
