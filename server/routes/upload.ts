import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';

export function decodeImage(image: unknown) {
    if (typeof image !== 'string' || image.length > 7 * 1024 * 1024) return null;
    const match = image.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) return null;
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer.toString('base64') !== match[2]) return null;
    const format = match[1];
    const valid = format === 'png' ? buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && buffer.subarray(12, 16).toString() === 'IHDR'
        : format === 'jpeg' ? buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer.subarray(-2).equals(Buffer.from('ffd9', 'hex'))
        : format === 'gif' ? buffer.length >= 13 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())
        : buffer.length >= 16 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    return valid ? { buffer, extension: format === 'jpeg' ? 'jpg' : format } : null;
}

export function uploadRouter(directory: string, useCloudinary: boolean) {
    const router = Router();
    router.use(authenticateToken, rateLimit({ windowMs: 10 * 60000, limit: 15, standardHeaders: true, legacyHeaders: false }));
    router.post('/', async (req, res) => {
        const image = decodeImage(req.body.image);
        if (!image || (req.body.type !== undefined && (typeof req.body.type !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(req.body.type)))) return res.status(400).json({ error: 'Ảnh phải là PNG, JPEG, GIF hoặc WebP hợp lệ, tối đa 5 MB.' });
        try {
            if (useCloudinary) {
                const result = await cloudinary.uploader.upload(req.body.image, { folder: 'mugenbunko', resource_type: 'image', timeout: 15000 });
                return res.json({ url: result.secure_url });
            }
            const filename = `${randomUUID()}.${image.extension}`;
            await fs.mkdir(directory, { recursive: true });
            await fs.writeFile(path.join(directory, filename), image.buffer, { flag: 'wx' });
            const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
            res.json({ url: new URL('/uploads/' + filename, base).href });
        } catch { res.status(503).json({ error: 'Không thể lưu ảnh lúc này.' }); }
    });
    return router;
}
