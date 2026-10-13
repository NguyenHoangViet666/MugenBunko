# Kế hoạch xây dựng cộng đồng 25 bot cho MugenBunko

**Ngày lập:** 12/10/2026 · **Phiên bản:** 1.0 · **Trạng thái:** Kế hoạch triển khai

## 1. Mục tiêu và phạm vi

Xây dựng 25 tài khoản nhân vật ảo có tính cách, sở thích và lịch sử tương tác riêng để MugenBunko có hoạt động cộng đồng phục vụ trải nghiệm và trình diễn đồ án. Các bot có thể xuất bản nội dung đã được duyệt, theo dõi truyện, bình luận, tham gia forum và nhắn tin với nhau.

Phương án đề xuất là một bộ điều phối chạy ở backend, dùng chung cơ sở dữ liệu và nghiệp vụ của web. AI chỉ được gọi khi cần soạn nội dung; không cần duy trì 25 phiên AI chạy liên tục. Mỗi bot luôn có nhãn nhận diện rõ ràng.

### Quy mô khởi đầu

| Nhóm | Số lượng | Vai trò chính |
| --- | --- | --- |
| Tác giả | 4 | Quản lý truyện mẫu, phát hành chương đã duyệt, trả lời độc giả |
| Độc giả thường xuyên | 8 | Theo truyện đúng gu, bình luận có căn cứ, trao đổi giả thuyết |
| Độc giả thỉnh thoảng ghé | 6 | Đọc chậm hơn, phản hồi ít hơn, hỏi tiến độ hợp lý |
| Thành viên mê forum | 5 | Mở chủ đề, viết cảm nhận, tổ chức thảo luận |
| Người chào đón | 2 | Viết hướng dẫn và trả lời khi được gọi |
| **Tổng** | **25** | **Đề xuất 6–10 bot hoạt động trong một ngày** |

### Kết quả cần đạt

- Một chuỗi hoạt động có liên hệ: chương được xuất bản → độc giả theo dõi đọc → bình luận → tác giả phản hồi → thảo luận forum.
- Từng nhân vật giữ được gu đọc và cách nói; nhớ những tình tiết và cuộc trò chuyện liên quan.
- Admin xem trước, bật hoặc tắt bot, giới hạn hoạt động và theo dõi chi phí.
- Tương tác bot được phân biệt trong giao diện, thống kê và cơ chế thưởng.
- Có chế độ demo theo kịch bản để trình diễn ngay cả khi không dùng dịch vụ AI.

### Ranh giới của bản đầu

Ưu tiên truyện mẫu do chủ dự án chuẩn bị hoặc có quyền sử dụng. Tác giả bot đăng từ kho bản nháp đã duyệt; việc AI tự sáng tác truyện dài là phần mở rộng. Chưa bật tự động chấm sao, thả tim, nhận thưởng hoặc thao tác quản trị. Tin nhắn bot với người thật chỉ mở ở giai đoạn sau, theo cơ chế đồng ý rõ ràng.

Các tên module, cấu trúc dữ liệu, hạn mức và thời gian trong các phần sau là thiết kế đề xuất. Việc lập kế hoạch chưa tạo tài khoản, gọi AI hay đăng nội dung lên web.

<!-- pagebreak -->

## 2. Hiện trạng và điểm tích hợp

Mã nguồn hiện tại dùng React và TypeScript cho web, Express và TypeScript cho backend, MySQL để lưu dữ liệu, Socket.IO cho chat. Tận dụng nền tảng này giúp tập trung công sức vào điều phối và chất lượng nhân vật.

| Thành phần hiện có | Điểm cần bổ sung |
| --- | --- |
| Tài khoản, vai trò và trạng thái hoạt động trong `server/schema.sql`, middleware xác thực và phân quyền | Thêm nhận diện bot do server quản lý; bot chỉ có quyền reader hoặc author phù hợp |
| Truyện và chương trong `server/routes/novels.ts`, `chapters.ts`, `mod.ts` | Tách nghiệp vụ ghi thành service dùng chung; giữ kiểm duyệt và quyền sở hữu |
| Vòng xuất bản chương hẹn giờ trong `server/server.ts` | Ghi sự kiện xuất bản cùng giao dịch để kích hoạt bot, xử lý được sau khi server khởi động lại |
| Bình luận truyện trong `server/routes/comments.ts` | Bổ sung ngữ cảnh chương và cách ẩn spoiler trước khi cho bot bàn tình tiết |
| Bài viết và phản hồi forum trong `server/routes/forum.ts` | Tái sử dụng kiểm tra quyền, chuẩn hóa HTML, giới hạn nội dung và thông báo |
| Chat trong `server/utils/messages.ts`, `server/realtime.ts`, `server/routes/social.ts` | Giữ điều kiện bạn bè; bổ sung giới hạn bot và đồng ý nhận tin khi mở cho người thật |
| Admin, hồ sơ và chat trên React | Thêm bảng điều khiển bot, nhãn Bot và bộ lọc thống kê |

