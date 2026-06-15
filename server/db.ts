import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
};

let pool: Pool | null = null;

export async function initializeDbConnection(): Promise<void> {
    try {
        console.log(`Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
        const connection = await mysql.createConnection(dbConfig);
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'mugenbunko'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.end();
        console.log(`Database "${process.env.DB_NAME || 'mugenbunko'}" verified/created successfully.`);

        const connectionWithDb = await mysql.createConnection({
            ...dbConfig,
            database: process.env.DB_NAME || 'mugenbunko',
            multipleStatements: true
        });

        const [tables] = await connectionWithDb.query<any[]>(`SHOW TABLES LIKE 'users'`);
        if (tables.length === 0) {
            console.log("No tables found. Loading schema.sql...");
            const schemaSqlPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaSqlPath)) {
                const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
                await connectionWithDb.query(schemaSql);
                console.log("schema.sql executed and database seeded successfully!");
            } else {
                console.warn("schema.sql file not found! Please check path.");
            }
        } else {
            console.log("Existing tables found. Database already initialized.");
        }

        // Ensure read_cooldowns table exists (migration)
        console.log("Ensuring read_cooldowns migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`read_cooldowns\` (
                \`ip_address\` VARCHAR(45) NOT NULL,
                \`novel_id\` INT NOT NULL,
                \`last_read_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`ip_address\`, \`novel_id\`),
                FOREIGN KEY (\`novel_id\`) REFERENCES \`novels\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log("Migration check for read_cooldowns completed.");

        // Ensure parent_id exists in forum_comments (nested forum comments migration)
        console.log("Ensuring parent_id exists in forum_comments table...");
        const [columnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'forum_comments' 
              AND COLUMN_NAME = 'parent_id'
        `);
        if (columnCheck.length === 0) {
            console.log("Adding parent_id column and foreign key to forum_comments table...");
            await connectionWithDb.query(`
                ALTER TABLE \`forum_comments\` 
                ADD COLUMN \`parent_id\` INT NULL DEFAULT NULL,
                ADD CONSTRAINT \`fk_forum_comments_parent\` 
                FOREIGN KEY (\`parent_id\`) REFERENCES \`forum_comments\` (\`id\`) ON DELETE CASCADE;
            `);
            console.log("Migration completed: added parent_id to forum_comments.");
        } else {
            console.log("parent_id already exists in forum_comments. Skipping migration.");
        }

        // Ensure image_url exists in forum_posts (image posts migration)
        console.log("Ensuring image_url exists in forum_posts table...");
        const [postsColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'forum_posts' 
              AND COLUMN_NAME = 'image_url'
        `);
        if (postsColumnCheck.length === 0) {
            console.log("Adding image_url column to forum_posts table...");
            await connectionWithDb.query(`
                ALTER TABLE \`forum_posts\` 
                ADD COLUMN \`image_url\` VARCHAR(500) NULL DEFAULT NULL;
            `);
            console.log("Migration completed: added image_url to forum_posts.");
        } else {
            console.log("image_url already exists in forum_posts. Skipping migration.");
        }

        // Ensure genre column in novels is wide enough (e.g. VARCHAR(500))
        console.log("Checking if genre column in novels needs expansion...");
        const [genreColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'novels' 
              AND COLUMN_NAME = 'genre'
        `);
        if (genreColumnCheck.length > 0 && genreColumnCheck[0].CHARACTER_MAXIMUM_LENGTH < 500) {
            console.log("Expanding genre column in novels table to VARCHAR(500)...");
            await connectionWithDb.query(`
                ALTER TABLE \`novels\` 
                MODIFY COLUMN \`genre\` VARCHAR(500) NOT NULL;
            `);
            console.log("Migration completed: expanded genre column to VARCHAR(500).");
        } else {
            console.log("genre column in novels table is already expanded or not found. Skipping migration.");
        }

        // Ensure status and content exist in events table (events detail migration)
        console.log("Ensuring status and content exist in events table...");
        const [eventsColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'events' 
              AND COLUMN_NAME = 'status'
        `);
        if (eventsColumnCheck.length === 0) {
            console.log("Adding status and content columns to events table...");
            await connectionWithDb.query(`
                ALTER TABLE \`events\` 
                ADD COLUMN \`status\` VARCHAR(50) NOT NULL DEFAULT 'draft',
                ADD COLUMN \`content\` TEXT NULL DEFAULT NULL;
            `);
            console.log("Migration completed: added status and content to events.");
        } else {
            console.log("status and content already exist in events. Skipping migration.");
        }

        // Ensure word_count exists in chapters (migration for word count metrics)
        console.log("Ensuring word_count exists in chapters table...");
        const [chaptersColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'chapters' 
              AND COLUMN_NAME = 'word_count'
        `);
        if (chaptersColumnCheck.length === 0) {
            console.log("Adding word_count column to chapters table...");
            await connectionWithDb.query(`
                ALTER TABLE \`chapters\` 
                ADD COLUMN \`word_count\` INT NOT NULL DEFAULT 0;
            `);
            console.log("Migration completed: added word_count to chapters.");

            // Backfill word counts for all existing chapters
            console.log("Backfilling word_count for existing chapters...");
            const [existingChapters] = await connectionWithDb.query<any[]>("SELECT id, content FROM chapters");
            for (const ch of existingChapters) {
                const cleanText = (ch.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
                await connectionWithDb.query("UPDATE chapters SET word_count = ? WHERE id = ?", [wordCount, ch.id]);
            }
            console.log(`Backfilled word counts for ${existingChapters.length} chapters.`);
        } else {
            console.log("word_count already exists in chapters. Skipping migration.");
        }

        // Migration: Update user level & XP from old system to new Rarity system
        console.log("Checking if users migration to new Rarity level system is needed...");
        const [users] = await connectionWithDb.query<any[]>("SELECT id, username, level, xp FROM users");
        
        let needsMigration = false;
        // Check if any user has level > 6 (old level system)
        const hasOldLevels = users.some(u => u.level > 6);
        // Check if all users have xp < 500 but at least one user has level > 1 (old system)
        const allXpLessThan500 = users.every(u => u.xp < 500);
        const hasLevelGreaterThan1 = users.some(u => u.level > 1);

        if (hasOldLevels || (allXpLessThan500 && hasLevelGreaterThan1)) {
            needsMigration = true;
        }

        if (needsMigration) {
            console.log("Starting users level & XP migration to Rarity system...");
            for (const user of users) {
                // Calculate total XP: total_xp = (old_level - 1) * 500 + old_xp
                const totalXp = (user.level - 1) * 500 + user.xp;
                
                // Determine new level index (1 = Tập sự, 2 = C, 3 = UC, 4 = R, 5 = SR, 6 = SSR)
                let newLevel = 1;
                if (totalXp < 500) newLevel = 1;
                else if (totalXp < 2500) newLevel = 2;
                else if (totalXp < 12500) newLevel = 3;
                else if (totalXp < 62500) newLevel = 4;
                else if (totalXp < 625000) newLevel = 5;
                else newLevel = 6;

                await connectionWithDb.query(
                    "UPDATE users SET level = ?, xp = ? WHERE id = ?",
                    [newLevel, totalXp, user.id]
                );
                console.log(`Migrated user @${user.username}: Old Level ${user.level}, Old XP ${user.xp} -> New Level ${newLevel}, Total XP ${totalXp}`);
            }
            console.log("Users level & XP migration completed successfully.");
        } else {
            console.log("Users level & XP are already migrated or up-to-date. Skipping migration.");
        }

        // Ensure rules table exists (migration)
        console.log("Ensuring rules migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`rules\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`content\` TEXT NOT NULL,
                \`order_index\` INT DEFAULT 0,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migration check for rules completed.");

        // Seed initial rules if empty
        const [rulesCheck] = await connectionWithDb.query<any[]>("SELECT COUNT(*) as count FROM \`rules\`");
        if (rulesCheck[0].count === 0) {
            console.log("Seeding initial rules into rules table...");
            const initialRules = [
                {
                    title: "Điều 1. Dung lượng và Định dạng văn bản",
                    content: "1.1. Dung lượng chương truyện:\nChương nội dung chính bắt buộc phải đạt độ dài tối thiểu là 1.000 từ. Các chương mở đầu (prologue), vĩ thanh (epilogue) hoặc thông báo của tác giả có thể ngắn hơn nhưng bắt buộc phải dán nhãn phân loại chính xác khi đăng tải. Nghiêm cấm hành vi chia nhỏ chương truyện bất hợp lý để thao túng số liệu hoặc cày điểm kinh nghiệm (XP).\n\n1.2. Quy chuẩn chính tả:\nTác phẩm phải sử dụng tiếng Việt chính thống, tuân thủ đúng quy chuẩn chính tả và ngữ pháp tiếng Việt hiện hành.\n\n1.3. Ngôn ngữ mạng và Viết tắt:\nNghiêm cấm lạm dụng viết tắt, ký tự đặc biệt hoặc ngôn ngữ mạng (teencode) trong văn phong kể và miêu tả (ngoại trừ trường hợp giả lập các đoạn hội thoại, tin nhắn thiết bị của nhân vật trong cốt truyện).\n\n1.4. Thuật ngữ ngoại lai:\nHạn chế sử dụng từ ngữ nước ngoài khi đã có từ tiếng Việt tương đương. Chỉ chấp nhận tên riêng hoặc các thuật ngữ đặc trưng của thể loại (như Isekai, Mana, Guild, Quest, Level...).\n\n1.5. Trình bày trực quan:\nVăn bản phải được phân đoạn rõ ràng để đảm bảo trải nghiệm đọc. Không chấp nhận văn bản dạng khối đặc (wall of text) hoặc lạm dụng khoảng trống xuống dòng liên tiếp để kéo dài trang.",
                    order_index: 10
                },
                {
                    title: "Điều 2. Giới hạn nội dung nhạy cảm và Cảnh báo độ tuổi",
                    content: "2.1. Yếu tố người lớn (Ecchi):\nGiới hạn tối đa đối với các yếu tố nhạy cảm, gợi cảm trong tác phẩm là Ecchi (dừng lại ở mức độ gợi mở, tình huống hài hước nhẹ nhàng hoặc miêu tả gián tiếp). Nghiêm cấm mọi mô tả chi tiết, trực diện về hành vi quan hệ tình dục hoặc khiêu dâm (Smut, Hentai).\n\n2.2. Ảnh bìa và Minh họa:\nẢnh bìa tác phẩm và các hình ảnh minh họa đính kèm trong chương truyện không được chứa hình ảnh khỏa thân, phơi bày bộ phận nhạy cảm hoặc tư thế gợi dục trực diện.\n\n2.3. Yếu tố bạo lực (Combat/Gore):\nĐược phép miêu tả các cảnh hành động, chiến đấu phục vụ cốt truyện. Tuy nhiên, nghiêm cấm các nội dung cổ xúy hoặc mô tả chi tiết các hành vi bạo lực phản nhân văn (tra tấn bệnh hoạn, ngược đãi bạo hành nhóm yếu thế ngoài đời thực...).\n\n2.4. Tâm lý nhân vật:\nCho phép khai thác các đề tài tâm lý phức tạp (trầm cảm, ám ảnh...). Tuy nhiên, nghiêm cấm các nội dung mang tính chất lãng mạn hóa, khuyến khích hoặc hướng dẫn hành vi tự hủy hoại bản thân ngoài đời thực.",
                    order_index: 20
                },
                {
                    title: "Điều 3. Các chủ đề cấm kỵ tuyệt đối",
                    content: "3.1. Chính trị đời thực:\nTuyệt đối không đề cập đến tình hình chính trị, chính trị gia, quốc gia hoặc thể chế chính trị ngoài đời thực dưới mọi hình thức. Nghiêm cấm sử dụng tác phẩm để tuyên truyền chính trị hoặc bôi nhọ bất kỳ tổ chức nào.\n\n3.2. Phân biệt đối xử:\nNghiêm cấm các nội dung miệt thị, kích động thù hận đối với bất kỳ sắc tộc, chủng tộc, giới tính, xu hướng tính dục hay tôn giáo ngoài đời thực.\n\n3.3. Lịch sử ngoài đời thực:\nTuyệt đối không nhắc đến, không sử dụng hoặc hư cấu dựa trên các sự kiện lịch sử hoặc nhân vật lịch sử có thật (bao gồm cả lịch sử Việt Nam và thế giới). Đối với các thể loại dã sử, cổ trang: Tác giả bắt buộc phải thiết lập bối cảnh hư cấu hoàn toàn (thế giới giả tưởng, triều đại song song tự sáng tạo 100% với tên quốc gia, niên hiệu và nhân vật hư cấu).",
                    order_index: 30
                },
                {
                    title: "Điều 4. Quyền tác giả và Bản quyền sáng tác",
                    content: "4.1. Sở hữu trí tuệ:\nTác phẩm đăng tải phải hoàn toàn thuộc quyền sở hữu trí tuệ của tác giả. Nghiêm cấm mọi hình thức đạo văn (sao chép nguyên văn, viết lại cấu trúc câu giữ nguyên cốt truyện hoặc dịch lại tác phẩm nước ngoài rồi nhận là truyện tự sáng tác).\n\n4.2. Cấm truyện đồng nhân (Fanfiction):\nMugenBunko là nền tảng thuần sáng tác nguyên bản. Nghiêm cấm mọi tác phẩm đồng nhân, fanfiction phái sinh dựa trên các vũ trụ, thương hiệu, hoặc nhân vật có sẵn (từ anime, manga, game, hay tiểu thuyết của tác giả khác) nhằm tránh các tranh chấp về bản quyền thương mại ngoài đời thực.\n\n4.3. Quy định về tác phẩm hỗ trợ bởi AI:\nCho phép linh hoạt sử dụng công cụ trí tuệ nhân tạo (AI) hỗ trợ viết nội dung, với điều kiện chất lượng văn học, tính logic và trải nghiệm nghệ thuật của tác phẩm phải đạt tiêu chuẩn kiểm duyệt chung của nền tảng. Tác giả bắt buộc phải gắn nhãn/tag AI-Generated ở thông tin chi tiết của tác phẩm. Mọi tác phẩm có sự can thiệp sâu của AI nhưng cố tình giấu nhãn hoặc không khai báo chính xác khi bị phát hiện sẽ bị ẩn hoặc gỡ bỏ vĩnh viễn.",
                    order_index: 40
                },
                {
                    title: "Điều 5. Sửa đổi và Cập nhật Điều khoản",
                    content: "5.1. Quyền sửa đổi:\nBan quản trị MugenBunko giữ quyền sửa đổi, bổ sung hoặc loại bỏ các điều khoản trong quy chế này vào bất kỳ lúc nào để phù hợp với định hướng phát triển của nền tảng.\n\n5.2. Hiệu lực:\nCác thay đổi về quy chế nội dung sẽ có hiệu lực ngay khi được cập nhật chính thức trên hệ thống. Tác giả có trách nhiệm thường xuyên cập nhật và điều chỉnh tác phẩm cho phù hợp với quy chế mới nhất.",
                    order_index: 50
                }
            ];

            for (const r of initialRules) {
                await connectionWithDb.query(
                    "INSERT INTO \`rules\` (title, content, order_index) VALUES (?, ?, ?)",
                    [r.title, r.content, r.order_index]
                );
            }
        }

        // Ensure deleted_novels table exists (migration)
        console.log("Ensuring deleted_novels migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`deleted_novels\` (
                \`id\` INT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`reason\` TEXT NULL,
                \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migration check for deleted_novels completed.");

        // Ensure performance indexes exist (migration)
        console.log("Ensuring database performance indexes exist...");
        const ensureIndexExists = async (tableName: string, indexName: string, sql: string) => {
            const [existing] = await connectionWithDb.query<any[]>(`
                SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND INDEX_NAME = ?
                LIMIT 1
            `, [tableName, indexName]);
            if (existing.length === 0) {
                console.log(`Creating index ${indexName} on ${tableName}...`);
                await connectionWithDb.query(sql);
            }
        };

        await ensureIndexExists('chapters', 'idx_chapters_novel_status', 'CREATE INDEX idx_chapters_novel_status ON chapters (novel_id, status)');
        await ensureIndexExists('chapters', 'idx_chapters_scheduled', 'CREATE INDEX idx_chapters_scheduled ON chapters (scheduled_release)');
        await ensureIndexExists('forum_posts', 'idx_forum_posts_created', 'CREATE INDEX idx_forum_posts_created ON forum_posts (created_at DESC)');
        await ensureIndexExists('forum_posts', 'idx_forum_posts_author', 'CREATE INDEX idx_forum_posts_author ON forum_posts (author_id)');
        await ensureIndexExists('messages', 'idx_messages_unread', 'CREATE INDEX idx_messages_unread ON messages (receiver_id, is_read)');
        await ensureIndexExists('notifications', 'idx_notifications_user_created', 'CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC)');
        console.log("Performance indexes verification completed.");

        await connectionWithDb.end();

        pool = mysql.createPool({
            ...dbConfig,
            database: process.env.DB_NAME || 'mugenbunko',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log("MySQL connection pool established.");
    } catch (err: any) {
        console.error("❌ MySQL connection failure! Please ensure MySQL is running locally and credentials in server/.env are correct.");
        console.error("Error details:", err.message);
        throw err;
    }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
    if (!pool) {
        throw new Error("Database pool not initialized. Call initializeDbConnection first.");
    }
    const [results] = await pool.execute(sql, params);
    return results as T;
}

export default {
    query,
    initializeDbConnection
};
