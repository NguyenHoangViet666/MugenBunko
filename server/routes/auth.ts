import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { addXpToUser } from '../utils/level.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mugenbunko-super-secret-key-12345';

async function comparePassword(input: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(input, hash);
}

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    try {
        const users = await db.query<any[]>(
            "SELECT * FROM users WHERE username = ?",
            [username.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        const user = users[0];
        
        // Verify password
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        user.avatarSeed = user.avatar_seed;
        if (user.status === 'suspended') {
            return res.status(403).json({ error: "🚫 TÀI KHOẢN BỊ KHÓA: Tài khoản đã bị khóa do vi phạm chính sách cộng đồng." });
        }

        // Get user roles
        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [user.id]);
        user.roles = rolesData.map(r => r.role);

        // Get bookmarks
        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [user.id]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);

        // Get notifications
        const notifs = await db.query<any[]>(
            "SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
            [user.id]
        );
        user.notifications = notifs;

        // Strip password for security
        delete user.password;

        // Sign JWT Token
        const token = jwt.sign({ id: user.id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Lỗi kết nối cơ sở dữ liệu." });
    }
});

// Refresh session endpoint
router.get('/refresh/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;

        // JWT token authorization verification (BOLA and Auth Bypass Fix)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: "Yêu cầu xác thực tài khoản qua Token!" });
        }
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            if (decoded.id !== parseInt(userId)) {
                return res.status(403).json({ error: "Không được phép truy cập phiên của tài khoản khác!" });
            }
        } catch (e) {
            return res.status(403).json({ error: "Phiên làm việc đã hết hạn hoặc không hợp lệ!" });
        }

        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng." });
        }
        const user = users[0];
        user.avatarSeed = user.avatar_seed;

        // Get user roles
        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [user.id]);
        user.roles = rolesData.map(r => r.role);

        // Get bookmarks
        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [user.id]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);

        // Get notifications
        const notifs = await db.query<any[]>(
            "SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", 
            [user.id]
        );
        user.notifications = notifs;

        delete user.password;
        res.json({ user });
    } catch (err) {
        console.error("Refresh session error:", err);
        res.status(500).json({ error: "Lỗi làm mới phiên làm việc." });
    }
});

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
    const { username, displayname, password, role } = req.body;
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !displayname.trim() || !password) {
        return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin đăng ký!" });
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: "Tên đăng nhập chỉ gồm chữ thường không dấu, số và dấu gạch dưới!" });
    }

    // Password strength verification
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Mật khẩu không hợp lệ! Yêu cầu tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ cái viết hoa, 1 chữ số và 1 ký tự đặc biệt!" });
    }

    try {
        // Check duplicate
        const existing = await db.query<any[]>("SELECT id FROM users WHERE username = ?", [cleanUsername]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Tên đăng nhập này đã được sử dụng!" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const avatarSeed = cleanUsername + Math.floor(Math.random() * 100);
        const result = await db.query<any>(
            "INSERT INTO users (username, password, displayname, coins, bio, avatar_seed) VALUES (?, ?, ?, 0, 'Mọt sách chính hiệu của MugenBunko.', ?)",
            [cleanUsername, hashedPassword, displayname.trim(), avatarSeed]
        );
        const userId = result.insertId;

        // Insert role
        await db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'reader')", [userId]);
        if (role === 'author') {
            await db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'author')", [userId]);
        }

        // Insert welcome notification
        await db.query(
            "INSERT INTO notifications (user_id, text) VALUES (?, 'Chào mừng bạn gia nhập MugenBunko! Hãy cùng khám phá thế giới truyện Light Novel kỳ ảo nhé.')",
            [userId]
        );

        // Fetch created user
        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        const user = users[0];
        user.avatarSeed = user.avatar_seed;

        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);
        user.bookmarks = [];
        user.notifications = [{ id: 1, text: "Chào mừng bạn gia nhập MugenBunko! Hãy cùng khám phá thế giới truyện Light Novel kỳ ảo nhé.", read: false, date: "Hôm nay" }];
        
        delete user.password;

        // Sign JWT Token
        const token = jwt.sign({ id: user.id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Lỗi lưu tài khoản mới." });
    }
});

// Update Profile endpoint
router.post('/update-profile', async (req: Request, res: Response) => {
    const { userId, displayname, bio, avatarSeed } = req.body;
    if (!userId || !displayname.trim()) {
        return res.status(400).json({ error: "Thiếu dữ liệu cập nhật thông tin!" });
    }

    try {
        await db.query(
            "UPDATE users SET displayname = ?, bio = ?, avatar_seed = ? WHERE id = ?",
            [displayname.trim(), bio, avatarSeed, userId]
        );

        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        const user = users[0];
        user.avatarSeed = user.avatar_seed;

        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);

        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [userId]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);

        const notifs = await db.query<any[]>("SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        user.notifications = notifs;

        delete user.password;
        res.json({ user });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ error: "Lỗi cập nhật hồ sơ cá nhân." });
    }
});

