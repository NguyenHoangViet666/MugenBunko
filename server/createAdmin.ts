import bcrypt from 'bcryptjs';
import db from './db.js';
import './config.js';
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
if (!username || !/^[a-zA-Z0-9_]{3,50}$/.test(username) || !password || password.length < 16 || Buffer.byteLength(password) > 72) {
    throw new Error('Set ADMIN_USERNAME and a unique ADMIN_PASSWORD of 16–72 bytes.');
}
try {
    await db.initializeDbConnection();
    await db.transaction(async connection => {
        const [existing] = await connection.execute<any[]>('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length) throw new Error('User already exists. This command will not overwrite or promote existing accounts.');
        const [insert] = await connection.execute<any[]>('INSERT INTO users (username, password, displayname, status) VALUES (?, ?, ?, ?)', [username, await bcrypt.hash(password, 12), username, 'active']);
        const id = (insert as any).insertId;
        await connection.execute("INSERT INTO user_roles (user_id, role) VALUES (?, 'reader'), (?, 'admin')", [id, id]);
    });
    console.log('Administrator created.');
} finally { await db.closeDbConnection(); }
