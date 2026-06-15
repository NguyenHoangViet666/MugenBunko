import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`Database "${dbName}" dropped successfully.`);
    await connection.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
