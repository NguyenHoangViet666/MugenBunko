import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mugenbunko',
};

const communityUsers = [
    { username: 'kaito_critic', displayname: 'Kaito Phê Bình', bio: 'Nhà phê bình Light Novel nghiệp dư, thích mổ xẻ world-building và hệ thống ma thuật.', avatar_seed: 'Felix', level: 5, xp: 85000, role: 'author' },
    { username: 'sakura_hime', displayname: 'Sakura Mộng Mơ', bio: 'Team sủng ngọt, đọc Romance & Slice of Life để chữa lành sau giờ làm.', avatar_seed: 'Aneka', level: 4, xp: 24000, role: 'reader' },
    { username: 'ren_isekai', displayname: 'Ren Dị Giới', bio: 'Đã đọc hơn 300 bộ Isekai từ Narou đến MugenBunko. Tín đồ của xe tải-kun.', avatar_seed: 'Easton', level: 5, xp: 120000, role: 'author' },
    { username: 'mio_art', displayname: 'Mio Họa Sĩ', bio: 'Illustrator chuyên vẽ bìa Light Novel và fanart nhân vật.', avatar_seed: 'Milo', level: 4, xp: 18500, role: 'author' },
    { username: 'sora_nightowl', displayname: 'Sora Cú Đêm', bio: 'Chỉ bắt đầu đọc truyện từ 11h đêm tới 4h sáng. Chuyên săn truyện mới.', avatar_seed: 'Sora', level: 3, xp: 6400, role: 'reader' },
    { username: 'yuki_tsundere', displayname: 'Yuki Băng Giá', bio: 'Không phải vì tôi thích đọc truyện của mấy người đâu nhé, chỉ là rảnh thôi!', avatar_seed: 'Yuki', level: 4, xp: 31000, role: 'reader' },
    { username: 'haru_sensei', displayname: 'Haru Biên Tập', bio: 'Chia sẻ kinh nghiệm viết lách, xây dựng cốt truyện và nhịp điệu chương.', avatar_seed: 'Haru', level: 6, xp: 680000, role: 'moderator' },
    { username: 'akira_mecha', displayname: 'Akira Cơ Khí', bio: 'Đam mê Sci-Fi, Mecha, Cyberpunk và những trận chiến chiến thuật đỉnh cao.', avatar_seed: 'Akira', level: 3, xp: 8900, role: 'author' },
    { username: 'luna_mystery', displayname: 'Luna Thám Tử', bio: 'Chuyên gia soi hint, đoán hung thủ và bóc tách plot twist ngay từ chương 3.', avatar_seed: 'Luna', level: 4, xp: 42000, role: 'reader' },
    { username: 'hinata_cooking', displayname: 'Hinata Quán Đêm', bio: 'Mê mẩn những bộ truyện ẩm thực dị giới. Đọc lúc nửa đêm làauto đói bụng.', avatar_seed: 'Hinata', level: 3, xp: 5200, role: 'reader' },
    { username: 'takahashi_ln', displayname: 'Takahashi Sưu Tầm', bio: 'Nhà sưu tầm Bunkobon chính hiệu, kệ sách ở nhà đã hơn 500 cuốn.', avatar_seed: 'Takahashi', level: 5, xp: 95000, role: 'reader' },
    { username: 'linh_wibu', displayname: 'Linh Trà Sữa', bio: 'Vừa uống hồng trà vừa cày truyện. Thích tám chuyện drama trong tiểu thuyết.', avatar_seed: 'Linh', level: 2, xp: 1800, role: 'reader' }
];