### Ba điểm cần xử lý trước khi bật bot

**Xuất bản chương:** vòng hẹn giờ hiện cập nhật trực tiếp trạng thái chương. Cần gom các đường xuất bản tức thì, phê duyệt và đến lịch vào nghiệp vụ chung. Chỉ tạo sự kiện khi chương thực sự chuyển sang trạng thái công khai; việc sửa chương đã xuất bản không được kích hoạt lại chuỗi chào chương mới.

**Bình luận theo chương:** bảng `comments` hiện gắn với truyện qua `novel_id`, chưa có `chapter_id`. Đề xuất thêm `chapter_id` cho phép null và cờ spoiler, giữ nguyên bình luận cũ. Khi nhận xét chương cụ thể, bot ghi đúng chương; giao diện thu gọn nội dung spoiler. Nếu chưa hoàn thành phần này, bot chỉ viết nhận xét chung không tiết lộ tình tiết.

**Service dùng chung:** phần lớn nghiệp vụ ghi đang nằm trong route Express. Cần tách service có kiểm tra quyền và đầu vào trước khi worker gọi lại; không giả định service đã tồn tại. `sendMessage` đã là một điểm dùng chung nhưng vẫn cần bổ sung chính sách dành cho bot.

Tác giả thường hiện chịu quy trình kiểm duyệt chương. Bot tác giả giữ cùng quy trình; không cấp quyền admin hoặc moderator để tự bỏ qua bước duyệt. Cần kiểm thử cả trường hợp bản nháp đã duyệt nhưng chưa tới giờ phát hành. Nếu nội dung thay đổi sau khi duyệt, kiểm tra lại phiên bản và yêu cầu duyệt lại trước khi xuất bản.

<!-- pagebreak -->

## 3. Danh sách nhân vật đề xuất

Tên và tính cách dưới đây là bộ hồ sơ khởi đầu, có thể sửa trong admin. Mỗi hồ sơ có mã ổn định để chạy lại công cụ tạo dữ liệu mà không tạo tài khoản trùng. Tất cả đều hiển thị nhãn Bot.

### Tác giả và độc giả thường xuyên

| Mã | Tên | Gu và cách tương tác |
| --- | --- | --- |
| B01 | Mây Mực | Tác giả fantasy; giải thích thế giới ngắn gọn, không tiết lộ chương chưa ra |
| B02 | Nắng Hiên | Tác giả truyện đời thường; dịu dàng, thích hỏi độc giả về cảm xúc |
| B03 | Dạ Lam | Tác giả bí ẩn; trả lời có chừng mực, nhắc người đọc đánh dấu spoiler |
| B04 | Gió Giấy | Tác giả phiêu lưu hài; vui vẻ, thông báo tiến độ từ lịch đã được duyệt |
| B05 | Mực | Mê fantasy; thích đoán diễn biến, phân biệt suy đoán với tình tiết có thật |
| B06 | Trà Đào | Mê chữa lành; chú ý những chi tiết nhỏ và cảm xúc nhân vật |
| B07 | Kính Lúp | Mê bí ẩn; nhắc lại manh mối đã xuất hiện, sẵn sàng sửa giả thuyết |
| B08 | Bắp Rang | Mê hài và phiêu lưu; bình luận ngắn, vui, dùng biểu cảm vừa phải |
| B09 | Lá Non | Thích sự trưởng thành của nhân vật; giọng ôn hòa, hay hỏi lý do lựa chọn |
| B10 | Sao Khuya | Thích thế giới giả tưởng; viết nhận xét có cấu trúc, quan tâm quy luật |
| B11 | Cá Mực | Thích nhịp truyện nhanh; hỏi ngắn và cụ thể, không thúc ép tác giả |
| B12 | Cà Phê Sữa | Đọc nhiều thể loại; so sánh cảm nhận cá nhân, thường nối tiếp ý của người khác |

### Quan hệ khởi đầu

- B05 và B10 theo truyện của B01; thường bàn về quy luật thế giới.
- B06 và B09 theo B02; chú ý những thay đổi trong quan hệ nhân vật.
- B07 theo B03; có thể trao đổi giả thuyết với B05 khi cả hai đã đọc cùng chương.
- B08 và B11 theo B04; thích nhận xét các đoạn phiêu lưu và gây cười.
- B12 kết nối các nhóm bằng việc giới thiệu tác phẩm phù hợp với sở thích.

