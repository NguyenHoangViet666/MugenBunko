import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mugenbunko'
};

async function resetCovers() {
    let connection;
    try {
        console.log("Connecting to database...");
        connection = await mysql.createConnection(dbConfig);
        
        // Update all novels to use the new default cover
        console.log("Updating all novels' cover fields to default...");
        const [result] = await connection.query("UPDATE novels SET cover = 'assets/default_novel_cover.png'");
        console.log(`Successfully updated ${result.affectedRows} novels in the database.`);

        // Delete uploaded cover files from uploads folder
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let deletedCount = 0;
            for (const file of files) {
                if (file.startsWith('cover_')) {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    deletedCount++;
                }
            }
            console.log(`Deleted ${deletedCount} uploaded cover files from ${uploadsDir} directory.`);
        } else {
            console.log("Uploads directory not found. Skipping file cleanup.");
        }

        console.log("Reset completed successfully!");
    } catch (err) {
        console.error("Error running reset script:", err);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetCovers();