const fiftyForumPosts = [
    // --- ANNOUNCEMENT (4 bài) ---
    {
        category: 'announcement',
        title: '🌸 [Sự Kiện Lớn] Cuộc Thi Sáng Tác Light Novel Mùa Hoa Anh Đào - Tổng Giải Thưởng 50.000 Xu!',
        content: `Chào toàn thể các tác giả và độc giả thân yêu của **MugenBunko**!

Mùa xuân năm nay, Ban Quản Trị chính thức phát động cuộc thi sáng tác **MugenBunko Sakura Award** dành cho cả 2 hạng mục: *Truyện Dài Kỳ (Series)* và *Truyện Ngắn (Oneshot)*.

> "Mỗi trang viết là một thế giới mới đang chờ được đánh thức."

**Thể lệ tham gia tóm tắt:**
1. Tác phẩm đăng mới trên **Xưởng Truyện (Author Studio)** có gắn thẻ **#SakuraAward**.
2. Độ dài tối thiểu 3.000 từ đối với Oneshot và 10.000 từ (tối thiểu 5 chương) đối với Series.
3. Ban giám khảo cùng bình chọn của độc giả sẽ chấm điểm dựa trên cốt truyện, văn phong và mức độ đầu tư nhân vật.

Hãy cùng nhau tạo nên một mùa lễ hội văn học bùng nổ nhé! #ThongBao #SakuraAward #SangTac`,
        image_url: '/assets/covers/isekai_pen_1774857350177.png'
    },
    {
        category: 'announcement',
        title: '📢 Cập Nhật Hệ Thống Diễn Đàn MugenBunko Social 3.0 & Danh Hiệu Độc Giả Mới',
        content: `Xin chào cộng đồng **MugenBunko**!

Hôm nay đội ngũ phát triển vừa hoàn tất nâng cấp giao diện **Mạng Xã Hội MugenBunko Social 3.0** với hàng loạt cải tiến trực quan:
- **Bảng tin 3 cột chuẩn mạng xã hội**: Điều hướng kênh chủ đề bên trái, luồng thảo luận trung tâm và bảng xu hướng bên phải.
- **Tương tác nhanh**: Thả tim, lưu bài viết yêu thích, ẩn/hiện cảnh báo Spoiler và xem trước bình luận nổi bật ngay trên bảng tin.
- **Tích điểm XP khi thảo luận**: Mỗi bài viết chất lượng sẽ nhận ngay **+15 XP** để thăng cấp từ *Tập Sự* lên tới *SSR Huyền Thoại*!

Chúc mọi người có những giờ phút giao lưu thật vui vẻ! #ThongBao #MugenBunko`,
        image_url: null
    },
    {
        category: 'announcement',
        title: '🏆 Vinh Danh Top 5 Tác Phẩm Được Độc Giả Cày Cuốc Nhiều Nhất Tháng Này',
        content: `Cảm ơn sự ủng hộ nhiệt tình của hàng ngàn độc giả trên **MugenBunko** trong suốt tháng vừa qua! Dưới đây là 5 bộ Light Novel đạt kỷ lục lượt đọc và đánh giá cao nhất:

1. **Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không** – Bản giao hưởng ẩm thực chữa lành tâm hồn.
2. **Tôi Có Thể Nghe Thấy Tiếng Lòng Của Nữ Hoàng Băng Giá** – Đỉnh cao Tsundere ngọt sâu răng.
3. **Bị Đuổi Khỏi Tổ Đội Dũng Sĩ, Tôi Mở Tiệm Cà Phê Hầu Gái Ở Ma Giới** – Hài hước, ấm áp và đầy bất ngờ.
4. **Chế Tạo Robot Chiến Đấu Ở Dị Giới Bằng Phép Thuật Cổ Đại** – Sự kết hợp hoàn hảo giữa Mecha và Cổ ngữ.
5. **Chuyển Sinh Thành Cây Bút Bi Của Nữ Thần Minh Họa** – Ý tưởng độc lạ có một không hai!

Bộ truyện yêu thích của bạn đã lọt Top chưa? Hãy để lại bình luận cổ vũ tác giả nhé! #ReviewTruyen #BangXepHang`,
        image_url: '/assets/covers/midnight_diner_1774858389281.png'
    },
    {
        category: 'announcement',
        title: '🛡️ Quy Chuẩn Gắn Nhãn [Spoil] & Văn Hóa Thảo Luận Văn Minh Tại MugenBunko',
        content: `Để bảo vệ trải nghiệm đọc truyện trọn vẹn cho tất cả thành viên mới, Ban Điều Phối nhắc lại một số lưu ý nhỏ khi đăng bài thảo luận tình tiết:

- Luôn chọn đúng chuyên mục **Spoil tình tiết** nếu bài viết của bạn tiết lộ các nút thắt quan trọng (Plot Twist, danh tính trùm cuối, kết thúc của tập truyện).
- Tránh đặt tiêu đề làm lộ trực tiếp tình tiết quan trọng (ví dụ: thay vì viết rõ tên nhân vật phản bội, hãy đặt *"Bàn về cú twist ở cuối Chương 5 bộ [Tên Truyện]"*).
- Tôn trọng sở thích (gu đọc truyện) của nhau, góp ý văn minh để các tác giả ngày càng hoàn thiện ngòi bút! #ThongBao #QuyTac`,
        image_url: null
    },

    // --- REVIEW (11 bài) ---
    {
        category: 'review',
        title: '[Review 9.5/10] "Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không" - Đọc lúc 1h sáng và cái kết phải đi úp mì tôm!',
        content: `Thật sự khuyên anh em **đừng bao giờ đọc bộ này lúc nửa đêm khi bụng đang đói**!

Mình tình cờ bấm vào đọc thử vì thích thể loại *Slice of Life* nhẹ nhàng, ai ngờ cuốn một mạch hết sạch các chương luôn. Bối cảnh quán ăn nhỏ nằm giữa ranh giới các chiều không gian được tác giả miêu tả cực kỳ có hồn: tiếng mỡ xèo xèo trên chảo gang, mùi nước dùng dashi bốc khói nghi ngút, và những vị khách mang đầy vết sẹo tâm hồn.

> "Một bát cơm rang trứng nóng hổi đôi khi còn mạnh hơn cả phép thuật hồi phục cấp cao nhất."

**Điểm cộng:**
- Văn phong ấm áp, tinh tế, đậm chất văn học Nhật Bản (*Isekai Izakaya / Midnight Diner*).
- Mỗi chương là một câu chuyện đời thường độc lập nhưng có sợi dây liên kết khéo léo.

**Chấm điểm:** **9.5/10** – Tuyệt phẩm chữa lành đáng đọc nhất trên MugenBunko hiện tại! #ReviewTruyen #SliceOfLife #Isekai`,
        image_url: '/assets/covers/midnight_diner_1774858389281.png'
    },
    {
        category: 'review',
        title: '[Review] "Tôi Có Thể Nghe Thấy Tiếng Lòng Của Nữ Hoàng Băng Giá" - Khi Tsundere gặp đúng khắc tinh đọc tâm!',
        content: `Ai là fan cứng của dòng **Rom-Com ngọt sún răng** thì bơi hết vào đây!

Thiết lập nhân vật Đệ nhất Hoàng nữ bên ngoài thì lạnh lùng sắc đá, rút kiếm đòi chém người mà trong đầu thì đang gào thét *"Trời ơi hôm nay tóc anh ấy hơi rối nhìn cưng xỉu!!"* thực sự làm mình cười nội thương từ chương 1.

Điểm mình đánh giá cao nhất là nam chính không hề bị đần độn (dense) như nhiều bộ Rom-Com cũ. Nhờ nghe được tiếng lòng nên cậu ấy luôn tinh tế chiều chuộng nữ chính theo cách khiến cổ vừa ngượng chín mặt vừa không thể giữ nổi vẻ mặt băng giá.

**Đánh giá tổng quan:**
- **Cốt truyện:** 8.5/10
- **Độ ngọt (Sugar level):** 100/10 (cẩn thận tiểu đường)
- **Tương tác nhân vật:** 9.5/10 #ReviewTruyen #Romance #Isekai`,
        image_url: '/assets/covers/ice_queen_1774857802837.png'
    },
    {
        category: 'review',
        title: '[Đánh Giá Chi Tiết] "Bị Đuổi Khỏi Tổ Đội Dũng Sĩ, Tôi Mở Tiệm Cà Phê Hầu Gái Ở Ma Giới" - Hài hước nhưng không hề nhảm!',
        content: `Ban đầu nhìn cái tên dài ngoằng chuẩn trend Light Novel mình cứ tưởng đây chỉ là một bộ mì ăn liền giải trí đơn thuần. Nhưng đọc rồi mới thấy tác giả xây dựng thế giới Ma Giới cực kỳ thú vị!

Thay vì đi theo lối mòn trả thù tổ đội dũng sĩ cũ một cách cay cú, nam chính chọn cách buông bỏ quá khứ và dùng kỹ năng nấu nướng + quản lý hậu cần đỉnh cao của mình để xây dựng một quán cà phê ấm cúng giữa lòng Ma đô. Cách các tướng quân Ác Ma và cả Ma Vương dần trở thành khách quen, thậm chí xin làm nhân viên phục vụ tạo nên những màn tấu hài duyên dáng cực kỳ.

Một bộ truyện xả stress hoàn hảo sau ngày dài mệt mỏi! #ReviewTruyen #Fantasy #Comedy`,
        image_url: '/assets/covers/maid_cafe_1774857517992.png'
    },
    {
        category: 'review',
        title: '[Review] "Chế Tạo Robot Chiến Đấu Ở Dị Giới Bằng Phép Thuật Cổ Đại" - Làn gió mới cho anh em mê Mecha + Ma Pháp!',
        content: `Giữa một rừng truyện chuyển sinh làm kiếm sĩ hay pháp sư toàn năng, bộ này chọn một hướng đi cực kỳ kỹ thuật: **Kỹ sư cơ khí kết hợp Cổ ngữ học (Runes)**!

Tác giả mô tả quá trình thiết kế lò phản ứng mana, hệ thống truyền động cơ học và khung xương hợp kim Mithril chi tiết đến mức dân kỹ thuật như mình đọc mà nổi da gà. Các trận chiến không hề có chuyện "auto thắng nhờ hào quang nhân vật chính" mà phải tính toán năng lượng, địa hình và nhiệt độ lõi ma pháp.

Nếu bạn thích *Knight's & Magic* hay *86 - Eighty Six*, chắc chắn không thể bỏ qua siêu phẩm này trên MugenBunko! #ReviewTruyen #SciFi #Isekai`,
        image_url: '/assets/covers/mecha_magic_1774858262739.png'
    },
    {
        category: 'review',
        title: '[Cảm Nhận] "Cuộc Sống Thường Nhật Hạnh Phúc Của Bán Yêu Ở Vùng Biên Ải" - Bình yên như một tách trà chiều',
        content: `Không có những màn đánh boss long trời lở đất, cũng chẳng có âm mưu hoàng cung phức tạp, bộ truyện này giống như một bức tranh màu nước dịu dàng về vùng thung lũng biên cương ngập tràn hoa anh đào.

Mình đặc biệt xúc động ở phân đoạn cựu chiến binh loài người dạy cô bé bán yêu cách trồng lúa mì và nướng bánh mì thảo mộc. Hai con người từng chịu nhiều tổn thương bởi định kiến và chiến tranh, nay tìm thấy bình yên bên hiên nhà gỗ nhỏ.

Văn phong của tác giả **Daisy Thảo Nguyên** thực sự rất giàu chất thơ. Rất khuyến khích đọc cùng một bản nhạc Acoustic nhẹ nhàng! #ReviewTruyen #SliceOfLife #Romance`,
        image_url: '/assets/covers/half_demon_1774857690001.png'
    },
    {
        category: 'review',
        title: '[Review Nhanh] Top 3 bộ Oneshot lấy đi nhiều nước mắt nhất trên MugenBunko tuần qua',
        content: `Cuối tuần vừa rồi mình dành trọn buổi chiều để cày hết danh mục **Truyện Ngắn Oneshot** trên web và thực sự bất ngờ với chất lượng của các cây bút Việt:

1. **Chuyến Tàu Đêm Đi Về Phía Tinh Vân**: Chỉ vỏn vẹn một chương nhưng khắc họa nỗi cô đơn và hy vọng của hai hành khách cuối cùng trên chuyến tàu xuyên không gian cực kỳ sâu sắc.
2. **Bức Thư Gửi Từ Mùa Hạ Năm Ấy**: Câu chuyện thanh xuân vườn trường nhẹ nhàng mà day dứt ở cú lật cuối bài.
3. **Người Giữ Đồng Hồ Ở Thành Phố Sương Mù**: Bối cảnh Steampunk pha lẫn triết lý về thời gian và ký ức.

Anh em nào ít thời gian cày bộ dài thì nhất định phải ghé mục Oneshot nhé! #ReviewTruyen #Oneshot`,
        image_url: null
    },
    {
        category: 'review',
        title: '[Phân Tích] Tại sao "Chuyển Sinh Thành Cây Bút Bi Của Nữ Thần Minh Họa" lại cuốn đến vậy?',
        content: `Nghe tên thì tưởng vô tri (chuyển sinh thành cây bút bi?!), nhưng cách tác giả **Alice Wonderland** triển khai hệ thống sức mạnh dựa trên **"Hội họa hiện thực hóa"** lại thông minh bất ngờ.

- Cây bút bi cần "mực ma lực" và cảm xúc nghệ thuật của Nữ thần mới có thể vẽ ra vật thể sống.
- Sự tung hứng giữa một anh chàng lập trình viên thực dụng (bị nhốt trong thân xác cây bút) và một cô nàng Nữ thần não cá vàng, hay trễ deadline tạo nên phản ứng hóa học cực đỉnh.

Một bộ Isekai sáng tạo bậc nhất mà mình từng đọc năm nay! **9/10**! #ReviewTruyen #Isekai #Fantasy`,
        image_url: '/assets/covers/isekai_pen_1774857350177.png'
    },
    {
        category: 'review',
        title: '[Review] "Sau Khi Hẹn Hò Với Nữ Thần Khoa Học Viễn Tưởng Của Lớp" - Sự pha trộn điên rồ giữa Haruhi và Steins;Gate!',
        content: `Một bộ Rom-Com học đường nhưng mở đầu bằng... nguy cơ sụp đổ không-thời gian do hố đen lượng tử trong phòng CLB Vật Lý!

Nữ chính thuộc kiểu thiên tài lập dị (Mad Scientist), nói chuyện toàn thuật ngữ vật lý thiên văn nhưng lại hoàn toàn mù tịt về cảm xúc yêu đương. Nam chính phải đóng vai "người giữ chốt an toàn cho Trái Đất" bằng cách... nắm tay và đi trà sữa với cổ mỗi chiều thứ Sáu.

Vừa hài vừa có những khoảnh khắc lãng mạn dưới bầu trời sao cực kỳ điện ảnh. Đề cử mạnh cho anh em! #ReviewTruyen #SciFi #Romance`,
        image_url: '/assets/covers/scifi_goddess_1774857600720.png'
    },
    {
        category: 'review',
        title: '[Góc Phê Bình] So sánh nhịp độ (Pacing) giữa dòng Light Novel truyền thống và Web Novel hiện đại',
        content: `Dạo gần đây đọc nhiều tác phẩm trên **MugenBunko**, mình nhận thấy một sự giao thoa rất thú vị giữa hai trường phái:

1. **Web Novel hiện đại**: Nhập cuộc cực nhanh ngay từ 500 chữ đầu tiên, kết chương luôn có *Cliffhanger* gây tò mò, rất hợp đọc trên điện thoại.
2. **Light Novel truyền thống (Bunko)**: Chú trọng xây dựng bầu không khí (*Atmosphere*), miêu tả tâm lý nhân vật và cài cắm *Foreshadowing* để bùng nổ ở hồi kết của cả Volume.

Điều tuyệt vời là nhiều tác giả trên MugenBunko đang kết hợp được cả hai: mở đầu lôi cuốn nhưng câu chữ vẫn trau chuốt, giàu hình ảnh. Mọi người thích phong cách nào hơn? #ReviewTruyen #ThaoLuan`,
        image_url: null
    },
    {
        category: 'review',
        title: '[Review] "Lớp Học Ma Thuật Toàn Nữ Nhưng Tôi Lại Là Giáo Viên Nam Duy Nhất" - Không chỉ có Harem mà còn rất tâm huyết nghề giáo!',
        content: `Nhiều người nhìn tiêu đề sẽ nghĩ ngay tới mấy bộ fan-service sáo rỗng, nhưng đọc kỹ mới thấy nam chính thực sự là một **người thầy có tâm và có tầm**.

Thay vì khoe phép thuật bá đạo để lấy le, thầy giáo dùng phương pháp sư phạm khoa học để giúp từng học sinh vượt qua rào cản tâm lý: giúp cô công chúa kiêu ngạo học cách phối hợp đồng đội, giúp cô bé pháp sư nhút nhát kiểm soát ma lực bộc phát.

Đọc rất ấm lòng và truyền cảm hứng, gợi nhớ tới *Rokudenashi Majutsu Koushi (Akashic Records)*! #ReviewTruyen #Fantasy`,
        image_url: '/assets/covers/magic_class_1774858017254.png'
    },
    {
        category: 'review',
        title: '[Review] "Bạn Gái Thuở Nhỏ Của Tôi Thực Chất Là Trùm Cuối Của Game Online?" - Khi nóc nhà vừa là thanh mai trúc mã vừa là Boss cuối!',
        content: `Anh em game thủ đọc bộ này chắc chắn sẽ thấy cực kỳ đồng cảm!

Cảm giác ban ngày thì sang nhà gọi cô bạn thanh mai trúc mã dậy đi học, tối về đăng nhập vào VRMMO lại bị chính cô ấy (trong hình dạng Nữ Vương Ác Ma cấp 999) hành cho lên bờ xuống ruộng. Những màn đấu trí giấu thân phận vừa kịch tính vừa dở khóc dở cười.

Điểm cộng lớn là hệ thống kỹ năng và cơ chế Raid Boss trong game được tác giả miêu tả rất hợp lý, không bị buff lố. Chấm **8.8/10**! #ReviewTruyen #Romance #SciFi`,
        image_url: '/assets/covers/childhood_boss_1774858134315.png'
    },

    // --- GENERAL DISCUSSION (13 bài) ---
    {
        category: 'general',
        title: 'Thói quen đọc Light Novel của anh em là gì? Team Washi Sáng, Sepia Cổ Điển hay Charcoal Ban Đêm?',
        content: `Mình cực thích tính năng đổi giao diện nền đọc trên **MugenBunko**!

- Ban ngày ngồi quán cà phê thì mình để **Washi (Giấy gạo sáng)** nhìn thanh lịch như sách in thật.
- Chiều tối chuyển sang **Sepia (Giấy cổ điển)** cho dịu mắt.
- Còn sau 11h đêm trùm chăn đọc truyện thì chắc chắn phải bật **Charcoal (Than củi tối)** kết hợp cỡ chữ ` + '`18px`' + ` và font *Noto Serif*.

Anh em trong cộng đồng hay để combo giao diện + font chữ nào nhất khi cày truyện? Chia sẻ bên dưới nhé! #ThaoLuan #MugenBunko`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Theo mọi người, điều gì tạo nên một nhân vật chính (Main) được yêu thích bền vững trong Light Novel?',
        content: `Mình từng đọc hàng trăm bộ LN từ thời *Sword Art Online*, *Oregairu*, *Re:Zero* cho tới các tác phẩm sáng tác mới trên MugenBunko.

Mình nhận ra những nam/nữ chính sống mãi trong lòng độc giả thường không phải là người mạnh nhất ngay từ đầu, mà là người có:
1. **Triết lý sống hoặc mục tiêu rõ ràng** (dù đôi khi hơi lập dị như Hachiman hay thực tế như Kazuma).
2. **Biết trưởng thành qua biến cố** thay vì mọi thứ đều được dâng sẵn.
3. **Có điểm yếu rất "con người"** để độc giả đồng cảm.

Theo anh em, kiểu Main nào hiện nay đang được ưa chuộng nhất? Bá đạo ngầm, thông minh thực dụng hay hiền lành chữa lành? #ThaoLuan #Isekai`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Tổng hợp Playlist nhạc không lời (BGM) cực chill để vừa nghe vừa đọc Light Novel theo từng thể loại!',
        content: `Đọc truyện mà có thêm đúng bản nhạc nền (BGM) thì cảm xúc nhân lên gấp 10 lần luôn anh em ạ! Mình xin chia sẻ bộ playlist ruột của mình:

- **Khi đọc Fantasy / Isekai phiêu lưu**: OST của *Frieren (Sousou no Frieren)* và *Made in Abyss* – cảm giác kỳ vĩ, cổ kính cực kỳ.
- **Khi đọc Romance / Học đường**: Piano OST của *Your Name*, *Weathering With You* hoặc Lo-fi Chillhop mưa rơi.
- **Khi đọc Mystery / Trinh thám / Đấu trí**: OST của *Death Note*, *Monster* hoặc nhạc Cello trầm tối.
- **Khi đọc Slice of Life / Ẩm thực**: Nhạc Jazz quán cà phê Tokyo đêm mưa.

Mọi người có hay vừa nghe nhạc vừa đọc truyện không hay thích không gian tĩnh lặng tuyệt đối? #ThaoLuan #Romance #Fantasy`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Bàn về trào lưu "Tên truyện dài như một đoạn tóm tắt" của Light Novel Nhật Bản',
        content: `Chắc hẳn ai mới bước chân vào thế giới Light Novel cũng từng thắc mắc: *"Sao tên truyện gì mà dài tới hai dòng thế này?!"*

Thực ra nguồn gốc của nó bắt đầu từ các trang web đăng tiểu thuyết trực tuyến (như *Shousetsuka ni Narou*). Vì có hàng chục ngàn tác phẩm hiển thị dưới dạng danh sách tiêu đề, người đọc thường không bấm vào xem phần giới thiệu nếu tiêu đề không nói rõ ngay **thiết lập cốt lõi (Hook)** của bộ truyện!

Cá nhân mình thấy tên dài cũng có cái hay riêng, chỉ cần nhìn lướt qua là biết ngay truyện thuộc gu mình không. Còn anh em thích tên truyện ngắn gọn hàm súc (như *86*, *Overlord*) hay tên dài mô tả hết cốt truyện? #ThaoLuan #Isekai`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Team Tsundere, Kuudere, Dandere hay Yandere? Đâu mới là chân ái của cộng đồng MugenBunko?',
        content: `Mở cuộc khảo sát lớn nhất tuần cho anh em trong diễn đàn đây!!

- **Tsundere**: Ngoài lạnh trong nóng, miệng thì mắng mà tay thì đan khăn len cho người ta (đại diện: Nữ Hoàng Băng Giá).
- **Kuudere**: Trầm tĩnh, ít biểu cảm nhưng một khi đã mở lòng thì cực kỳ chung thủy và đáng tin cậy.
- **Dandere**: Nhút nhát, hay đỏ mặt nấp sau lưng nhưng lúc nguy cấp lại dũng cảm bất ngờ.
- **Genki / Deredere**: Luôn tràn đầy năng lượng tích cực như ánh mặt trời.

Comment ngay hệ tư tưởng của bạn bên dưới để tìm đồng môn nào! #ThaoLuan #Romance`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Cảm giác tuyệt vời nhất của một độc giả là khi phát hiện ra một "Viên Ngọc Thô" mới chỉ có vài chương!',
        content: `Hôm qua mình dùng tính năng **Tân Binh Tiềm Năng** và nút **Gacha Ngẫu Nhiên** trên MugenBunko, vô tình bấm trúng một bộ truyện mới đăng được 3 chương mà văn phong cuốn kinh khủng!

Cảm giác mình là một trong những độc giả đầu tiên để lại bình luận cổ vũ, bấm Lưu vào Tủ sách và chứng kiến bộ truyện đó dần leo lên Bảng Xếp Hạng Thịnh Hành thực sự rất tự hào luôn.

Anh em đừng chỉ đọc mỗi Top 5 nhé, hãy thử lượn qua khu vực **Mới Nhất** để tiếp lửa cho các tác giả mới! #ThaoLuan #ReviewTruyen`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Nếu được chuyển sinh vào thế giới của bộ Light Novel bạn đọc gần đây nhất, bạn sẽ sống sót được bao lâu?',
        content: `Hãy nhìn lại bộ truyện cuối cùng trong mục **Tiếp Tục Đọc** của bạn ngay lúc này!

- Nếu là bộ *Quán Ăn Khuya* hay *Tiệm Cà Phê Hầu Gái*: Xin chúc mừng, bạn có một cuộc sống bình yên, ngày ngày thưởng thức đồ ăn ngon!
- Nếu là bộ *Chế Tạo Robot Chiến Đấu* hay *Thế Giới Hậu Tận Thế*: Không có kỹ năng cơ khí hay ma pháp cấp cao thì chắc mình xin phép làm NPC bán táo ở làng tân thủ thôi chứ ra khỏi cổng thành là đăng xuất ngay lập tức 😂

Bộ truyện gần nhất của bạn là gì và tỷ lệ sống sót của bạn là bao nhiêu %? #ThaoLuan #Isekai`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Góc dành cho các Tác Giả: Mọi người thường vượt qua trạng thái "Bí ý tưởng (Writer\'s Block)" như thế nào?',
        content: `Mình đang viết tới chương 8 của bộ truyện đầu tay trên **Xưởng Truyện MugenBunko**, đại cương đã lên sẵn rồi nhưng tự nhiên ngồi trước màn hình 2 tiếng đồng hồ chỉ gõ được đúng 3 dòng rồi lại xóa...

Các tiền bối tác giả trên diễn đàn mình khi bị chững nhịp viết thường làm gì để lấy lại cảm hứng ạ?
- Đi dạo nghe nhạc không lời?
- Đọc lại các bộ truyện yêu thích để lấy mood?
- Hay cứ viết nháp bất chấp rồi biên tập lại sau?

Rất mong nhận được chia sẻ từ hội đồng bút! #ThaoLuan #HoiDap`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Tại sao thể loại "Điền văn / Chữa lành ở Dị giới (Slow-life Isekai)" ngày càng được yêu thích?',
        content: `Trước đây khi nhắc tới Isekai hay Fantasy, người ta thường nghĩ ngay tới việc đánh bại Ma Vương, chinh phục hầm ngục đẫm máu. Nhưng vài năm trở lại đây, những bộ truyện về:
- Mở quán ăn, tiệm thuốc, tiệm cà phê ở vùng biên ải
- Làm nông, thuần hóa thú cưng ma thuật, xây dựng thị trấn yên bình

lại chiếm sóng mạnh mẽ. Có lẽ vì cuộc sống hiện đại ngoài đời đã đủ áp lực và deadline rồi, nên khi mở trang sách ra, người đọc muốn tìm một nơi trú ẩn ấm áp, nhẹ nhàng cho tâm hồn.

Mọi người có đồng ý với góc nhìn này không? #ThaoLuan #SliceOfLife #Isekai`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Thảo luận về Nghệ Thuật Đặt Tên Chiêu Thức & Ma Pháp trong Tiểu Thuyết Giả Tưởng',
        content: `Một trong những thứ làm nên độ "ngầu" của dòng Fantasy/Action chính là **hệ thống tên ma pháp và kỹ năng**!

Mình thấy có 3 phong cách phổ biến:
1. **Hán Việt cổ điển**: *Tinh Hà Đoạn Ảnh Kiếm*, *Băng Phong Vĩnh Cửu* – nghe rất uy lực và trang trọng.
2. **Tiếng Anh / Latinh kết hợp**: * Astral Requiem*, *Absolute Zero* – mang âm hưởng JRPG hiện đại.
3. **Thuần Việt giàu hình ảnh**: *Lời Thì Thầm Của Mùa Đông*, *Nhát Chém Chia Cắt Bình Minh*.

Khi đọc truyện sáng tác Việt, anh em thích tác giả đặt tên chiêu thức theo phong cách nào nhất? #ThaoLuan #Fantasy`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Tầm quan trọng của Ảnh Bìa (Cover Art) khi quyết định bấm vào đọc một bộ Light Novel mới',
        content: `Người ta hay nói *"Đừng đánh giá một cuốn sách qua trang bìa"*, nhưng với văn hóa Light Novel thì trang bìa chính là linh hồn đầu tiên chạm tới mắt độc giả!

Một tấm bìa có bố cục màu sắc hài hòa, biểu cảm nhân vật có thần thái và typography rõ ràng luôn khiến mình muốn bấm vào nút **Đọc ngay** lập tức. Gần đây mình thấy các bộ truyện trên MugenBunko có bộ ảnh bìa đồng bộ đẹp xuất sắc, nhìn trên giao diện Bento 5 cột hay trên ứng dụng Mobile đều cực kỳ sang.

Với bạn, ảnh bìa chiếm bao nhiêu % quyết định bấm vào đọc thử một bộ truyện mới? #ThaoLuan #ReviewTruyen`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Bàn về vai trò của Nhân Vật Phụ (Side Characters) - Khi nhân vật phụ còn chiếm spotlight hơn cả Main!',
        content: `Có bao giờ anh em đọc một bộ truyện mà chỉ hóng tới cảnh nhân vật phụ xuất hiện chưa?

Một thế giới tiểu thuyết sống động là nơi các nhân vật phụ không chỉ tồn tại để "làm nền và trầm trồ khen nhân vật chính", mà họ cũng có câu chuyện riêng, lý tưởng riêng và những khoảnh khắc tỏa sáng rực rỡ. Nhiều khi chính tình bạn hoặc sự hy sinh của nhân vật phụ mới là thứ lấy đi nhiều nước mắt nhất của người đọc!

Đâu là nhân vật phụ để lại ấn tượng sâu đậm nhất với bạn trên MugenBunko? #ThaoLuan`,
        image_url: null
    },
    {
        category: 'general',
        title: 'Đọc truyện trên Web Máy Tính vs Đọc trên App Mobile MugenBunko: Bạn thuộc team nào?',
        content: `Mình dùng song song cả 2 nền tảng và thấy mỗi bên có một cái sướng riêng:

- **Trên Máy Tính (Web)**: Màn hình rộng xem Hero Banner điện ảnh, lướt bảng xếp hạng, vừa đọc vừa mở Diễn đàn chém gió hoặc viết truyện trên Studio cực kỳ tiện.
- **Trên Điện Thoại (App Mobile)**: Nằm dài trên sofa lướt các thẻ Bento, bật chế độ đọc chương vuốt mượt mà, lại còn đồng bộ tiến độ đọc tức thì với bản Web!

Nhờ tính năng đồng bộ tiến độ đọc nên đang đọc dở Chương 3 trên máy tính, cầm điện thoại lên bấm **Tiếp tục đọc** là vào đúng đoạn đang xem luôn! #ThaoLuan #MugenBunko`,
        image_url: null
    },

    // --- SPOIL (8 bài) ---
    {
        category: 'spoil',
        title: '⚠️ [Spoil Nhẹ] Giải mã danh tính thật sự của vị khách mặc áo choàng đen ở cuối Chương 2 bộ "Quán Ăn Khuya"',
        content: `Cảnh báo trước cho anh em nào chưa đọc tới cuối Chương 2 của **Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không** nhé!

Ở đoạn cuối chương, khi đồng hồ điểm 3 giờ sáng và cánh cửa gỗ phát ra tiếng chuông bạc khác thường, vị khách bước vào gọi một phần *"Súp miso cá hồi theo công thức của hoàng gia cũ"*.

Nếu để ý kỹ chi tiết chiếc nhẫn gia huy bị nứt trên ngón tay trỏ của ông ta, kết hợp với lời kể của cô hầu bàn ở Chương 1, khả năng tới 99% ông ta chính là **Vị Quốc Vương mất tích cách đây 20 năm** của Vương quốc Phương Bắc! Không ngờ một bộ truyện ẩm thực lại cài cắm đường dây lịch sử tinh tế đến vậy! #SpoilMoi #Isekai`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Giả Thuyết & Spoil] Liệu "Nữ Hoàng Băng Giá" có biết nam chính nghe được tiếng lòng của mình không?',
        content: `Mình vừa đọc đi đọc lại Chương 2 của bộ **Tôi Có Thể Nghe Thấy Tiếng Lòng Của Nữ Hoàng Băng Giá** và phát hiện ra một chi tiết cực kỳ đáng ngờ!

Ở cảnh trong thư viện hoàng gia, khi nam chính vừa định đưa chiếc khăn tay ra trước cả khi công chúa kịp hắt xì, công chúa đã khựng lại một nhịp và suy nghĩ trong đầu đột nhiên chuyển sang... hát nhẩm một bài đồng dao cổ!

> Phải chăng cổ đã bắt đầu nghi ngờ năng lực thấu tâm của nam chính và đang cố tình thử lòng cậu ấy?!

Nếu đúng như vậy thì những chương tới sẽ là màn đấu trí tình cảm cực kỳ cao tay giữa hai người! #SpoilMoi #Romance`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil] Phân tích sức mạnh thật sự của "Cây Bút Bi Thần Kỳ" - Không chỉ vẽ ra đồ vật vô tri!',
        content: `Ban đầu chúng ta đều nghĩ nam chính trong **Chuyển Sinh Thành Cây Bút Bi Của Nữ Thần Minh Họa** chỉ có thể hiện thực hóa các vật dụng như kiếm, khiên hay thức ăn.

Nhưng ở cuối chương mới nhất, khi Nữ thần vô tình nhỏ một giọt nước mắt lên trang giấy vẽ dở, nét mực của nam chính đã phát sáng màu vàng kim và **tạo ra một sinh linh có ý thức riêng**!

Điều này chứng tỏ giới hạn của cây bút không nằm ở lượng mực, mà nằm ở **Sự Đồng Điệu Linh Hồn** giữa người cầm bút và linh hồn bên trong cây bút. Dự đoán vài tập nữa khi đối đầu với Thần Hủy Diệt, hai người sẽ vẽ ra cả một vương quốc mới luôn! #SpoilMoi #Fantasy`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil Tình Tiết] Thân phận thật của cô hầu gái tóc bạc mới xin vào làm tại "Tiệm Cà Phê Hầu Gái Ở Ma Giới"',
        content: `Anh em có để ý cô bé hầu gái mới xin vào làm ca tối có đôi sừng nhỏ giấu dưới băng đô ren trắng không?

Khi tên đội trưởng kỵ sĩ loài người định tới quán gây sự, chỉ một cái liếc mắt của cô bé đó đã khiến thanh thánh kiếm của hắn tự động đóng băng hoàn toàn! Trong toàn bộ Ma Giới được mô tả ở Chương 1, người duy nhất sở hữu **Huyết Mạch Băng Ma Tối Cổ** chỉ có thể là **Ma Vương Đời Thứ 13** đang giả dạng đi vi hành mà thôi!

Tội nghiệp anh chủ quán vẫn hồn nhiên bắt Ma Vương đi lau bàn với bưng trà sữa mỗi ngày 😂 #SpoilMoi #Fantasy`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil] Bàn về lõi năng lượng Vĩnh Cửu trong "Chế Tạo Robot Chiến Đấu Ở Dị Giới"',
        content: `Trong chương mới nhất của **Chế Tạo Robot Chiến Đấu Ở Dị Giới Bằng Phép Thuật Cổ Đại**, bản thiết kế *Mecha Mk-II* đã lộ diện.

Điểm mấu chốt khiến cỗ máy này vượt qua giới hạn ma pháp của các pháp sư hoàng gia là việc nam chính không dùng đá ma thuật thô, mà khắc **Mạch Phản Hồi Kép (Dual-Loop Rune)** mô phỏng động cơ đốt trong kết hợp tua-bin hơi nước.

Tuy nhiên, đoạn cuối chương có cảnh báo về việc lõi cổ ngữ cổ đại bắt đầu cộng hưởng với di tích dưới lòng đất. Rất có thể nền văn minh cổ đại ở dị giới thực chất là một thuộc địa không gian bị lãng quên! #SpoilMoi #SciFi`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil & Thảo Luận] Cú twist về nguồn gốc của "Hố Đen Nhân Tạo" trong bộ Nữ Thần Khoa Học Viễn Tưởng',
        content: `Đọc kỹ lời thoại của nữ chính ở cuối Chương 2 bộ **Sau Khi Hẹn Hò Với Nữ Thần Khoa Học Viễn Tưởng Của Lớp**, mình chợt nhận ra một sự thật gây sốc:

Thực ra chẳng có hố đen hủy diệt thế giới nào do lỗi thí nghiệm cả! Ở dòng thời gian gốc 300 năm sau, nam chính vì một tai nạn mà qua đời sớm, nên phiên bản tương lai của cô ấy đã gửi ký ức và thiết bị lượng tử về quá khứ với cái cớ *"hẹn hò để nạp năng lượng ngăn chặn hố đen"* chỉ để... **giữ cậu ấy ở bên cạnh mình và thay đổi định mệnh**!

Vừa hài vừa cảm động muốn xỉu luôn anh em ơi! #SpoilMoi #Romance #SciFi`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil] Chi tiết ẩn (Easter Egg) kết nối vũ trụ giữa các bộ truyện trên MugenBunko!',
        content: `Không biết có ai tinh ý phát hiện ra giống mình không:
- Trong bộ **Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không**, trên tường quán có treo một bức tranh phong cảnh phát sáng lấp lánh được ký tên bởi *"Nữ Thần Ruran"*.
- Mà *Nữ Thần Ruran* lại chính là nữ chính trong bộ **Chuyển Sinh Thành Cây Bút Bi Của Nữ Thần Minh Họa**!

Các tác giả trên MugenBunko cài cắm *Multiverse Easter Egg* đỉnh thật sự, đọc mà cảm giác như vũ trụ điện ảnh vậy! #SpoilMoi #Isekai`,
        image_url: null
    },
    {
        category: 'spoil',
        title: '⚠️ [Spoil] Giải thích cơ chế "Đọc Lịch Sử Chiến Đấu" của Trùm Cuối trong bộ Bạn Gái Thuở Nhỏ Là Boss Game',
        content: `Nhiều bạn thắc mắc tại sao ở trận Raid cuối Chương 1, con Boss cuối lại đoán trước được toàn bộ chuỗi combo chuyển hướng trên không của nam chính.

Lý do cực kỳ đơn giản mà cũng cực kỳ hợp lý: vì người điều khiển Boss chính là cô bạn thanh mai trúc mã đã ngồi cạnh xem cậu ấy luyện phím suốt 5 năm trời! Cô ấy thuộc lòng từng thói quen bấm kỹ năng, từng nhịp delay 0.2 giây khi cậu ấy đổi vũ khí.

Một pha giải thích vừa logic vừa ngập tràn "cơm chó"! #SpoilMoi #Romance`,
        image_url: null
    },

    // --- QA / HỎI ĐÁP (8 bài) ---
    {
        category: 'qa',
        title: '[Hỏi Đáp] Xin đề cử các bộ Light Novel nhẹ nhàng, chữa lành (Healing / Slice of Life) để đọc trước khi ngủ ạ!',
        content: `Chào mọi người! Dạo này công việc của mình hơi căng thẳng nên tối về chỉ muốn tìm những bộ truyện có nhịp độ chậm rãi, ấm áp, không drama độc hại hay ngược tâm.

Mình đã đọc xong **Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không** và **Cuộc Sống Thường Nhật Hạnh Phúc Của Bán Yêu Ở Vùng Biên Ải** rồi và cực kỳ thích văn phong như vậy.

Mọi người trong diễn đàn còn biết bộ nào tương tự trên MugenBunko thì gợi ý giúp mình với nhé! Cảm ơn cả nhà nhiều! #HoiDap #SliceOfLife`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Hỏi Đáp] Làm thế nào để tăng cấp từ "Độc Giả Tập Sự" lên hạng "SR / SSR" nhanh nhất trên MugenBunko?',
        content: `Mình thấy nhiều bạn trong diễn đàn có huy hiệu cấp bậc **R**, **SR** và **SSR** nhìn đẹp mê ly luôn!

Theo mình tìm hiểu thì đọc truyện, viết đánh giá (Review) và đăng bài thảo luận trên diễn đàn đều nhận được điểm kinh nghiệm (**XP**). Cho mình hỏi cụ thể mốc XP của từng cấp bậc và các hoạt động nào cộng nhiều XP nhất mỗi ngày vậy ạ?

Cảm ơn các cao nhân chỉ giáo! #HoiDap #MugenBunko`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Góc Tác Giả Mới] Hỏi về cách chia độ dài 1 chương Light Novel sao cho hợp lý nhất?',
        content: `Chào các bậc tiền bối trong Xưởng Truyện! Mình đang chuẩn bị đăng bộ Light Novel đầu tay thuộc thể loại *Fantasy / Học viện*.

Theo quy chuẩn trên MugenBunko thì mỗi chương chính thức tối thiểu là **1.000 từ**. Nhưng theo kinh nghiệm thực tế của mọi người, độ dài lý tưởng nhất cho một chương trên nền tảng Web & Mobile là khoảng bao nhiêu từ?
- Khoảng **2.000 – 2.500 từ** (đọc trong 7-10 phút)?
- Hay dài hẳn **4.000 – 5.000 từ** cho đã cái nư?

Mong nhận được lời khuyên từ cả tác giả lẫn độc giả ạ! #HoiDap #SangTac`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Hỏi Đáp] Cách sử dụng công cụ Định Dạng Văn Bản (Rich Text) khi đăng bài và bình luận trên Diễn Đàn?',
        content: `Mình thấy nhiều bài Review trên diễn đàn trình bày cực kỳ chuyên nghiệp: có chữ in đậm, in nghiêng, khung trích dẫn (Quote block) và lưới ảnh rất đẹp.

Cho mình hỏi ngoài việc bấm vào các nút trên thanh công cụ soạn thảo, mình có thể gõ trực tiếp cú pháp Markdown như ` + '`**in đậm**`' + ` hay ` + '`> trích dẫn`' + ` trong ô bình luận nhanh được không ạ? #HoiDap #MugenBunko`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Xin Tư Vấn] Muốn đăng ký quyền "Tác Giả (Author)" để mở Xưởng Truyện thì cần những bước nào?',
        content: `Mình là độc giả trên MugenBunko được một thời gian rồi và hiện tại đã ấp ủ xong bản thảo 3 chương đầu của một bộ tiểu thuyết trinh thám giả tưởng.

Mình thấy trong trang **Hồ Sơ Cá Nhân (Profile)** có mục gửi yêu cầu cấp quyền Tác giả. Cho mình hỏi thời gian Ban Quản Trị xét duyệt thường mất bao lâu và mình cần chuẩn bị phần giới thiệu như thế nào để được duyệt nhanh nhất ạ? #HoiDap #SangTac`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Hỏi Đáp] Thuật ngữ "Bunkobon (文庫本)" trong tên MugenBunko có ý nghĩa là gì vậy mọi người?',
        content: `Mình rất thích cái tên **MugenBunko (無限文庫)** của nền tảng mình nhưng mới chỉ biết *Mugen (無限)* nghĩa là **"Vô Hạn"**.

Còn chữ *Bunko (文庫)* hay *Bunkobon* trong văn hóa xuất bản Light Novel Nhật Bản có lịch sử và ý nghĩa cụ thể như thế nào vậy ạ? Có cao nhân nào rành văn hóa Nhật giải thích giúp mình với! #HoiDap #LightNovel`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Hỏi Đáp Kỹ Thuật] Làm sao để đồng bộ Lịch Sử Đọc giữa Máy Tính và Ứng Dụng Điện Thoại?',
        content: `Mình vừa cài ứng dụng **MugenBunko Mobile** trên điện thoại. Cho mình hỏi chỉ cần đăng nhập chung một tài khoản là thanh **Tiếp Tục Đọc** và **Tủ Sách (Bookmarks)** sẽ tự động đồng bộ giữa máy tính và điện thoại đúng không ạ?

Ngoài ra nếu mình đọc lúc đang mất mạng (Offline) thì khi có mạng lại ứng dụng có tự cập nhật tiến độ đọc lên máy chủ không? #HoiDap #MugenBunko`,
        image_url: null
    },
    {
        category: 'qa',
        title: '[Xin Đề Cử] Có bộ truyện nào trên MugenBunko mà nhân vật chính dùng trí tuệ và chiến thuật thay vì sức mạnh cơ bắp không?',
        content: `Mình cực kỳ mê những nhân vật chính thông minh, điềm tĩnh, luôn chuẩn bị 3 phương án dự phòng trước khi bước vào trận đấu (kiểu như Shiroe trong *Log Horizon* hay Lelouch).

Trong kho truyện của MugenBunko hiện tại có những bộ nào thiên về đấu trí, xây dựng lãnh địa hoặc chiến thuật quân sự/ma pháp đỉnh cao không ạ? Xin anh em chỉ điểm giúp! #HoiDap #ReviewTruyen`,
        image_url: null
    },

    // --- MISC / GÓC WIBU (6 bài) ---
    {
        category: 'misc',
        title: '✨ [Góc Khoe Góc Đọc Truyện] Setup bàn làm việc đêm khuya + một tách hồng trà nóng để cày MugenBunko!',
        content: `Tối thứ Bảy không đi chơi đâu cả, chỉ cần bật đèn bàn vàng ấm, pha một tách hồng trà bá tước (Earl Grey), mở giao diện **Sepia** trên MugenBunko và đắm chìm vào thế giới giả tưởng!

> "Hạnh phúc đôi khi chỉ giản dị là còn nguyên 10 chương truyện mới chưa đọc."

Anh em tối nay đang cày bộ nào thế? Điểm danh hội cú đêm nào! #GocWibu #SliceOfLife`,
        image_url: '/assets/covers/half_demon_1774857690001.png'
    },
    {
        category: 'misc',
        title: '😂 Nỗi khổ chung của dân cày Light Novel: Tự hứa "Đọc nốt chương này rồi đi ngủ" và cái kết 4 giờ sáng!',
        content: `Lịch trình quen thuộc mỗi tối của tôi:
- **23:00**: Mở MugenBunko định đọc nhẹ 1 chương cho dễ ngủ.
- **23:20**: Á đù cuối chương có biến căng quá, đọc nốt chương sau xem sao.
- **01:30**: Nhân vật chính chuẩn bị tỏ tình / lật kèo rồi, không thể dừng lúc này được!!
- **03:45**: Chim hót ngoài cửa sổ, đọc hết sạch chương mới nhất và bắt đầu ngồi hóng tác giả ra chương tiếp theo...

Có ai đang đọc bài này lúc quá nửa đêm không giơ tay điểm danh cái nào! #GocWibu #Meme`,
        image_url: null
    },
    {
        category: 'misc',
        title: '📚 Thử thách ghép tên 2 bộ truyện trên MugenBunko lại với nhau để tạo ra siêu phẩm lầy lội nhất!',
        content: `Mình trước nhé:
- Ghép *"Chuyển Sinh Thành Cây Bút Bi"* + *"Tiệm Cà Phê Hầu Gái Ở Ma Giới"*
=> **"Bị Đuổi Khỏi Tổ Đội Dũng Sĩ, Tôi Chuyển Sinh Thành Cây Bút Bi Phục Vụ Trà Sữa Cho Ma Vương!"** 😂

Hoặc:
- *"Tôi Có Thể Nghe Thấy Tiếng Lòng Của Nữ Hoàng Băng Giá"* + *"Chế Tạo Robot Chiến Đấu"*
=> **"Tôi Nghe Thấy Tiếng Lòng Của Cỗ Máy Robot Chiến Đấu Đang Thầm Thương Trộm Nhớ Mình!"**

Tới lượt anh em trổ tài sáng tạo tiêu đề dưới phần bình luận nhé! #GocWibu #Comedy`,
        image_url: null
    },
    {
        category: 'misc',
        title: '🍵 Nếu được mở một cửa tiệm ở Dị Giới (Isekai), bạn sẽ chọn kinh doanh mặt hàng gì?',
        content: `Không tính chuyện đi đánh quái vật nguy hiểm nhé, nếu được hệ thống cấp vốn mở một cửa tiệm bất kỳ tại thủ đô Vương quốc Phép Thuật, bạn sẽ mở tiệm gì?

1. **Tiệm Trà Sữa Trân Châu Đường Đen** (đảm bảo các Hoàng nữ và Pháp sư nghiện ngay lập tức).
2. **Hiệu Sách & Quán Cà Phê MugenBunko Chi Nhánh Dị Giới**.
3. **Tiệm Mì Cay & Đồ Nướng Đêm Khuya** cho các Mạo hiểm giả đi săn về.
4. **Xưởng Chế Tác Vật Phẩm Ma Đạo Thông Minh** (tủ lạnh ma thuật, điều hòa cổ ngữ).

Mình chốt phương án 1 + 2 kết hợp luôn! Còn bạn thì sao? #GocWibu #Isekai`,
        image_url: null
    },
    {
        category: 'misc',
        title: '🎨 [Fanart & Ý Tưởng] Phác thảo trang phục đồng phục Học Viện Ma Pháp mùa đông',
        content: `Sau khi đọc xong bộ **Lớp Học Ma Thuật Toàn Nữ Nhưng Tôi Lại Là Giáo Viên Nam Duy Nhất**, mình mê thiết kế áo choàng học viện viền chỉ bạc quá nên đang lên ý tưởng vẽ một bộ minh họa fanart!

Sự kết hợp giữa áo khoác dạ cổ điển châu Âu, cà vạt nơ màu hồng anh đào (Sakura Pink) và huy hiệu trăng khuyết trên ngực áo thực sự cực kỳ hợp với không khí của MugenBunko.

Khi nào hoàn thiện bản màu mình sẽ đăng lên diễn đàn khoe với mọi người nhé! #GocWibu #Fantasy`,
        image_url: '/assets/covers/magic_class_1774858017254.png'
    },
    {
        category: 'misc',
        title: '🌟 Lời cảm ơn gửi tới đội ngũ phát triển và các tác giả trên MugenBunko!',
        content: `Là một người mê đọc Light Novel từ thời còn phải lọ mọ tìm từng bản dịch rời rạc trên các blog cũ, khi tìm thấy **MugenBunko** với giao diện tinh tế, không quảng cáo rác, trình đọc mượt mà và cộng đồng thân thiện như thế này, mình thực sự rất trân trọng.

Chúc cho cộng đồng MugenBunko của chúng ta ngày càng lớn mạnh, có thêm thật nhiều cây bút tài năng và những bộ tiểu thuyết đi vào lòng người! ❤️ #GocWibu #MugenBunko`,
        image_url: null
    }
];