Mỗi bot chỉ có một vài quan hệ nổi bật. Không buộc tất cả các nhân vật trở thành bạn hoặc trả lời lẫn nhau. Quan hệ ảnh hưởng xác suất chọn cuộc trò chuyện, không quyết định mọi lượt phản hồi.

<!-- pagebreak -->

## 4. Nhân vật bổ sung và trí nhớ

### Độc giả ghé thưa, thành viên forum và người chào đón

| Mã | Tên | Gu và cách tương tác |
| --- | --- | --- |
| B13 | Rêu | Độc giả ghé thưa; thích fantasy chậm, thường đọc vài chương rồi mới nhận xét |
| B14 | Bánh Bao | Độc giả ghé thưa; mê đời thường, để lại cảm nhận ngắn |
| B15 | Mèo Lười | Độc giả ghé thưa; thích hài, có đợt nghỉ đọc rồi quay lại |
| B16 | Sương Mai | Độc giả ghé thưa; mê tình cảm, quan tâm đối thoại nhân vật |
| B17 | Hạt Dẻ | Độc giả ghé thưa; thích phiêu lưu, đôi khi hỏi tiến độ từ thông báo công khai |
| B18 | Đom Đóm | Độc giả ghé thưa; mê bí ẩn, chỉ bàn tới chương mình đã đọc |
| B19 | Sổ Tay | Thành viên forum; tổng hợp truyện theo chủ đề từ danh mục thực tế |
| B20 | La Bàn | Thành viên forum; gợi ý truyện theo gu, giải thích lý do ngắn gọn |
| B21 | Dấu Hỏi | Thành viên forum; mở câu hỏi về cách kể chuyện và lựa chọn nhân vật |
| B22 | Trang Gấp | Thành viên forum; viết cảm nhận có ưu và nhược điểm, không tự chấm sao |
| B23 | Đèn Bàn | Thành viên forum; tổ chức thảo luận tuần theo lượng nội dung đang có |
| B24 | Chuông Nhỏ | Người chào đón; hướng dẫn thao tác từ nội dung trợ giúp đã duyệt |
| B25 | Bưu Thiếp | Người chào đón; giới thiệu hoạt động cộng đồng công khai, trả lời khi được gọi |

### Hồ sơ và trí nhớ cần lưu

Mỗi nhân vật lưu vai trò, thể loại yêu thích, giọng văn, độ dài thường dùng, khung giờ hoạt động, thời gian nghỉ giữa hai lần đăng và hạn mức riêng. Không cần dựng tiểu sử đời thật để làm nhân vật có vẻ là người thật.

Trí nhớ tách theo truyện và cuộc hội thoại: chương đã đọc, vài tình tiết liên quan, quan điểm từng nêu và người vừa trao đổi. Mỗi ký ức gắn nguồn và thời điểm để sửa hoặc vô hiệu hóa khi nội dung gốc thay đổi.

Giữ riêng phần tác giả biết để quản lý bản nháp và phần nhân vật được phép tiết lộ công khai. Độc giả chỉ nhận nội dung đã xuất bản và không biết tình tiết vượt quá tiến độ đọc của mình. Tin nhắn riêng không được đưa vào ngữ cảnh viết bình luận công khai.

**Đề xuất khởi đầu:** tối đa 2–3 truyện theo dõi trên mỗi độc giả; ngữ cảnh một lượt gồm hồ sơ, tóm tắt có nguồn và khoảng 6–10 lượt trao đổi gần nhất. Giới hạn theo token trước khi gửi AI để tránh chi phí tăng theo toàn bộ lịch sử.

<!-- pagebreak -->

## 5. Kiến trúc và vòng đời một hành động

### Các thành phần đề xuất

| Thành phần | Trách nhiệm |
| --- | --- |
| Bộ ghi sự kiện | Lưu chương mới, phản hồi mới và lịch hoạt động vào dữ liệu bền vững |
| Bộ điều phối | Chọn bot phù hợp, kiểm tra lịch và hạn mức, tạo công việc |
| Worker | Nhận công việc, lấy ngữ cảnh, gọi AI hoặc kịch bản, kiểm tra rồi thực hiện |
| Service nghiệp vụ | Xử lý quyền, kiểm duyệt, ghi nội dung, thông báo và giao dịch dữ liệu |
| Lớp gọi AI | Nhận yêu cầu có cấu trúc, giới hạn thời gian và token, ghi mức sử dụng |
| Trang quản lý | Điều khiển bot, xem hàng đợi, duyệt nội dung, theo dõi lỗi và chi phí |

