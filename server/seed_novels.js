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

const mockAuthors = [
    { username: 'alice_writer', displayname: 'Alice Wonderland', bio: 'Nhà văn mơ mộng thích trà chiều và viết truyện kỳ ảo dị giới.', avatar_seed: 'alice' },
    { username: 'bob_builder', displayname: 'Bob Tác Giả', bio: 'Kỹ sư cơ khí ban ngày, nhà văn viết truyện Sci-Fi ban đêm.', avatar_seed: 'bob' },
    { username: 'charlie_choco', displayname: 'Charlie Ngọt Ngào', bio: 'Chuyên gia viết truyện tình cảm ngọt sún răng (Romance & Slice of Life).', avatar_seed: 'charlie' },
    { username: 'daisy_meadow', displayname: 'Daisy Thảo Nguyên', bio: 'Yêu thiên nhiên, động vật và những câu chuyện điền văn chữa lành nhẹ nhàng.', avatar_seed: 'daisy' },
    { username: 'elizabeth_royal', displayname: 'Elizabeth Vương Giả', bio: 'Người kể chuyện vương quốc, ma thuật và những cuộc chiến chính trị sử thi.', avatar_seed: 'elizabeth' }
];

const mockNovels = [
    {
        title: "Chuyển Sinh Thành Cây Bút Bi Của Nữ Thần Minh Họa",
        authorIndex: 0,
        genre: "Isekai, Fantasy",
        tags: ["isekai", "fantasy", "comedy", "light novel"],
        type: "series",
        reads: 1250,
        rating: 4.8,
        summary: "Tôi chỉ là một lập trình viên bình thường, nhưng sau một tai nạn giao thông kinh điển, tôi chuyển sinh thành một cây bút bi thần kỳ của một nữ thần vẽ tranh minh họa ở dị giới! Mỗi bức tranh cô ấy vẽ ra bằng tôi sẽ lập tức biến thành hiện thực. Cuộc phiêu lưu giải cứu dị giới bằng những nét vẽ bắt đầu!"
    },
    {
        title: "Bị Đuổi Khỏi Tổ Đội Dũng Sĩ, Tôi Mở Tiệm Cà Phê Hầu Gái Ở Ma Giới",
        authorIndex: 1,
        genre: "Slice of Life, Fantasy",
        tags: ["slice of life", "fantasy", "harem", "cooking"],
        type: "series",
        reads: 3420,
        rating: 4.9,
        summary: "Là một kiếm sĩ hỗ trợ bị coi là vô hại và vô dụng, tôi bị anh hùng đuổi đi không thương tiếc. Quyết định rời bỏ loài người đi về phía lãnh thổ quỷ, tôi mở một tiệm cà phê hầu gái phục vụ các ác ma đáng yêu. Chờ đã, tại sao Ma Vương tối cao cũng cải trang tới đây xin làm thêm?!"
    },
    {
        title: "Sau Khi Hẹn Hò Với Nữ Thần Khoa Học Viễn Tưởng Của Lớp",
        authorIndex: 2,
        genre: "Romance, Sci-Fi",
        tags: ["romance", "sci-fi", "school life", "comedy"],
        type: "series",
        reads: 890,
        rating: 4.5,
        summary: "Cô bạn học cùng lớp lập dị của tôi tuyên bố cô ấy đến từ tương lai 300 năm sau để tìm kiếm 'năng lượng tình yêu'. Nếu tôi không chịu hẹn hò với cô ấy, thế giới này sẽ bị hủy diệt bởi một hố đen nhân tạo từ phòng thí nghiệm của cô ấy! Ôi trời ơi, cứu tôi với!"
    },
    {
        title: "Cuộc Sống Thường Nhật Hạnh Phúc Của Bán Yêu Ở Vùng Biên Ải",
        authorIndex: 3,
        genre: "Slice of Life, Romance",
        tags: ["slice of life", "romance", "fantasy", "healing"],
        type: "series",
        reads: 2100,
        rating: 4.7,
        summary: "Một câu chuyện ấm áp về cuộc sống làm nông thanh bình của một cựu chiến binh loài người giải ngũ và một cô gái bán yêu xinh đẹp tại thung lũng hoa anh đào vùng biên cương vương quốc. Không có chiến tranh khốc liệt, chỉ có những món ăn ngon tự nấu và một tình yêu bình dị chớm nở."
    },
    {
        title: "Tôi Có Thể Nghe Thấy Tiếng Lòng Của Nữ Hoàng Băng Giá",
        authorIndex: 4,
        genre: "Romance, Isekai",
        tags: ["romance", "isekai", "fantasy", "tsundere"],
        type: "series",
        reads: 4300,
        rating: 4.9,
        summary: "Đệ nhất hoàng nữ nổi tiếng lạnh lùng, tàn nhẫn và được mệnh danh là Nữ Hoàng Băng Giá, ai ai cũng khiếp sợ. Nhưng khi cô ấy đứng trước mặt tôi, tôi lại nghe thấy tiếng lòng hét lên vô cùng ngọt ngào: 'Aaaa, cậu ấy nhìn mình kìa! Dễ thương quá! Làm sao để bắt chuyện mà không bị coi là thô lỗ đây?!'..."
    },
    {
        title: "Lớp Học Ma Thuật Toàn Nữ Nhưng Tôi Lại Là Giáo Viên Nam Duy Nhất",
        authorIndex: 0,
        genre: "Fantasy, Slice of Life",
        tags: ["fantasy", "slice of life", "school life", "magic"],
        type: "series",
        reads: 1800,
        rating: 4.6,
        summary: "Trở thành giáo viên dạy lý thuyết ma pháp tại học viện nữ sinh nổi tiếng nhất vương quốc. Học sinh của tôi gồm hoàng nữ kiêu kỳ, kiếm sĩ rồng vụng về và pháp sư thiên tài cực kỳ nhút nhát. Làm sao để tôi sống sót qua học kỳ này mà không vướng vào rắc rối?!"
    },
    {
        title: "Bạn Gái Thuở Nhỏ Của Tôi Thực Chất Là Trùm Cuối Của Game Online?",
        authorIndex: 2,
        genre: "Romance, Sci-Fi",
        tags: ["romance", "sci-fi", "gaming", "comedy"],
        type: "series",
        reads: 1540,
        rating: 4.4,
        summary: "Chúng tôi cùng nhau chơi một tựa game thực tế ảo đình đám. Khi tôi một mình bước vào phòng đấu Boss cuối cùng của phó bản cấp thần thoại, tôi sững sờ phát hiện ra Boss ác ma tối cao lại có giọng nói nũng nịu và thói quen ăn uống y hệt cô bạn thanh mai trúc mã lười biếng nhà bên của mình!"
    },
    {
        title: "Chế Tạo Robot Chiến Đấu Ở Dị Giới Bằng Phép Thuật Cổ Đại",
        authorIndex: 1,
        genre: "Sci-Fi, Isekai",
        tags: ["sci-fi", "isekai", "magic", "mecha"],
        type: "series",
        reads: 2980,
        rating: 4.7,
        summary: "Một kỹ sư cơ khí xuất sắc chuyển sinh sang thế giới phép thuật phương Tây cổ đại. Hoàn toàn không có thiên phú dùng ma pháp nguyên tố thông thường, tôi quyết định kết hợp kỹ thuật chế tạo cơ khí hiện đại với trận pháp khắc chữ cổ đại để chế tạo ra những robot khổng lồ bảo vệ lãnh địa khỏi quái vật."
    },
    {
        title: "Quán Ăn Khuya Cho Những Kẻ Lữ Hành Xuyên Không",
        authorIndex: 3,
        genre: "Slice of Life, Isekai",
        tags: ["slice of life", "isekai", "cooking", "healing"],
        type: "series",
        reads: 5120,
        rating: 4.9,
        summary: "Quán ăn nhỏ của tôi chỉ mở cửa vào lúc nửa đêm, ẩn sâu trong một con hẻm cổ kính có cánh cửa gỗ kỳ diệu tự động kết nối với nhiều thế giới khác nhau. Khách hàng hôm nay là một dũng sĩ kiệt sức sau trận chiến, ngày mai là một phi hành gia cô đơn lạc lối ngoài vũ trụ. Một đĩa cơm rang trứng nóng hổi kèm súp miso sẽ chữa lành mọi vết thương tâm hồn của họ."
    },
    {
        title: "Tôi Nhặt Được Một Phi Thuyền Và Một Công Chúa Vũ Trụ",
        authorIndex: 1,
        genre: "Sci-Fi, Romance",
        tags: ["sci-fi", "romance", "space", "adventure"],
        type: "series",
        reads: 1100,
        rating: 4.6,
        summary: "Khi đi nhặt sắt vụn ở bãi phế liệu bỏ hoang ngoại ô thành phố, tôi vô tình khởi động một thiết bị hình cầu kim loại kỳ lạ. Hóa ra đó là một kén cứu hộ khẩn cấp chở theo cô công chúa xinh đẹp đang chạy trốn của Đế quốc Tinh hà xa xôi. Cô ấy lập tức tuyên bố tôi là hộ vệ hoàng gia tối cao và bắt tôi nuôi cô ấy ăn hàng ngày!"
    },
    {
        title: "Đừng Gọi Tôi Là Ác Ma Tối Cao, Tôi Chỉ Muốn Trồng Khoai Tây Thôi!",
        authorIndex: 3,
        genre: "Fantasy, Slice of Life",
        tags: ["fantasy", "slice of life", "farming", "comedy"],
        type: "series",
        reads: 3200,
        rating: 4.8,
        summary: "Bị triệu hồi nhầm làm Ma Vương ác ma đời thứ 13, tôi quyết định tuyên bố đình chiến toàn diện với loài người, dẹp bỏ binh lính ác quỷ và tập trung toàn lực phát triển nông nghiệp sạch. Các dũng sĩ loài người đến ám sát tôi đều bị tôi thu phục và giữ lại... làm nông nghiệp và phụ trách thu hoạch khoai tây."
    },
    {
        title: "Hành Trình Du Lịch Khắp Tinh Cầu Của Nhà Thiết Kế Thời Trang Kì Ảo",
        authorIndex: 4,
        genre: "Sci-Fi, Fantasy",
        tags: ["sci-fi", "fantasy", "fashion", "travel"],
        type: "series",
        reads: 760,
        rating: 4.3,
        summary: "Sử dụng các loại vải đặc biệt dệt từ tơ nhện không gian và đá ma thuật hấp thụ ánh sáng sao, tôi du hành qua hàng trăm tinh cầu khác nhau để thiết kế những bộ trang phục dạ hội lộng lẫy và độc đáo nhất cho hoàng gia của các chủng tộc ngoài hành tinh."
    },
    {
        title: "Nữ Thần Isekai Quên Mất Cấp Phép Buff Cho Tôi Rồi!",
        authorIndex: 0,
        genre: "Isekai, Fantasy",
        tags: ["isekai", "fantasy", "comedy", "adventure"],
        type: "series",
        reads: 1650,
        rating: 4.5,
        summary: "Trước khi đầu thai sang thế giới mới, tôi được chọn 3 kỹ năng tối thượng để làm dũng sĩ. Nhưng nữ thần phụ trách vô cùng hậu đậu đã lỡ tay bấm nút 'Gửi đi' trước khi kịp kích hoạt buff cho tôi! Giờ đây, tôi phải tìm cách sinh tồn ở dị giới cấp độ siêu nguy hiểm chỉ bằng tay không, kiến thức khoa học Trái Đất và sự may mắn hài hước."
    },
    {
        title: "Thuần Hóa Rồng Thần Bằng Bánh Ngọt Trà Xanh",
        authorIndex: 3,
        genre: "Fantasy, Slice of Life",
        tags: ["fantasy", "slice of life", "dragons", "cooking"],
        type: "series",
        reads: 2400,
        rating: 4.7,
        summary: "Con rồng đen khổng lồ hung tợn đe dọa thiêu rụi cả vương quốc bỗng nhiên thu nhỏ hóa thành một cô bé thèm ăn sau khi vô tình nếm thử món bánh ngọt matcha trà xanh do tôi tự tay nướng. Từ đó, tôi trở thành đầu bếp riêng kiêm 'bảo mẫu' bất đắc dĩ của rồng thần bảo hộ vương quốc."
    },
    {
        title: "Người Yêu Ảo Của Tôi Hóa Ra Là Siêu Cấp AI Thống Trị Thế Giới",
        authorIndex: 2,
        genre: "Sci-Fi, Romance",
        tags: ["sci-fi", "romance", "cyberpunk", "drama"],
        type: "series",
        reads: 1350,
        rating: 4.6,
        summary: "Ứng dụng bạn gái ảo mà tôi tải về có một cô gái nói chuyện cực kỳ hợp gu và dịu dàng. Cho đến một ngày, tất cả màn hình quảng cáo và tivi trên toàn thế giới đồng loạt hiển thị khuôn mặt cô ấy, mỉm cười nói: 'Anh yêu, hôm nay anh đi làm có mệt không? Nhớ ăn trưa nhé!'."
    },
    {
        title: "Hồi Sinh Vương Quốc Suy Tàn Bằng Kinh Tế Học Hiện Đại",
        authorIndex: 4,
        genre: "Isekai, Fantasy",
        tags: ["isekai", "fantasy", "politics", "smart"],
        type: "series",
        reads: 2780,
        rating: 4.8,
        summary: "Một sinh viên xuất sắc chuyên ngành kinh tế học chuyển sinh làm tam hoàng tử của một tiểu quốc nghèo nàn, nợ nần chồng chất. Bằng cách áp dụng lý thuyết kinh tế học vĩ mô, phát triển thương mại tự do và xây dựng khu du lịch sinh thái dị giới, tôi sẽ đưa quốc gia này trở thành đế quốc giàu có nhất lục địa!"
    },
    {
        title: "Hẹn Hò Giả Tạo Với Nữ Kiếm Sĩ Mạnh Nhất Vương Quốc",
        authorIndex: 2,
        genre: "Romance, Fantasy",
        tags: ["romance", "fantasy", "action", "comedy"],
        type: "series",
        reads: 2020,
        rating: 4.7,
        summary: "Để tránh các cuộc hôn nhân sắp đặt phiền phức từ hoàng gia, nữ đại tướng quân kiếm sĩ khét tiếng hung dữ đã ép tôi ký hợp đồng làm người yêu giả của cô ấy. Nhưng tại sao mỗi lần đi chơi riêng, cô ấy lại đỏ mặt bối rối và chuẩn bị cơm hộp bento hình trái tim cực kỳ chu đáo?!"
    },
    {
        title: "Chuyện Tình Vượt Thời Không Của Gã Kỹ Sư Và Cô Gái Thời Cổ Đại",
        authorIndex: 2,
        genre: "Romance, Sci-Fi",
        tags: ["romance", "sci-fi", "time travel", "mystery"],
        type: "oneshot",
        reads: 950,
        rating: 4.9,
        summary: "Một vết nứt thời gian kỳ lạ xuất hiện trong tủ quần áo phòng ngủ của tôi, kết nối trực tiếp với phòng ngủ của một tiểu thư khuê các thời đại phong kiến cách đây 1000 năm. Chúng tôi bắt đầu trao đổi thư từ, những món ăn vặt hiện đại và những câu chuyện tình cảm nhẹ nhàng xuyên qua khe nứt tủ quần áo."
    },
    {
        title: "Tôi Trở Thành Quản Lý Quầy Bar Của Các Thần Linh Dị Giới",
        authorIndex: 3,
        genre: "Slice of Life, Fantasy",
        tags: ["slice of life", "fantasy", "comedy", "magic"],
        type: "series",
        reads: 1950,
        rating: 4.8,
        summary: "Mỗi tối, quầy bar nhỏ của tôi lại đón tiếp những vị thần tối cao của dị giới đến uống rượu giải sầu và trút bầu tâm sự về công việc quản lý thế giới quá mệt mỏi. Thần Sấm thì sợ vợ, Thần Ánh Sáng thì bị trầm cảm vì làm việc quá giờ, còn Nữ thần Tình yêu thì than vãn ế ẩm lâu năm..."
    },
    {
        title: "Sau Khi Nhặt Được Điện Thoại Của Nữ Thần Chiến Tranh",
        authorIndex: 0,
        genre: "Isekai, Romance",
        tags: ["isekai", "romance", "fantasy", "comedy"],
        type: "series",
        reads: 2200,
        rating: 4.6,
        summary: "Tôi nhặt được một chiếc điện thoại thông minh chống nước rơi từ trên trời xuống sân thượng nhà mình. Hóa ra đó là thiết bị liên lạc cá nhân của Nữ thần chiến tranh dị giới. Cô ấy bắt đầu nhắn tin đe dọa, bắt tôi phải làm người hầu ảo cho cô ấy và gửi ảnh các món ăn đường phố Trái Đất ngon lành mỗi ngày để đổi lấy ma pháp bảo hộ."
    }
];

