import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import db, { initializeDbConnection } from './db.js';
import { requestLogger } from './middleware/logger.js';

// Route Imports
import authRouter from './routes/auth.js';
import novelsRouter from './routes/novels.js';
import chaptersRouter from './routes/chapters.js';
import commentsRouter from './routes/comments.js';
import reviewsRouter from './routes/reviews.js';

import eventsRouter from './routes/events.js';
import announcementsRouter from './routes/announcements.js';
import modRouter from './routes/mod.js';
import adminRouter from './routes/admin.js';
import forumRouter from './routes/forum.js';
import socialRouter from './routes/social.js';
import policiesRouter from './routes/policies.js';
import { authenticateToken } from './middleware/auth.js';
import { checkRole } from './middleware/roles.js';

const envPath = fs.existsSync(path.join(process.cwd(), '.env'))
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');
dotenv.config({ path: envPath });

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log("[Storage] Cloudinary storage configured successfully.");
} else {
    console.log("[Storage] Cloudinary not configured. Falling back to local disk storage.");
}

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            callback(null, true);
        },
        credentials: true
    }
});

// Active Socket Connections map
const activeSockets = new Map<number, string>(); // userId -> socketId
const socketUsers = new Map<string, number>(); // socketId -> userId

// Security configuration: CORS Origin Hardening
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    process.env.FRONTEND_URL
].filter(Boolean) as string[];

const corsOptionsDelegate = (req: express.Request, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
    const origin = req.header('Origin');
    let corsOptions: cors.CorsOptions = { credentials: true, origin: false };

    if (!origin) {
        corsOptions.origin = true;
    } else {
        let isAllowed = false;
        try {
            const originUrl = new URL(origin);
            const reqHost = req.header('host');
            if (originUrl.host === reqHost) {
                isAllowed = true;
            }
        } catch (e) {}

        if (!isAllowed) {
            if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
                isAllowed = true;
            }
        }

        if (isAllowed) {
            corsOptions.origin = true;
        } else {
            console.warn(`[CORS Blocked] Origin "${origin}" is not allowed. Host: "${req.header('host')}". Allowed origins:`, allowedOrigins);
            corsOptions.origin = false;
        }
    }
    callback(null, corsOptions);
};

// Rate Limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: "Bạn đã gửi quá nhiều yêu cầu! Vui lòng thử lại sau 15 phút." },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: { error: "Bạn đã thử đăng nhập hoặc đăng ký quá nhiều lần! Vui lòng thử lại sau 5 phút." },
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
    message: { error: "Bạn đã tải lên quá nhiều hình ảnh! Vui lòng thử lại sau 10 phút." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Global Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Turn off for unified frontend assets hosting / dev mode ease
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptionsDelegate));
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/upload', async (req, res) => {
    const { image, type } = req.body;
    if (!image) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu ảnh!" });
    }

    try {
        if (isCloudinaryConfigured) {
            // Upload directly to Cloudinary using the base64 data URI string
            const uploadResult = await cloudinary.uploader.upload(image, {
                folder: 'mugenbunko',
                resource_type: 'auto'
            });
            return res.json({ url: uploadResult.secure_url });
        }

        // Local disk fallback
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: "Định dạng dữ liệu ảnh không hợp lệ!" });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let ext = 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';

        const filename = `${type || 'img'}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);

        await fs.promises.writeFile(filepath, buffer);

        const host = req.get('host') || 'localhost:5000';
        const protocol = req.protocol || 'http';
        const url = `${protocol}://${host}/uploads/${filename}`;
        res.json({ url });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Lỗi lưu trữ hình ảnh." });
    }
});