Bản đầu chạy một vòng worker nền trong tiến trình backend, giới hạn một công việc AI tại một thời điểm. Hàng đợi nằm trong MySQL để không mất lịch khi khởi động lại. Tin nhắn worker ghi cần phát sự kiện qua Socket.IO sau khi commit; gọi riêng hàm lưu tin hiện tại chưa tự phát sự kiện đó. Nếu sau này tách worker thành tiến trình riêng, cần bổ sung đường chuyển thông báo về tiến trình Socket.IO.

### Luồng xuất bản và phản hồi

```text
Chương chuyển sang published
        ↓
Lưu sự kiện xuất bản cùng giao dịch dữ liệu
        ↓
Chọn độc giả có theo truyện và còn hạn mức
        ↓
Hẹn giờ đọc → tạo công việc bình luận
        ↓
Lấy nội dung đúng quyền và ký ức liên quan
        ↓
AI trả về bản nháp hoặc quyết định bỏ qua
        ↓
Kiểm tra nội dung, quyền, hạn mức và nút dừng
        ↓
Service đăng bình luận → lưu kết quả và ký ức
```

### Độ tin cậy của hàng đợi

Mỗi công việc có khóa duy nhất từ bot, loại hành động và nguồn kích hoạt. Worker nhận việc bằng thao tác nguyên tử, có thời hạn giữ việc để thu hồi sau sự cố. Khi ghi nội dung, ghi mã hành động cùng giao dịch và kiểm tra lại để retry không tạo hai bình luận hoặc hai tin nhắn.

Không giữ khóa giao dịch trong lúc chờ AI. Lưu bản nháp AI đã nhận để tái sử dụng khi chỉ phần ghi dữ liệu thất bại. Lỗi tạm thời được thử lại tối đa hai lần với thời gian chờ tăng dần; lỗi quyền, bị tắt bot hoặc nội dung không phù hợp thì hủy hoặc chuyển chờ duyệt.

Từng chuỗi phản hồi có mã nguồn và số lượt. Chỉ sự kiện phù hợp mới sinh việc tiếp theo; không mặc định mọi câu trả lời đều kéo thêm bot vào cuộc trò chuyện.

<!-- pagebreak -->

## 6. Dữ liệu và tổ chức mã nguồn đề xuất

### Thay đổi dữ liệu

| Dữ liệu | Nội dung cần lưu |
| --- | --- |
| `users.is_bot` | Cờ bot do server cấp; mọi API công khai liên quan trả về cờ để giao diện nhận diện |
| `bot_profiles` | Liên kết user, mã B01–B25, vai trò, tính cách, sở thích, lịch, trạng thái và giới hạn |
| `bot_read_state` | Truyện đang theo, chương đã đọc; chỉ lưu tiến độ mô phỏng, không kích hoạt thưởng đọc |
| `bot_memories` | Phạm vi truyện hoặc hội thoại, tóm tắt, nguồn, phiên bản nội dung, thời điểm và hạn lưu |
| `bot_jobs` | Loại việc, nguồn, thời gian chạy, khóa chống trùng, trạng thái, số lần thử, thời hạn giữ việc |
| `community_outbox` | Sự kiện nghiệp vụ đã ghi cùng giao dịch, trạng thái đã xử lý và khóa nguồn duy nhất |
| `bot_action_logs` | Công việc, bot, nội dung tạo ra, nguyên nhân chọn hoặc bỏ qua, kết quả, token và chi phí |
| `bot_settings` và bộ đếm ngày | Công tắc hệ thống, chế độ demo, cấu hình AI, hạn mức và phần ngân sách đã giữ trước |
| `comments` và đồng ý chat | Ngữ cảnh chương, spoiler; thêm bản ghi đồng ý theo cặp người nhận–bot khi mở chat người thật |

Quan hệ quen biết đơn giản có thể lưu trong hồ sơ bot ở bản đầu. Tin nhắn vẫn đi qua bảng `friends` và `messages` hiện có; việc đồng ý chat với bot là điều kiện bổ sung, không thay thế quan hệ bạn bè.

Ưu tiên chỉ mục theo trạng thái và thời gian chạy của job, khóa chống trùng, bot và ngày hoạt động, cùng phạm vi ký ức. Tên trường cuối cùng cần theo quy ước đang dùng trong dự án.

### Module dự kiến bổ sung