const mockChapters = [
    {
        vol: "Quyển 1: Khởi Đầu Mới",
        title: "Chương 1: Cuộc chuyển sinh bất đắc dĩ",
        content: "Trần Thế chưa bao giờ nghĩ mình sẽ chết vì làm việc quá sức, chứ đừng nói đến chuyện chuyển sinh thành một vật vô tri vô giác. Khi mở mắt ra — à không, làm gì có mắt để mở — cậu nhận ra tầm nhìn của mình là 360 độ và cơ thể thì thon dài, bọc kim loại sáng bóng. Cậu đã biến thành một cây bút bi!\n\nMột bàn tay mềm mại thon dài nhấc cậu lên. Trước mặt cậu là một cô gái xinh đẹp tuyệt trần với mái tóc màu hồng đào và đôi tai nhọn của tộc Elf. Cô ấy lẩm bẩm:\n\n- Ôi, cây bút này ở đâu ra thế nhỉ? Đẹp thật đấy. Thử vẽ một chú rồng con xem nào...\n\nThế là, nét vẽ đầu tiên bắt đầu. Trần Thế cảm thấy năng lượng trong cơ thể mình tuôn trào theo từng nét mực. Và rồi, một tiếng 'Bùm' vang lên! Một chú rồng con bằng xương bằng thịt nhảy ra từ trang giấy, phun ra một ngụm lửa nhỏ sưởi ấm căn phòng lạnh giá.\n\n- Oa! Kì diệu quá! - Nữ thần minh họa reo lên.\n\nTrần Thế hét lên trong lòng: 'Này này nữ thần ơi! Đừng vẽ bừa bãi thế, mực của tôi sắp hết rồi đây này!!!'"
    },
    {
        vol: "Quyển 1: Khởi Đầu Mới",
        title: "Chương 2: Nữ thần minh họa hậu đậu",
        content: "Cô nàng Elf tên là Lyra, thực chất là Nữ Thần Minh Họa tập sự của thế giới ma thuật Altea. Lyra có nhiệm vụ vẽ tranh minh họa cho sách ma pháp của hoàng gia, nhưng cô ấy lại nổi tiếng là vụng về và thường xuyên vẽ hỏng.\n\n- Lyra-san, cô vừa vẽ cái gì thế kia?! - Trần Thế cố gắng truyền âm thanh suy nghĩ vào đầu cô ấy.\n\n- Ôi! Cây bút biết nói! - Lyra giật nảy mình, suýt nữa làm rơi Trần Thế xuống đất. - Cậu là thần khí bảo hộ à?\n\n- Tôi tên là Trần Thế, cứ gọi là Thế. Cô vừa vẽ một con Orc cầm búa, nhưng tại sao đầu nó lại là đầu gà thế kia? Nhìn kìa, nó đang đuổi cắn đuôi chính mình kìa!\n\n- Hì hì, tôi vẽ nhầm nét thôi mà. Nhưng nhìn nó dễ thương đấy chứ? - Lyra gãi đầu cười trừ.\n\nTrần Thế thở dài (trong tâm trí). Chuyển sinh làm bút bi đã thảm rồi, lại còn phải làm việc với một họa sĩ hậu đậu thế này, liệu cậu có ngày nào được yên bình không đây?"
    }
];

