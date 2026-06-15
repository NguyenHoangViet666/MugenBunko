import express from 'express';
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

dotenv.config();

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

// Security configuration: CORS Origin Hardening
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    process.env.FRONTEND_URL
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        } else {
            return callback(new Error('CORS Policy: Request from this origin is not allowed!'));
        }
    },
    credentials: true
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
app.use(cors(corsOptions));
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

// Start Server
app.listen(PORT, async () => {
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