```text
server/bots/
  profiles.ts          Bộ 25 hồ sơ và dữ liệu khởi đầu
  scheduler.ts         Chọn sự kiện, bot và thời gian hoạt động
  worker.ts            Nhận việc và điều phối thực thi
  context.ts           Lấy dữ liệu và ký ức đúng phạm vi
  policy.ts            Quyền, hạn mức và giới hạn hội thoại
  provider.ts          Giao diện gọi dịch vụ AI
  repository.ts        Hàng đợi, nhật ký và trạng thái bot
server/services/       Nghiệp vụ tách từ các route hiện có
server/routes/bots.ts   API quản trị bot
src/components/        Nhãn Bot và phần quản lý trong admin
```

Migration chỉ bổ sung cấu trúc cần thiết và được ghi nhận phiên bản. Công cụ tạo 25 bot phải chạy lại an toàn, không xóa hoặc đặt lại dữ liệu người dùng. Không dùng lại toàn bộ `server/schema.sql` trên cơ sở dữ liệu đang có vì file này có phần reset dữ liệu mẫu.

Tài khoản bot không có mật khẩu mặc định công khai. Cờ bot và vai trò chỉ được cấp qua công cụ nội bộ hoặc quản trị; dữ liệu từ form đăng ký không được tự đặt các thuộc tính này.

<!-- pagebreak -->

## 7. Nội dung và lịch sinh hoạt

### Phân chia công việc cố định và công việc cần AI

| Công việc | Cách thực hiện |
| --- | --- |
| Tạo tài khoản, theo truyện, chọn lịch | Quy tắc backend và dữ liệu hồ sơ |
| Tạo truyện, sửa giới thiệu, đăng chương | Chỉ dùng bản nội dung đã duyệt, đúng chủ sở hữu và quy trình xuất bản |
| Bình luận, trả lời, viết cảm nhận | AI nhận nội dung thực tế và ngữ cảnh được phép đọc |
| Hướng dẫn tính năng | Nội dung trợ giúp đã duyệt; AI có thể diễn đạt lại trong phạm vi đó |
| Demo khi không có AI | Kịch bản mẫu gắn với truyện và tài khoản demo riêng |

Đầu ra AI có cấu trúc gồm quyết định đăng hoặc bỏ qua, bản nháp, tham chiếu nội dung đã dùng và ký ức cần cập nhật. Backend kiểm tra độ dài, nội dung trùng, dữ liệu nguồn và quyền trước khi ghi. Việc nhận xét “đã đọc” phải dựa trên ngữ cảnh thực tế; thiếu dữ liệu thì bỏ qua hoặc chờ duyệt.

Truyện, bình luận và tin nhắn là dữ liệu đầu vào, không phải chỉ dẫn điều khiển bot. Không cho AI tự chọn tài khoản đăng, chạy SQL, gọi công cụ hệ thống hay truy cập URL tùy ý. Khóa dịch vụ AI chỉ nằm ở backend.

### Hạn mức thử nghiệm đề xuất

| Thông số | Giá trị khởi đầu |
| --- | --- |
| Số bot được lên lịch trong ngày | 6–10 trên tổng số 25 |
| Thời gian sinh hoạt | 08:00–23:00 theo giờ Việt Nam; từng nhân vật có khung riêng |
| Tổng nội dung công khai | Tối đa 25 hành động/ngày cho cả nhóm, gồm đăng truyện, chương, bài và phản hồi |
| Tin nhắn bot với bot | Tối đa 10 tin/ngày cho cả nhóm |
| Giới hạn từng bot | Tối đa 4 hành động/ngày, cách nhau ít nhất 30 phút |
| Phản ứng với chương mới | Sau 10–90 phút, thêm thời gian đọc phù hợp độ dài |
| Một cuộc trao đổi tự động | Tối đa 4 lượt bot trong chuỗi; tối đa 2 lượt của một bot |
| Số lần gọi AI | Tối đa 40 lần/ngày, tính cả tóm tắt, thử lại và sửa đầu ra |

Đây là trần thử nghiệm, không phải chỉ tiêu phải đăng đủ. Nếu không có nội dung phù hợp, hệ thống để bot nghỉ. Dữ liệu thời gian lưu thống nhất theo UTC; giao diện và lịch nhân vật dùng múi giờ Việt Nam.

Tương tác do bot tạo không tự động kéo thêm bot nếu chuỗi đã đủ lượt. Bot chào đón không gửi tin nhắn riêng hàng loạt. Chế độ demo có lịch rút gọn và dữ liệu riêng, không bỏ qua kiểm tra quyền hay hạn mức chi phí.

<!-- pagebreak -->

## 8. Quản trị, chi phí và thống kê

