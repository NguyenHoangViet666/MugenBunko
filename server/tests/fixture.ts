import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export async function startFixture() {
    const base = fileURLToPath(new URL('../../', import.meta.url));
    const root = fs.existsSync(path.join(base, 'src')) ? base : path.dirname(base);
    dotenv.config({ path: path.join(root, 'server/.env'), quiet: true } as any);
    dotenv.config({ path: path.join(root, '.env'), quiet: true } as any);
    const database = `mugenbunko_test_${randomBytes(8).toString('hex')}`;
    const admin = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true });
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
    process.env.DB_NAME = database;
    await admin.query(`USE \`${database}\``);
    const schema = fs.readFileSync(path.join(root, 'server/schema.sql'), 'utf8')
        .replace(/^CREATE DATABASE[^\n]+\r?$/gm, '').replace(/^USE[^\n]+\r?$/gm, '');
    await admin.query(schema);
    const { default: db } = await import('../db.js');
    await db.initializeDbConnection();
    await db.query(`INSERT INTO users (id, username, password, displayname, xp, status) VALUES
        (2, 'upgrade_reader', 'test-only', 'Độc giả thử nghiệm', 0, 'active'),
        (3, 'upgrade_other', 'test-only', 'Độc giả khác', 0, 'active')`);
    await db.query("INSERT INTO user_roles (user_id, role) VALUES (2, 'reader'), (2, 'author'), (3, 'reader')");
    await db.query(`INSERT INTO novels (id, title, author_id, genre, summary, status, type, \`reads\`) VALUES
        (1, 'Những ngày dưới tán anh đào', 2, 'Fantasy', 'Một câu chuyện dành cho những buổi chiều yên tĩnh. Hành trình tìm về thư viện vô tận và những ký ức đã đánh rơi.', 'ongoing', 'series', 42),
        (2, 'Bản thảo riêng tư', 3, 'Fantasy', 'Một bản thảo chưa xuất bản.', 'ongoing', 'series', 0)`);
    const content = Array.from({ length: 60 }, (_, i) => `<p>Đoạn ${i + 1}. Gió xuân lướt qua những tán anh đào bên cửa sổ thư viện. Cô mở trang sách, lắng nghe tiếng giấy và bước tiếp vào một câu chuyện chưa có hồi kết. Những ký ức nhỏ bé ấy sẽ dẫn cô đến nơi mình thuộc về.</p>`).join('');
    await db.query(`INSERT INTO chapters (id, novel_id, volume_name, title, content, status, word_count) VALUES
        (1, 1, 'Tập 01', 'Chương 1: Một lá thư mùa xuân', ?, 'published', 3000),
        (2, 1, 'Tập 01', 'Chương 2: Khu vườn sau thư viện', ?, 'published', 3000),
        (3, 2, 'Tập 01', 'Chương chưa xuất bản', '<p>Riêng tư</p>', 'draft', 2)`, [content, content]);
    await db.query('INSERT INTO bookmarks (user_id, novel_id) VALUES (2, 1)');
    const app = express(); app.use(cors()); app.use(express.json({ limit: '10mb' }));
    for (const name of ['reader', 'library', 'chapters', 'auth', 'novels', 'events', 'announcements', 'comments', 'reviews', 'social', 'forum']) {
        const route = await import(`../routes/${name}.js`); app.use(`/api/${name}`, route.default);
    }
    app.get('/api/genres', (_req, res) => res.json([{ name: 'Fantasy' }, { name: 'Romance' }]));
    app.use(express.static(path.join(root, 'public'))); app.use(express.static(path.join(root, 'dist')));
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No fixture port');
    const url = `http://127.0.0.1:${address.port}`;
    const token = (id: number) => jwt.sign({ id, username: id === 2 ? 'upgrade_reader' : 'upgrade_other', roles: id === 2 ? ['reader', 'author'] : ['reader'] },
        process.env.JWT_SECRET || 'mugenbunko-super-secret-key-12345', { expiresIn: '1h' });
    const user = { id: 2, username: 'upgrade_reader', displayname: 'Độc giả thử nghiệm', coins: 0, xp: 0, level: 1,
        status: 'active', roles: ['reader', 'author'], bookmarks: [1], notifications: [], avatarSeed: 'reader', bio: '', author_request: null };
    return { url, db, token, user, root, async close() {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await db.closeDbConnection();
        if (!/^mugenbunko_test_[a-f0-9]{16}$/.test(database)) throw new Error('Unsafe test database name');
        await admin.query(`DROP DATABASE \`${database}\``); await admin.end();
    } };
    } catch (error) {
        const { closeDbConnection } = await import('../db.js');
        await closeDbConnection();
        if (/^mugenbunko_test_[a-f0-9]{16}$/.test(database)) await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.end();
        throw error;
    }
}