// Update User Roles with Mutual Exclusion logic and RBAC requesterId checks
router.post('/update-roles', async (req: Request, res: Response) => {
    const { userId, roles, requesterId } = req.body; // roles: Array of strings
    if (!userId || !Array.isArray(roles)) {
        return res.status(400).json({ error: "Thông tin vai trò không hợp lệ!" });
    }

    // Enforce Mutual Exclusion
    if (roles.includes('admin') && roles.includes('moderator')) {
        return res.status(400).json({ error: "Không thể nhận cùng lúc hai chức năng Admin và Moderator!" });
    }

    try {
        let isRequesterAdmin = false;
        if (requesterId) {
            const requesterRoles = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [requesterId]);
            isRequesterAdmin = requesterRoles.map(r => r.role).includes('admin');
        }

        const currentRolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        const currentRoles = currentRolesData.map(r => r.role);
        
        const addsAdminOrMod = (roles.includes('admin') && !currentRoles.includes('admin')) || (roles.includes('moderator') && !currentRoles.includes('moderator'));
        const removesAdminOrMod = (!roles.includes('admin') && currentRoles.includes('admin')) || (!roles.includes('moderator') && currentRoles.includes('moderator'));
        
        if ((addsAdminOrMod || removesAdminOrMod) && !isRequesterAdmin) {
            return res.status(403).json({ error: "Bạn không có thẩm quyền thay đổi chức danh Admin/Moderator!" });
        }

        const addsAuthor = roles.includes('author') && !currentRoles.includes('author');
        const removesAuthor = !roles.includes('author') && currentRoles.includes('author');
        if ((addsAuthor || removesAuthor) && !isRequesterAdmin && requesterId !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền thay đổi chức danh Tác giả cho người dùng khác!" });
        }

        // Delete current roles
        await db.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);

        // Insert new roles in a single batch query
        if (roles.length > 0) {
            const valuesPlaceholder = roles.map(() => "(?, ?)").join(", ");
            const params: any[] = [];
            roles.forEach((r: string) => {
                params.push(userId, r);
            });
            await db.query(`INSERT INTO user_roles (user_id, role) VALUES ${valuesPlaceholder}`, params);
        }

        // Handle author_request status sync
        if (addsAuthor) {
            const users = await db.query<any[]>("SELECT author_request FROM users WHERE id = ?", [userId]);
            if (users.length > 0 && users[0].author_request === 'pending') {
                await db.query("UPDATE users SET author_request = 'approved' WHERE id = ?", [userId]);
                await db.query(
                    "INSERT INTO notifications (user_id, text) VALUES (?, '🎉 Chúc mừng! Yêu cầu cấp quyền Tác giả của bạn đã được Admin phê duyệt.')",
                    [userId]
                );
            }
        }

        // Fetch updated user
        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        const user = users[0];
        user.avatarSeed = user.avatar_seed;

        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);

        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [userId]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);

        const notifs = await db.query<any[]>("SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        user.notifications = notifs;

        delete user.password;
        res.json({ user });
    } catch (err) {
        console.error("Update roles error:", err);
        res.status(500).json({ error: "Lỗi cập nhật chức vụ người dùng." });
    }
});

// Request author role
router.post('/request-author-role', async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "Thông tin tài khoản không hợp lệ!" });
    }

    try {
        await db.query("UPDATE users SET author_request = 'pending' WHERE id = ?", [userId]);
        
        // Fetch requester username for notification
        const users = await db.query<any[]>("SELECT username, displayname FROM users WHERE id = ?", [userId]);
        if (users.length > 0) {
            const username = users[0].username;
            // Notify all admins using a single SQL INSERT SELECT query (database-side bulk insert)
            await db.query(
                `INSERT INTO notifications (user_id, text)
                 SELECT user_id, ? FROM user_roles WHERE role = 'admin'`,
                [`🔔 Người dùng @${username} vừa gửi yêu cầu xin cấp quyền Tác giả (Author).`]
            );
        }

        // Return updated user
        const refreshed = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        const user = refreshed[0];
        user.avatarSeed = user.avatar_seed;
        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);
        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [userId]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);
        const notifs = await db.query<any[]>("SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        user.notifications = notifs;
        delete user.password;

        res.json({ user });
    } catch (err) {
        console.error("Request author role error:", err);
        res.status(500).json({ error: "Lỗi gửi yêu cầu làm tác giả." });
    }
});

