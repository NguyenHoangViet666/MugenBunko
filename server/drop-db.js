import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { acquireDemoWriteGuard } from './paymentResetGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    };

    console.log(`Connecting to MySQL to drop database...`);
    const connection = await mysql.createConnection(dbConfig);
    const dbName = process.env.DB_NAME || 'mugenbunko';
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(dbName)) throw new Error('Invalid DB_NAME.');
    try {
        const [databases] = await connection.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?', [dbName]);
        if (databases.length) {
            await connection.query(`USE \`${dbName}\``);
            await acquireDemoWriteGuard(connection);
            await connection.query(`DROP DATABASE \`${dbName}\``);
        }
    } finally { await connection.end(); }
    console.log(`Database "${dbName}" dropped successfully.`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
