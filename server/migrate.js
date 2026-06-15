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
        database: process.env.DB_NAME || 'mugenbunko',
    };

    console.log(`Connecting to database to run migrations...`);
    const connection = await mysql.createConnection(dbConfig);
    
    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`forum_posts\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`title\` VARCHAR(255) NOT NULL,
            \`content\` TEXT NOT NULL,
            \`author_id\` INT NOT NULL,
            \`category\` VARCHAR(50) NOT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`author_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);
    
    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`forum_comments\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`post_id\` INT NOT NULL,
            \`user_id\` INT NOT NULL,
            \`text\` TEXT NOT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`post_id\`) REFERENCES \`forum_posts\` (\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`friends\` (
            \`user_id_1\` INT NOT NULL,
            \`user_id_2\` INT NOT NULL,
            \`status\` VARCHAR(20) DEFAULT 'pending',
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`user_id_1\`, \`user_id_2\`),
            FOREIGN KEY (\`user_id_1\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`user_id_2\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`messages\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`sender_id\` INT NOT NULL,
            \`receiver_id\` INT NOT NULL,
            \`message_text\` TEXT NOT NULL,
            \`is_read\` BOOLEAN DEFAULT FALSE,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS \`forum_post_likes\` (
            \`post_id\` INT NOT NULL,
            \`user_id\` INT NOT NULL,
            PRIMARY KEY (\`post_id\`, \`user_id\`),
            FOREIGN KEY (\`post_id\`) REFERENCES \`forum_posts\` (\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    `);

    console.log(`All migrations executed successfully.`);
    await connection.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