const sampleCommentTemplates = [
    "Bài viết chất lượng quá bác ơi! Đọc xong phải chạy qua mở truyện lên cày ngay lập tức 🔥",
    "Hoàn toàn đồng ý với góc nhìn của chủ thớt! Văn phong bộ này thực sự rất cuốn và có chiều sâu.",
    "Chuẩn không cần chỉnh luôn 😂 Hôm qua mình cũng thức tới 3h sáng chỉ vì câu 'đọc nốt chương này'!",
    "Cảm ơn bài phân tích cực kỳ tâm huyết của bạn. Nhờ bài này mình mới để ý tới chi tiết foreshadowing đó!",
    "Tác giả xây dựng tương tác giữa hai nhân vật chính tự nhiên thật sự, đọc mà tủm tỉm cười suốt.",
    "Mình thuộc team Charcoal + Noto Serif cỡ 18px giống hệt thớt luôn, đọc ban đêm êm mắt cực kỳ!",
    "Đề cử thêm bộ Quán Ăn Khuya nữa nhé mọi người, đọc ấm lòng lắm luôn ❤️",
    "Thả tim cho chủ thớt! Mong bạn ra thêm nhiều bài review và phân tích chất lượng như thế này nữa nhé.",
    "Cú twist này mà thành sự thật ở các chương tới thì đúng là siêu phẩm luôn!",
    "Giao diện mới của diễn đàn nhìn xịn thật sự, lướt đọc thảo luận cuốn chẳng kém gì đọc truyện!"
];