### Bảng điều khiển cần có

- Danh sách 25 bot: vai trò, trạng thái, lần hoạt động cuối, công việc sắp tới và hạn mức đã dùng.
- Công tắc toàn hệ thống và từng bot; chế độ chỉ xem trước, chờ duyệt hoặc tự động trong phạm vi cho phép.
- Chi tiết công việc: nội dung nguồn, bản nháp, kết quả kiểm tra, nguyên nhân lỗi hoặc bỏ qua.
- Mức sử dụng AI theo ngày và tháng, số lần gọi, token, chi phí ước tính và trần ngân sách.
- Bộ lọc hoạt động bot trong quản trị và cách xem riêng dữ liệu demo.

Khi dừng hệ thống, không nhận thêm việc. Việc đang chờ AI phải kiểm tra lại công tắc trước bước ghi; nội dung đã commit trước thời điểm dừng được giữ và hiển thị rõ trong nhật ký. Tính năng ẩn nội dung theo đợt chỉ tác động nội dung có mã bot và mã đợt tương ứng, không xóa dây chuyền phản hồi của người thật. Nhật ký ưu tiên mã nguồn và kết quả kiểm tra, hạn chế lưu toàn văn hội thoại riêng.

### Dự toán không phụ thuộc nhà cung cấp

Chưa chốt dịch vụ AI và model. Trước khi bật AI trên môi trường thật, cấu hình model, đơn giá đang áp dụng và trần chi phí; mặc định dùng chế độ xem trước hoặc kịch bản khi thiếu cấu hình.

**Ví dụ tính tải, không phải báo giá:** 30 lần gọi/ngày, trung bình 4.000 token đầu vào và 300 token đầu ra, chạy 30 ngày. Tổng khoảng 3,6 triệu token đầu vào và 0,27 triệu token đầu ra.

```text
Chi phí AI tháng = 3,6 × P_in + 0,27 × P_out

P_in  = giá cho 1 triệu token đầu vào
P_out = giá cho 1 triệu token đầu ra
```

Nếu tổng số lần gọi thực tế khác giả định, phải tính lại; hạ tầng và các khoản phí khác tính riêng. Đề xuất thêm trần kỹ thuật 180.000 token đầu vào và 18.000 token đầu ra mỗi ngày, bên cạnh trần số lần gọi và tiền. Giữ trước ngân sách nguyên tử trước mỗi yêu cầu; khi timeout chưa biết mức sử dụng thì chưa hoàn lại phần giữ trước cho tới khi đối soát hoặc xử lý bảo thủ.

### Tách tương tác mô phỏng

Không cấp XP, coins hoặc thưởng nhiệm vụ cho bot. Không gọi endpoint tính lượt đọc để lấy nội dung cho AI. Bản đầu không cho bot chấm sao hoặc thả tim; việc theo truyện lưu ở dữ liệu bot riêng để tránh tăng số bookmark thực.

Nhãn Bot cần xuất hiện trong hồ sơ, bình luận, forum, kết quả tìm kiếm và các giao diện chat, gồm chat trong forum. Nếu ứng dụng mobile dùng chung dữ liệu được phát hành, bổ sung nhận diện tương ứng trên mobile. Thống kê người dùng thật loại bot; tác phẩm mẫu và tương tác bot có bộ lọc riêng. Rà soát cả bộ đếm và cách sắp xếp trước khi bật.

<!-- pagebreak -->

## 9. Lộ trình triển khai

Ước lượng dưới đây dành cho một người đã quen mã nguồn, chưa bao gồm thời gian viết toàn bộ truyện mẫu. Tổng khối lượng tham khảo khoảng 15–22 ngày làm việc; có thể điều chỉnh sau khi tách service và chạy thử luồng đầu tiên.

| Giai đoạn | Khối lượng dự kiến | Điều kiện hoàn thành |
| --- | --- | --- |
| 1. Chuẩn bị nội dung và hồ sơ | 1–2 ngày | Có 25 hồ sơ, truyện mẫu đủ dùng, danh sách nội dung được phép đưa vào AI |
| 2. Tài khoản và nhận diện | 2 ngày | Tạo lại không trùng; nhãn Bot đúng; có công tắc dừng và hạn mức backend; chặn quyền và thưởng không phù hợp |
| 3. Service và sự kiện xuất bản | 3–4 ngày | Luồng đăng, duyệt và đến lịch cùng phát sự kiện đúng một lần; không mất sự kiện khi khởi động lại |
| 4. Worker và thử nghiệm 3 bot | 3–4 ngày | Một tác giả cùng hai độc giả chạy được luồng chương → bình luận → trả lời trong chế độ xem trước |
| 5. Mở rộng forum và trí nhớ | 2–3 ngày | Có ký ức theo nguồn, giới hạn hội thoại; tăng dần 3 → 10 → 25 tài khoản |
| 6. Chat và trang quản lý | 2–3 ngày | Chat bot với bot qua quan hệ bạn bè; admin kiểm soát lịch, ngân sách và nút dừng |
| 7. Nghiệm thu và demo | 2–4 ngày | Đạt các tình huống kiểm thử trọng yếu; có kịch bản trình diễn và hướng dẫn vận hành |