// Reject author request
router.post('/reject-author-request', async (req: Request, res: Response) => {
    const { targetUserId, requesterId } = req.body;
    if (!targetUserId || !requesterId) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ!" });
    }

    try {
        // RBAC check: requester must be admin
        const requesterRoles = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [requesterId]);
        const isRequesterAdmin = requesterRoles.map(r => r.role).includes('admin');
        if (!isRequesterAdmin) {
            return res.status(403).json({ error: "Chỉ Admin mới có quyền từ chối yêu cầu!" });
        }

        await db.query("UPDATE users SET author_request = 'rejected' WHERE id = ?", [targetUserId]);
        await db.query(
            "INSERT INTO notifications (user_id, text) VALUES (?, '❌ Rất tiếc, yêu cầu cấp quyền Tác giả của bạn đã bị Quản trị viên từ chối.')",
            [targetUserId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Reject author request error:", err);
        res.status(500).json({ error: "Lỗi xử lý từ chối yêu cầu." });
    }
});

// Get user detail (for public profile display)
router.get('/user/:username', async (req: Request, res: Response) => {
    try {
        const users = await db.query<any[]>("SELECT id, username, displayname, avatar_seed as avatarSeed, bio, xp, DATE_FORMAT(date_joined, '%d/%m/%Y') as dateJoined FROM users WHERE username = ?", [req.params.username]);
        if (users.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng." });
        }
        const user = users[0];
        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [user.id]);
        user.roles = rolesData.map(r => r.role);
        res.json({ user });
    } catch (err) {
        console.error("Get user public profile error:", err);
        res.status(500).json({ error: "Lỗi truy vấn thông tin người dùng." });
    }
});

// Notifications Read mark
router.post('/notifications/read-all', async (req: Request, res: Response) => {
    const { userId } = req.body;
    try {
        await db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi đánh dấu thông báo." });
    }
});

// Coin deposits (Disabled - MugenBunko is now non-profit)
router.post('/deposit-coins', async (req: Request, res: Response) => {
    return res.status(403).json({ error: "Chức năng nạp coin đã bị tắt do nền tảng đã chuyển đổi thành phi lợi nhuận!" });
});

// EXP Reward for reading
router.post('/add-xp', async (req: Request, res: Response) => {
    const { userId, xp } = req.body;
    try {
        const { alertLevelUp } = await addXpToUser(userId, xp);
        
        // Fetch updated user to return to frontend
        const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng." });
        }
        const user = users[0];
        user.avatarSeed = user.avatar_seed;

        const rolesData = await db.query<any[]>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
        user.roles = rolesData.map(r => r.role);
        const bookmarksData = await db.query<any[]>("SELECT novel_id FROM bookmarks WHERE user_id = ?", [userId]);
        user.bookmarks = bookmarksData.map(b => b.novel_id);
        const notifs = await db.query<any[]>("SELECT id, text, is_read as `read`, DATE_FORMAT(created_at, '%d/%m/%Y') as date FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        user.notifications = notifs;
        delete user.password;

        res.json({ user, alertLevelUp });
    } catch (err) {
        res.status(500).json({ error: "Lỗi đồng bộ kinh nghiệm." });
    }
});

// Follow author
router.post('/follow-author', async (req: Request, res: Response) => {
    const { followerId, authorUsername } = req.body;
    try {
        const authors = await db.query<any[]>("SELECT id FROM users WHERE username = ?", [authorUsername]);
        if (authors.length === 0) return res.status(404).json({ error: "Không tìm thấy tác giả." });
        const authorId = authors[0].id;

        const check = await db.query<any[]>("SELECT 1 FROM follows WHERE follower_id = ? AND author_id = ?", [followerId, authorId]);
        if (check.length > 0) {
            await db.query("DELETE FROM follows WHERE follower_id = ? AND author_id = ?", [followerId, authorId]);
        } else {
            await db.query("INSERT INTO follows (follower_id, author_id) VALUES (?, ?)", [followerId, authorId]);
        }
        
        // Return followed list
        const follows = await db.query<any[]>("SELECT u.username FROM follows f JOIN users u ON f.author_id = u.id WHERE f.follower_id = ?", [followerId]);
        res.json({ followedAuthors: follows.map(f => f.username) });
    } catch (err) {
        res.status(500).json({ error: "Lỗi theo dõi tác giả." });
    }
});

// Get author followed list
router.get('/follows/:id', async (req: Request, res: Response) => {
    try {
        const follows = await db.query<any[]>("SELECT u.username FROM follows f JOIN users u ON f.author_id = u.id WHERE f.follower_id = ?", [req.params.id]);
        res.json(follows.map(f => f.username));
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách theo dõi." });
    }
});

export default router;