const sampleReplyTemplates = [
    "Chuẩn luôn bác ơi, chi tiết đó tinh tế thật sự!",
    "Haha bắt tay đồng môn phát nào, tối nay lại thức cày chương mới tiếp thôi!",
    "Cảm ơn bạn nhiều nha, mình sẽ đọc thử bộ bạn gợi ý ngay tối nay!",
    "Đúng rồi đó bạn, đọc đoạn đó mình cũng nổi da gà luôn!"
];

async function seedForum50() {
    console.log("🚀 Đang kết nối cơ sở dữ liệu MySQL để nạp 50 bài viết diễn đàn...");
    const connection = await mysql.createConnection(dbConfig);

    try {
        const defaultPasswordHash = await bcrypt.hash('password123', 10);
        const userIds = [];

        // 1. Đảm bảo có danh sách người dùng cộng đồng phong phú
        for (const u of communityUsers) {
            const [existing] = await connection.query("SELECT id FROM users WHERE username = ?", [u.username]);
            let uid;
            if (existing.length > 0) {
                uid = existing[0].id;
                await connection.query(
                    "UPDATE users SET displayname = ?, bio = ?, avatar_seed = ?, level = ?, xp = ? WHERE id = ?",
                    [u.displayname, u.bio, u.avatar_seed, u.level, u.xp, uid]
                );
            } else {
                const [res] = await connection.query(
                    "INSERT INTO users (username, password, displayname, coins, level, xp, bio, avatar_seed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
                    [u.username, defaultPasswordHash, u.displayname, 1500, u.level, u.xp, u.bio, u.avatar_seed]
                );
                uid = res.insertId;
                await connection.query("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'reader')", [uid]);
                if (u.role !== 'reader') {
                    await connection.query("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, ?)", [uid, u.role]);
                }
            }
            userIds.push(uid);
        }

        // Lấy thêm các user sẵn có trong DB (như admin, alice, bob...)
        const [allUsers] = await connection.query("SELECT id FROM users ORDER BY id ASC");
        const allUserIds = allUsers.map(r => r.id);

        console.log(`✅ Đã chuẩn bị ${allUserIds.length} tài khoản thành viên cộng đồng.`);

        // 2. Xóa các bài viết trùng tiêu đề (nếu chạy lại script) để tránh nhân bản
        let insertedPosts = 0;
        let insertedComments = 0;
        let insertedLikes = 0;

        const now = Date.now();

        for (let i = 0; i < fiftyForumPosts.length; i++) {
            const postData = fiftyForumPosts[i];
            const authorId = userIds[i % userIds.length] || allUserIds[0];

            // Kiểm tra xem bài viết đã tồn tại chưa
            const [existingPost] = await connection.query(
                "SELECT id FROM forum_posts WHERE title = ? LIMIT 1",
                [postData.title]
            );

            let postId;
            // Phân bổ thời gian tạo trải đều trong 14 ngày gần đây
            const hoursAgo = (fiftyForumPosts.length - i) * 5 + (i % 4);
            const createdAt = new Date(now - hoursAgo * 3600 * 1000);

            if (existingPost.length > 0) {
                postId = existingPost[0].id;
                await connection.query(
                    "UPDATE forum_posts SET content = ?, category = ?, image_url = ? WHERE id = ?",
                    [postData.content, postData.category, postData.image_url, postId]
                );
            } else {
                const [res] = await connection.query(
                    "INSERT INTO forum_posts (title, content, author_id, category, restrict_comments, image_url, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
                    [postData.title, postData.content, authorId, postData.category, postData.image_url, createdAt]
                );
                postId = res.insertId;
                insertedPosts++;
            }

            // 3. Tạo lượt thích (Likes) phong phú cho mỗi bài (từ 4 đến 15 lượt thích)
            const likeCountTarget = 4 + ((i * 7) % 10);
            for (let l = 0; l < Math.min(likeCountTarget, allUserIds.length); l++) {
                const likerId = allUserIds[(i + l) % allUserIds.length];
                const [likeRes] = await connection.query(
                    "INSERT IGNORE INTO forum_post_likes (post_id, user_id) VALUES (?, ?)",
                    [postId, likerId]
                );
                if (likeRes.affectedRows > 0) insertedLikes++;
            }

            // 4. Tạo các bình luận gốc + bình luận phản hồi (Replies) cho bài viết nếu chưa có
            const [existingComments] = await connection.query(
                "SELECT COUNT(*) as cnt FROM forum_comments WHERE post_id = ?",
                [postId]
            );

            if (existingComments[0].cnt === 0) {
                const numRootComments = 2 + (i % 3); // 2 đến 4 bình luận gốc mỗi bài
                for (let c = 0; c < numRootComments; c++) {
                    const commenterId = userIds[(i + c + 2) % userIds.length];
                    const commentText = sampleCommentTemplates[(i + c * 3) % sampleCommentTemplates.length];
                    const commentTime = new Date(createdAt.getTime() + (c + 1) * 1800 * 1000);

                    const [cRes] = await connection.query(
                        "INSERT INTO forum_comments (post_id, user_id, parent_id, text, created_at) VALUES (?, ?, NULL, ?, ?)",
                        [postId, commenterId, commentText, commentTime]
                    );
                    insertedComments++;

                    // Thêm 1 reply cho bình luận đầu tiên của mỗi bài
                    if (c === 0) {
                        const replierId = authorId;
                        const replyText = sampleReplyTemplates[i % sampleReplyTemplates.length];
                        const replyTime = new Date(commentTime.getTime() + 900 * 1000);
                        await connection.query(
                            "INSERT INTO forum_comments (post_id, user_id, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?)",
                            [postId, replierId, cRes.insertId, replyText, replyTime]
                        );
                        insertedComments++;
                    }
                }
            }
        }

        const [totalPostsRow] = await connection.query("SELECT COUNT(*) as total FROM forum_posts");
        const [totalCommentsRow] = await connection.query("SELECT COUNT(*) as total FROM forum_comments");
        const [totalLikesRow] = await connection.query("SELECT COUNT(*) as total FROM forum_post_likes");

        console.log(`🎉 Hoàn tất! Đã thêm mới ${insertedPosts} bài viết, ${insertedComments} bình luận, ${insertedLikes} lượt thích.`);
        console.log(`📊 Tổng số trong DB hiện tại: ${totalPostsRow[0].total} bài viết | ${totalCommentsRow[0].total} bình luận | ${totalLikesRow[0].total} lượt thích.`);
    } finally {
        await connection.end();
    }
}

seedForum50().catch(err => {
    console.error("❌ Lỗi khi seed dữ liệu diễn đàn:", err);
    process.exit(1);
});