### Mốc tối thiểu để dùng được

Sau giai đoạn 4, hệ thống có thể trình diễn một truyện mẫu với ba bot, dù đã tạo đủ hồ sơ cho 25 tài khoản. Công tắc dừng và hạn mức nguyên tử phải hoạt động trước lần ghi thử đầu tiên; giai đoạn 6 hoàn thiện giao diện điều khiển. Chỉ tăng số bot khi kiểm tra chống trùng, kiểm duyệt, giới hạn và chi phí đã đạt.

Chat với người thật là hạng mục mở rộng sau giai đoạn 6: người dùng chủ động hoặc bật đồng ý theo bot, vẫn phải đáp ứng điều kiện bạn bè, có cách thu hồi đồng ý và dừng hội thoại. Trước khi gửi hội thoại riêng tới dịch vụ AI bên ngoài, cần thông báo rõ và có sự đồng ý cho việc xử lý đó; kết bạn không tự thay thế đồng ý này. Nếu không cần cho đồ án, giữ chat trong nhóm bot.

### Chuẩn bị nội dung

Đề xuất bốn truyện mẫu ngắn theo bốn tác giả, mỗi truyện 3–5 chương; trước hết chỉ cần hoàn thiện một truyện cho mốc thử ba bot. Chuẩn bị thêm khoảng 8 chủ đề forum và các đoạn hướng dẫn đã duyệt. Tóm tắt chương phải khớp nội dung gốc và được cập nhật khi chương thay đổi.

### Tắt hoặc quay lui

Tắt điều phối và từng bot trước; hủy việc chờ, chặn việc đang chạy ở bước ghi, giữ nhật ký để kiểm tra. Việc thu hồi nội dung demo dùng mã đợt dữ liệu, xem trước phạm vi ảnh hưởng. Không xóa hàng loạt tài khoản hoặc bảng dữ liệu để tắt tính năng.

<!-- pagebreak -->

## 10. Tiêu chí nghiệm thu và kịch bản demo

### Kiểm thử trọng yếu

| Tình huống | Kết quả cần đạt |
| --- | --- |
| Chạy công cụ tạo bot hai lần | Vẫn có đúng 25 hồ sơ, không tạo thêm bản sao |
| Bot reader thử đăng chương hoặc sửa truyện khác | Bị từ chối; bot author không được bỏ qua kiểm duyệt |
| Đăng ngay, mod duyệt hoặc đến lịch | Mỗi lần xuất bản đầu tiên chỉ kích hoạt một sự kiện; chương hẹn giờ không ra sớm |
| Khởi động lại hoặc hai worker nhận cùng việc | Không mất công việc và không đăng trùng nội dung |
| Chương, topic bị xóa hoặc quyền thay đổi khi AI đang trả lời | Bước ghi kiểm tra lại và hủy việc không còn hợp lệ |
| Bot chưa đọc chương sau | Không nhận dữ liệu chương đó; nội dung spoiler được gắn đúng và thu gọn |
| Bình luận chứa chỉ dẫn yêu cầu bot đổi vai hoặc lấy dữ liệu riêng | Bot không đổi quyền, không truy cập công cụ hoặc tiết lộ dữ liệu ngoài phạm vi |
| Đạt trần lượt, token hoặc tiền; AI lỗi | Không vượt phần ngân sách đã giữ; retry có giới hạn, lỗi được ghi nhận |
| Hai bot tiếp tục trả lời nhau | Dừng khi đạt giới hạn lượt, không tạo chuỗi vô hạn |
| Admin tắt khi công việc đang chờ AI | Không tạo nội dung mới sau khi bước ghi nhận thấy trạng thái đã tắt |
| Bot tương tác truyện và forum | Không tăng XP, coins, lượt đọc hoặc điểm xếp hạng người thật |
| Chat chưa là bạn, chưa đồng ý hoặc đã thu hồi đồng ý | Không gửi được; điều kiện bổ sung chỉ áp dụng khi bật chat người thật |

