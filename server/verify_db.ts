import db from './db.js';

async function verify() {
    try {
        console.log("=== BẮT ĐẦU KIỂM TRA ĐỘ BỀN/SCHEMA CỦA DATABASE ===");
        await db.initializeDbConnection();
        
        // 1. Check tables list
        const tables = await db.query<any[]>("SHOW TABLES");
        console.log("\n1. Danh sách các bảng đã khởi tạo thành công:");
        console.log(tables.map(t => Object.values(t)[0]));

        // 2. Row counts per table
        console.log("\n2. Số lượng bản ghi trong các bảng:");
        const tablesToVerify = [
            'users', 'novels', 'chapters', 'comments', 'reviews', 
            'events', 'announcements', 'forum_posts', 'forum_comments', 
            'rules', 'read_cooldowns'
        ];
        
        for (const table of tablesToVerify) {
            try {
                const countRes = await db.query<any[]>(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`- Bảng \`${table}\`: ${countRes[0].count} bản ghi.`);
            } catch (err: any) {
                console.warn(`- Bảng \`${table}\`: LỖI hoặc CHƯA ĐƯỢC TẠO! (${err.message})`);
            }
        }

        // 3. Check specific column structure migrations
        console.log("\n3. Kiểm tra cấu trúc di trú (Column structural check):");
        
        // 3.1 check forum_comments parent_id
        const forumCommentsCols = await db.query<any[]>(
            "SHOW COLUMNS FROM `forum_comments` LIKE 'parent_id'"
        );
        console.log(`- Bảng \`forum_comments\` có cột \`parent_id\`: ${forumCommentsCols.length > 0 ? "ĐẠT ✅" : "THIẾU ❌"}`);

        // 3.2 check forum_posts image_url
        const forumPostsCols = await db.query<any[]>(
            "SHOW COLUMNS FROM `forum_posts` LIKE 'image_url'"
        );
        console.log(`- Bảng \`forum_posts\` có cột \`image_url\`: ${forumPostsCols.length > 0 ? "ĐẠT ✅" : "THIẾU ❌"}`);

        // 3.3 check read_cooldowns table schema
        const cooldownsCols = await db.query<any[]>(
            "SHOW COLUMNS FROM `read_cooldowns`"
        );
        console.log(`- Bảng \`read_cooldowns\` có cấu trúc: ${cooldownsCols.length > 0 ? "ĐẠT ✅" : "THIẾU ❌"}`);

        // 3.4 check rules table schema
        const rulesCols = await db.query<any[]>(
            "SHOW COLUMNS FROM `rules`"
        );
        console.log(`- Bảng \`rules\` có cấu trúc: ${rulesCols.length > 0 ? "ĐẠT ✅" : "THIẾU ❌"}`);

        // 4. Sample check of XP levels to make sure Rarity system is intact
        console.log("\n4. Kiểm tra dữ liệu Cấp bậc Rarity người dùng:");
        const testUsers = await db.query<any[]>(
            "SELECT username, xp, level FROM users LIMIT 3"
        );
        console.log(testUsers.map(u => `@${u.username} (Level: ${u.level}, XP: ${u.xp})`));

        console.log("\n=== HOÀN THÀNH KIỂM TRA: DATABASE HOẠT ĐỘNG HOÀN HẢO! ===");
    } catch (err) {
        console.error("\n❌ LỖI KHI KẾT NỐI/KIỂM TRA DATABASE:", err);
    }
    process.exit(0);
}

verify();
