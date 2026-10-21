import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerRealtime } from './realtime.js';
import { configureSecurity, apiErrorHandler } from './middleware/security.js';
import { isAllowedOrigin } from './config.js';
import { uploadRouter } from './routes/upload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
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
import readerRouter from './routes/reader.js';
import libraryRouter from './routes/library.js';
import { authenticateToken } from './middleware/auth.js';
import { checkRole } from './middleware/roles.js';


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
        maxHttpBufferSize: 64 * 1024,
        cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
        allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
    });
    configureSecurity(app);
app.use(requestLogger);
app.get('/healthz', async (_req, res) => {
    try { await db.query('SELECT 1'); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'unavailable' }); }
});
    registerRealtime(io);
    const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROJECT_DIR = path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '../..') : path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_DIR, 'public');
const PUBLIC_ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/assets', express.static(PUBLIC_ASSETS_DIR));
app.use(express.static(PUBLIC_DIR));

app.use('/api/upload', uploadRouter(UPLOADS_DIR, isCloudinaryConfigured));

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
app.use('/api/reader', readerRouter);
app.use('/api/library', libraryRouter);

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

app.use('/api', (_req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
app.use(apiErrorHandler);
let scheduler: ReturnType<typeof setInterval> | undefined;
async function start() {
    await initializeDbConnection();
    await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(PORT, () => { httpServer.removeListener('error', reject); resolve(); });
    });
    console.log('MugenBunko server ready on port ' + PORT);
    scheduler = setInterval(async () => {
        try { await db.query("UPDATE chapters SET status = 'published' WHERE status = 'scheduled' AND scheduled_release <= CURRENT_TIMESTAMP"); }
        catch { console.error('Scheduled publishing failed.'); }
    }, 30000);
}
async function shutdown() {
    clearInterval(scheduler);
    const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref();
    io.close(async () => {
        try { await db.closeDbConnection(); clearTimeout(deadline); process.exitCode = 0; }
        catch { process.exitCode = 1; }
    });
}
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
start().catch(() => { console.error('Server startup failed. Check configuration and run database migrations before starting.'); process.exitCode = 1; void db.closeDbConnection(); });