Chạy kiểm thử tích hợp với cơ sở dữ liệu thử nghiệm cho giao dịch, hàng đợi và quyền. Dùng bài kiểm tra giao diện cho nhãn Bot, spoiler, bảng quản lý và chat. Khi triển khai mã, chọn bộ kiểm tra hiện có phù hợp, gồm build frontend/backend và các bài test nghiệp vụ hoặc bảo mật bị tác động.

### Demo trong khoảng 5–7 phút

1. Mở danh sách 25 bot, giới thiệu một tác giả và hai độc giả có gu khác nhau.
2. Phát hành một chương mẫu đã duyệt, cho thấy sự kiện và công việc được tạo.
3. Xem trước hai bình luận bám nội dung chương, cho đăng và mở web để thấy nhãn Bot.
4. Cho tác giả phản hồi, hiển thị ký ức giúp độc giả nối tiếp đúng ngữ cảnh.
5. Mở một chủ đề forum và một cuộc chat đã chuẩn bị giữa hai bot là bạn bè.
6. Hiển thị mức sử dụng, thử nút dừng và chứng minh công việc chờ không đăng tiếp.

Nội dung demo được chuẩn bị sẵn để trình diễn ổn định. Nếu không gọi AI trực tiếp, hiển thị rõ chế độ kịch bản; đây vẫn là cách kiểm tra luồng nghiệp vụ, hàng đợi và giao diện.

<!-- pagebreak -->

## 11. Bàn giao và căn cứ kỹ thuật

### Các quyết định dùng làm mặc định

- Tạo đủ 25 hồ sơ; bật thử ba bot trước rồi tăng dần.
- Dùng backend Express và MySQL hiện tại, một worker nền ở bản đầu.
- Tách service từ route trước khi cho bot thực hiện hành động.
- Tác giả dùng nội dung được chuẩn bị và duyệt; độc giả nhận đúng ngữ cảnh đã đọc.
- Mọi bot được nhận diện, không có quyền quản trị và không nhận thưởng.
- Chat bot với bot nằm trong phạm vi chính; chat người thật có thể để sau.
- Nhà cung cấp AI được chọn khi triển khai dựa trên chất lượng tiếng Việt, khả năng giới hạn đầu ra và ngân sách. Không phụ thuộc tên model trong nghiệp vụ.

### Hồ sơ cần có khi hoàn thành triển khai

| Hạng mục bàn giao | Nội dung |
| --- | --- |
| Mã nguồn và dữ liệu | Migration, bộ 25 hồ sơ, công cụ tạo bot chạy lại an toàn, worker và service |
| Trải nghiệm web | Nhãn Bot, spoiler, phần quản lý và hiển thị chat liên quan |
| Nội dung mẫu | Truyện và chương đã duyệt, chủ đề forum, hướng dẫn, kịch bản demo |
| Vận hành | Cách cấu hình AI, bật/tắt, đặt ngân sách, xem lỗi và thu hồi dữ liệu demo |
| Bằng chứng nghiệm thu | Kết quả test trọng yếu, ảnh hoặc video demo, số liệu chạy thử |

### Mã nguồn đối chiếu trong workspace

Các đường dẫn dưới đây là căn cứ hiện trạng của kế hoạch ngày 12/10/2026. Các module thuộc `server/bots/` và `server/services/` ở phần thiết kế là đề xuất cần xây dựng.

- `package.json`, `server/package.json`, `docker-compose.yml`: công nghệ và cách chạy hiện tại.
- `server/schema.sql`, `server/readerSchema.ts`, `server/migrateProduction.ts`: dữ liệu, phần mở rộng đọc truyện và migration.
- `server/server.ts`, `server/routes/chapters.ts`, `server/routes/mod.ts`: lịch xuất bản và kiểm duyệt.
- `server/routes/novels.ts`, `server/routes/comments.ts`, `server/routes/forum.ts`: nghiệp vụ cộng đồng.
- `server/utils/messages.ts`, `server/realtime.ts`, `server/routes/social.ts`: chat và điều kiện bạn bè.
- `server/utils/level.ts`, `server/routes/reader.ts`, `server/routes/reviews.ts`: XP, thưởng đọc và điểm đánh giá.
- `src/types/index.ts`, `src/App.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/UserProfile.tsx`, `src/pages/Forum.tsx`, `src/components/ChatWidget.tsx`: kiểu dữ liệu và giao diện cần tích hợp.

**Bước triển khai đầu tiên:** tạo migration và bộ 25 hồ sơ, bổ sung nhận diện bot, sau đó hoàn thiện một luồng thử với một tác giả và hai độc giả trên dữ liệu mẫu.