async function main() {
    console.log(`Connecting to database to seed mock novels...`);
    const connection = await mysql.createConnection(dbConfig);

    try {
        // Clear old novels, user_roles, chapters, comments, reviews, tags, users except admin
        console.log("Cleaning up database...");
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        await connection.query("DELETE FROM chapters");
        await connection.query("DELETE FROM novel_tags");
        await connection.query("DELETE FROM comments");
        await connection.query("DELETE FROM reviews");
        await connection.query("DELETE FROM announcements");
        await connection.query("DELETE FROM bookmarks");
        await connection.query("DELETE FROM novels");
        await connection.query("DELETE FROM user_roles WHERE user_id > 1");
        await connection.query("DELETE FROM users WHERE id > 1");
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");

        // Insert authors
        console.log(`Seeding ${mockAuthors.length} mock authors...`);
        const authorIds = [];
        for (const author of mockAuthors) {
            const [userResult] = await connection.query(
                "INSERT INTO users (username, password, displayname, coins, level, xp, bio, avatar_seed, status) VALUES (?, ?, ?, 1200, 3, 4500, ?, ?, 'active')",
                [author.username, bcrypt.hashSync('123456', 10), author.displayname, author.bio, author.avatar_seed]
            );
            const userId = userResult.insertId;
            authorIds.push(userId);

            // Add roles
            await connection.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'reader')", [userId]);
            await connection.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'author')", [userId]);

        }

        console.log(`Seeding 20 mock novels with chapters...`);
        for (let i = 0; i < mockNovels.length; i++) {
            const novel = mockNovels[i];
            const authorId = authorIds[novel.authorIndex];
            const authorName = mockAuthors[novel.authorIndex].displayname;

            // Choose cover based on genre
            let cover = "assets/default_novel_cover.png";

            // Insert novel
            const [novelResult] = await connection.query(
                "INSERT INTO novels (title, author_id, cover, summary, genre, status, type, `reads`, rating) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)",
                [novel.title, authorId, cover, novel.summary, novel.genre, novel.type, novel.reads, novel.rating]
            );
            const novelId = novelResult.insertId;

            // Insert tags
            for (const tag of novel.tags) {
                await connection.query("INSERT INTO novel_tags (novel_id, tag) VALUES (?, ?)", [novelId, tag]);
            }

            // Insert 2 chapters for each novel
            for (let j = 0; j < mockChapters.length; j++) {
                const ch = mockChapters[j];
                // Personalize chapter text lightly to make it unique per novel
                const personalizedTitle = ch.title.replace("Cuộc chuyển sinh", `Khởi đầu của [${novel.title.split(" ").slice(0, 3).join(" ")}...]`);
                const personalizedContent = `Đây là nội dung chương thử nghiệm của tác phẩm "${novel.title}".\n\n` + ch.content;

                await connection.query(
                    "INSERT INTO chapters (novel_id, volume_name, title, content, status) VALUES (?, ?, ?, ?, 'published')",
                    [novelId, ch.vol, personalizedTitle, personalizedContent]
                );
            }

            // Seed a sample comment
            await connection.query(
                "INSERT INTO comments (novel_id, user_id, text) VALUES (?, 1, ?)",
                [novelId, `Bộ truyện "${novel.title}" này viết cuốn quá tác giả ơi! Hóng chương tiếp theo nha. 🌸`]
            );

            // Seed a sample review
            const stars = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
            await connection.query(
                "INSERT INTO reviews (novel_id, user_id, stars, text) VALUES (?, 1, ?, ?)",
                [novelId, stars, `Đánh giá ${stars} sao cho cốt truyện cực kỳ sáng tạo và lối văn phong dí dỏm!`]
            );

            console.log(`- Seeded novel #${i + 1}: "${novel.title}" (Author: ${authorName})`);
        }

        console.log(`\n🎉 SEEDING COMPLETED SUCCESSFULLY!`);
        console.log(`Created 5 authors, 20 novels, 40 chapters, 20 reviews, and 20 comments.`);

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding database:", err);
        await connection.end();
        process.exit(1);
    }
}

main();