// Mount API Routers
app.use('/api/auth', authRouter);
app.use('/api/novels', novelsRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/reviews', reviewsRouter);

app.use('/api/events', eventsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/mod', authenticateToken, checkRole('moderator'), modRouter);
app.use('/api/admin', authenticateToken, checkRole('admin'), adminRouter);
app.use('/api/forum', forumRouter);
app.use('/api/social', socialRouter);
app.use('/api/policies', policiesRouter);

// Public genres endpoint
app.get('/api/genres', async (req, res) => {
    try {
        const results = await db.query<any[]>("SELECT name FROM \`genres\` ORDER BY name ASC");
        res.json(results);
    } catch (err) {
        console.error("Error fetching genres:", err);
        res.status(500).json({ error: "Lỗi tải thể loại từ máy chủ." });
    }
});

// Serve frontend static files in production (unified hosting)
const possibleDistPaths = [
    path.join(__dirname, '../../dist'),
    path.join(__dirname, '../dist'),
    path.join(process.cwd(), 'dist')
];
const distPath = possibleDistPaths.find(p => fs.existsSync(p));
if (distPath) {
    console.log(`[Static] Serving frontend static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.log(`[Static] Frontend static assets (dist/) not found. Running in API-only mode.`);
}

// Socket.io Handshake Middleware (JWT Authentication)
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
        return next(new Error("Xác thực thất bại: Không có token!"));
    }
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_mugen_key_dev';
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number, username: string };
        socket.data.user = decoded;
        next();
    } catch (err) {
        return next(new Error("Xác thực thất bại: Token không hợp lệ!"));
    }
});

// Helper to broadcast status changes to friends
async function broadcastStatusToFriends(userId: number, status: 'online' | 'offline') {
    try {
        const rows = await db.query<any[]>(
            `SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END AS friend_id 
             FROM friends 
             WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'`,
            [userId, userId, userId]
        );
        
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const friendSocketId = activeSockets.get(row.friend_id);
                if (friendSocketId) {
                    io.to(friendSocketId).emit('friend_status_change', {
                        userId,
                        status
                    });
                }
            });
        }
    } catch (err) {
        console.error("[Socket] Error broadcasting status:", err);
    }
}

// Socket.io Event Handlers
io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user || !user.id) {
        socket.disconnect();
        return;
    }
    
    // Track new connection
    activeSockets.set(user.id, socket.id);
    socketUsers.set(socket.id, user.id);
    console.log(`[Socket] User ${user.username} (ID: ${user.id}) connected. Socket ID: ${socket.id}`);
    
    // Broadcast that this user is now online
    broadcastStatusToFriends(user.id, 'online');
    
    // Handle sending message in real-time
    socket.on('send_message', async (data: { receiverId: number, messageText: string }, callback) => {
        try {
            const { receiverId, messageText } = data;
            if (!receiverId || !messageText || !messageText.trim()) {
                if (callback) callback({ success: false, error: "Nội dung tin nhắn không hợp lệ." });
                return;
            }
            
            // Insert into the database
            const result = await db.query<any>(
                "INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)",
                [user.id, receiverId, messageText.trim()]
            );
            
            const insertId = result.insertId;
            const message = {
                id: insertId,
                sender_id: user.id,
                receiver_id: receiverId,
                message_text: messageText.trim(),
                is_read: 0,
                created_at: new Date()
            };
            
            // Deliver to recipient via socket if they are online
            const recipientSocketId = activeSockets.get(receiverId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', message);
            }
            
            if (callback) callback({ success: true, message });
        } catch (err) {
            console.error("[Socket] Error saving/sending message:", err);
            if (callback) callback({ success: false, error: "Lỗi hệ thống khi gửi tin nhắn." });
        }
    });
    
    // Handle checking online status of user IDs
    socket.on('check_online_status', (userIds: number[], callback) => {
        if (!Array.isArray(userIds)) {
            if (callback) callback({});
            return;
        }
        const statuses: { [key: number]: boolean } = {};
        userIds.forEach(id => {
            statuses[id] = activeSockets.has(id);
        });
        if (callback) callback(statuses);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`[Socket] User ${user.username} (ID: ${user.id}) disconnected.`);
        activeSockets.delete(user.id);
        socketUsers.delete(socket.id);
        
        // Broadcast that this user is now offline
        broadcastStatusToFriends(user.id, 'offline');
    });
});

// Start Server
httpServer.listen(PORT, async () => {
    console.log(`Server starting on port ${PORT}...`);
    try {
        await initializeDbConnection();
        console.log(`🚀 MUGENBUNKO Express Server running on http://localhost:${PORT}`);

        // Auto-publish scheduled chapters whose release time has passed
        setInterval(async () => {
            try {
                const now = new Date();
                const result = await db.query<any>(
                    "UPDATE chapters SET status = 'published' WHERE status = 'scheduled' AND scheduled_release <= ?",
                    [now]
                );
                if (result && result.affectedRows > 0) {
                    console.log(`[Scheduler] Auto-published ${result.affectedRows} scheduled chapters.`);
                }
            } catch (err) {
                console.error("[Scheduler] Error publishing scheduled chapters:", err);
            }
        }, 30000); // Check every 30 seconds

    } catch (err) {
        console.error("Critical: Could not connect to database on startup.");
    }
});
// Touch to restart server again

