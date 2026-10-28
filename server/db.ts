import mysql, { Pool, PoolConnection, type Connection } from 'mysql2/promise';
import { readerSchema } from './readerSchema.js';
import { electionSchema } from './electionSchema.js';
import { initializeCommunityRules } from './communityRulesMigration.js';
import { migrateEmailOtpSchema } from './otpSchemaMigration.js';
import { assertPaymentSchemaReady, migratePaymentSchema } from './paymentSchemaMigration.js';
import { production } from './config.js';
import { invalidatePublicReads } from './utils/readCache.js';
import { databaseMetrics } from './metrics.js';
import { performance } from 'node:perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDocker = fs.existsSync('/.dockerenv');
let dbHost = process.env.DB_HOST || 'localhost';
if (isDocker && (dbHost === 'localhost' || dbHost === '127.0.0.1')) {
    dbHost = 'host.docker.internal';
}

const dbConfig = {
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: 10000,
};

let pool: Pool | null = null;

export async function initializeDbConnection(options: { migrate?: boolean } = {}): Promise<void> {
    invalidatePublicReads();
    const database = process.env.DB_NAME || 'mugenbunko';
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(database)) throw new Error('Invalid DB_NAME');
    const migrate = options.migrate ?? !production;
    const connectionLimit = Number(process.env.DB_POOL_SIZE || 10);
    const queueLimit = Number(process.env.DB_QUEUE_LIMIT || 100);
    if (!Number.isSafeInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100 ||
        !Number.isSafeInteger(queueLimit) || queueLimit < 1 || queueLimit > 10000) throw new Error('Invalid database pool limits.');
    const openPool = () => mysql.createPool({ ...dbConfig, database, waitForConnections: true,
        connectionLimit, queueLimit, maxIdle: Math.min(5, connectionLimit), idleTimeout: 60000 });
    let migrationConnection: Connection | undefined;
    try {
        if (!migrate) {
            if (!process.env.DB_USER || process.env.DB_USER === 'root') throw new Error('Production requires a restricted DB_USER.');
            pool = openPool();
            await pool.execute('SELECT id, email, auth_version FROM users LIMIT 0');
            await pool.execute('SELECT sort_order FROM chapters LIMIT 0');
            await pool.execute('SELECT email, purpose, code_hash, expires_at, sent_at, attempts FROM email_otps LIMIT 0');
            await pool.execute('SELECT token_hash FROM revoked_tokens LIMIT 0');
            await pool.execute('SELECT id, result_snapshot FROM elections LIMIT 0');
            await pool.execute('SELECT id, term_ends_at, ended_at FROM election_candidates LIMIT 0');
            for (const table of ['election_voters','election_ballots','election_reviews','election_complaints']) {
                await pool.execute(`SELECT * FROM ${table} LIMIT 0`);
            }
            await pool.execute('SELECT action FROM election_audit LIMIT 0');
            const schemaConnection = await pool.getConnection();
            try { await assertPaymentSchemaReady(schemaConnection); }
            finally { schemaConnection.release(); }
            return;
        }
        console.log(`Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
        const connection = await mysql.createConnection(dbConfig);
        try { await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`); }
        finally { await connection.end(); }
        console.log(`Database "${process.env.DB_NAME || 'mugenbunko'}" verified/created successfully.`);

        const connectionWithDb = await mysql.createConnection({
            ...dbConfig,
            database: process.env.DB_NAME || 'mugenbunko',
            multipleStatements: true
        });
        migrationConnection = connectionWithDb;

        const [tables] = await connectionWithDb.query<any[]>(`SHOW TABLES LIKE 'users'`);
        if (tables.length === 0) {
            console.log("No tables found. Loading schema.sql...");
            const possibleSchemaPaths = [
                path.join(process.cwd(), 'schema.sql'),
                path.join(process.cwd(), 'server', 'schema.sql'),
                path.join(__dirname, 'schema.sql'),
                path.join(__dirname, '../schema.sql')
            ];
            const schemaSqlPath = possibleSchemaPaths.find(p => fs.existsSync(p)) || path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaSqlPath)) {
                // Bootstrap only table definitions: no hardcoded USE, destructive seed or default admin.
                const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8').split('-- Disable constraints')[0]
                    .replace(/^CREATE DATABASE[^\n]+\r?$/gm, '').replace(/^USE[^\n]+\r?$/gm, '');
                await connectionWithDb.query(schemaSql);
                console.log("Schema created without sample users or destructive seed statements.");
            } else {
                console.warn("schema.sql file not found! Please check path.");
            }
        } else {
            console.log("Existing tables found. Database already initialized.");
        }

        const [emailColumns] = await connectionWithDb.query<any[]>("SHOW COLUMNS FROM users LIKE 'email'");
        if (!emailColumns.length) await connectionWithDb.query('ALTER TABLE users ADD COLUMN email VARCHAR(150) NULL UNIQUE AFTER displayname');
        const [authVersionColumns] = await connectionWithDb.query<any[]>("SHOW COLUMNS FROM users LIKE 'auth_version'");
        if (!authVersionColumns.length) await connectionWithDb.query('ALTER TABLE users ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 0');

        // Ensure read_cooldowns table exists (migration)
        console.log("Ensuring read_cooldowns migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`read_cooldowns\` (
                \`ip_address\` VARCHAR(45) NOT NULL,
                \`novel_id\` INT NOT NULL,
                \`last_read_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`ip_address\`, \`novel_id\`),
                FOREIGN KEY (\`novel_id\`) REFERENCES \`novels\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log("Migration check for read_cooldowns completed.");

        // Ensure parent_id exists in forum_comments (nested forum comments migration)
        console.log("Ensuring parent_id exists in forum_comments table...");
        const [columnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'forum_comments' 
              AND COLUMN_NAME = 'parent_id'
        `);
        if (columnCheck.length === 0) {
            console.log("Adding parent_id column and foreign key to forum_comments table...");
            await connectionWithDb.query(`
                ALTER TABLE \`forum_comments\` 
                ADD COLUMN \`parent_id\` INT NULL DEFAULT NULL,
                ADD CONSTRAINT \`fk_forum_comments_parent\` 
                FOREIGN KEY (\`parent_id\`) REFERENCES \`forum_comments\` (\`id\`) ON DELETE CASCADE;
            `);
            console.log("Migration completed: added parent_id to forum_comments.");
        } else {
            console.log("parent_id already exists in forum_comments. Skipping migration.");
        }

        // Ensure image_url exists in forum_posts (image posts migration)
        console.log("Ensuring image_url exists in forum_posts table...");
        const [postsColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'forum_posts' 
              AND COLUMN_NAME = 'image_url'
        `);
        if (postsColumnCheck.length === 0) {
            console.log("Adding image_url column to forum_posts table...");
            await connectionWithDb.query(`
                ALTER TABLE \`forum_posts\` 
                ADD COLUMN \`image_url\` VARCHAR(500) NULL DEFAULT NULL;
            `);
            console.log("Migration completed: added image_url to forum_posts.");
        } else {
            console.log("image_url already exists in forum_posts. Skipping migration.");
        }

        // Ensure genre column in novels is wide enough (e.g. VARCHAR(500))
        console.log("Checking if genre column in novels needs expansion...");
        const [genreColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'novels' 
              AND COLUMN_NAME = 'genre'
        `);
        if (genreColumnCheck.length > 0 && genreColumnCheck[0].CHARACTER_MAXIMUM_LENGTH < 500) {
            console.log("Expanding genre column in novels table to VARCHAR(500)...");
            await connectionWithDb.query(`
                ALTER TABLE \`novels\` 
                MODIFY COLUMN \`genre\` VARCHAR(500) NOT NULL;
            `);
            console.log("Migration completed: expanded genre column to VARCHAR(500).");
        } else {
            console.log("genre column in novels table is already expanded or not found. Skipping migration.");
        }

        // Ensure status and content exist in events table (events detail migration)
        console.log("Ensuring status and content exist in events table...");
        const [eventsColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'events' 
              AND COLUMN_NAME = 'status'
        `);
        if (eventsColumnCheck.length === 0) {
            console.log("Adding status and content columns to events table...");
            await connectionWithDb.query(`
                ALTER TABLE \`events\` 
                ADD COLUMN \`status\` VARCHAR(50) NOT NULL DEFAULT 'draft',
                ADD COLUMN \`content\` TEXT NULL DEFAULT NULL;
            `);
            console.log("Migration completed: added status and content to events.");
        } else {
            console.log("status and content already exist in events. Skipping migration.");
        }

        // Ensure word_count exists in chapters (migration for word count metrics)
        console.log("Ensuring word_count exists in chapters table...");
        const [chaptersColumnCheck] = await connectionWithDb.query<any[]>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'chapters' 
              AND COLUMN_NAME = 'word_count'
        `);
        if (chaptersColumnCheck.length === 0) {
            console.log("Adding word_count column to chapters table...");
            await connectionWithDb.query(`
                ALTER TABLE \`chapters\` 
                ADD COLUMN \`word_count\` INT NOT NULL DEFAULT 0;
            `);
            console.log("Migration completed: added word_count to chapters.");

            // Backfill word counts for all existing chapters
            console.log("Backfilling word_count for existing chapters...");
            const [existingChapters] = await connectionWithDb.query<any[]>("SELECT id, content FROM chapters");
            for (const ch of existingChapters) {
                const cleanText = (ch.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;
                await connectionWithDb.query("UPDATE chapters SET word_count = ? WHERE id = ?", [wordCount, ch.id]);
            }
            console.log(`Backfilled word counts for ${existingChapters.length} chapters.`);
        } else {
            console.log("word_count already exists in chapters. Skipping migration.");
        }

        // Migration: Update user level & XP from old system to new Rarity system
        console.log("Checking if users migration to new Rarity level system is needed...");
        const [users] = await connectionWithDb.query<any[]>("SELECT id, username, level, xp FROM users");
        
        let needsMigration = false;
        // Check if any user has level > 6 (old level system)
        const hasOldLevels = users.some(u => u.level > 6);
        // Check if all users have xp < 500 but at least one user has level > 1 (old system)
        const allXpLessThan500 = users.every(u => u.xp < 500);
        const hasLevelGreaterThan1 = users.some(u => u.level > 1);

        if (hasOldLevels || (allXpLessThan500 && hasLevelGreaterThan1)) {
            needsMigration = true;
        }

        if (needsMigration) {
            console.log("Starting users level & XP migration to Rarity system...");
            for (const user of users) {
                // Calculate total XP: total_xp = (old_level - 1) * 500 + old_xp
                const totalXp = (user.level - 1) * 500 + user.xp;
                
                // Determine new level index (1 = Tập sự, 2 = C, 3 = UC, 4 = R, 5 = SR, 6 = SSR)
                let newLevel = 1;
                if (totalXp < 500) newLevel = 1;
                else if (totalXp < 2500) newLevel = 2;
                else if (totalXp < 12500) newLevel = 3;
                else if (totalXp < 62500) newLevel = 4;
                else if (totalXp < 625000) newLevel = 5;
                else newLevel = 6;

                await connectionWithDb.query(
                    "UPDATE users SET level = ?, xp = ? WHERE id = ?",
                    [newLevel, totalXp, user.id]
                );
                console.log(`Migrated user @${user.username}: Old Level ${user.level}, Old XP ${user.xp} -> New Level ${newLevel}, Total XP ${totalXp}`);
            }
            console.log("Users level & XP migration completed successfully.");
        } else {
            console.log("Users level & XP are already migrated or up-to-date. Skipping migration.");
        }

        // Ensure rules table exists (migration)
        console.log("Ensuring rules migration table exists...");
        const [existingRulesTables] = await connectionWithDb.query<any[]>("SHOW TABLES LIKE 'rules'");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`rules\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`content\` TEXT NOT NULL,
                \`order_index\` INT DEFAULT 0,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migration check for rules completed.");

        // Ensure genres table exists (migration)
        console.log("Ensuring genres migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`genres\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`name\` VARCHAR(100) UNIQUE NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migration check for genres completed.");

        // Seed initial genres if empty
        const [genresCountCheck] = await connectionWithDb.query<any[]>("SELECT COUNT(*) as count FROM \`genres\`");
        if (genresCountCheck[0].count === 0) {
            console.log("Seeding initial genres into genres table...");
            const defaultGenres = ["Isekai", "Fantasy", "Romance", "Sci-Fi", "Slice of Life"];
            for (const g of defaultGenres) {
                await connectionWithDb.query("INSERT IGNORE INTO \`genres\` (\`name\`) VALUES (?)", [g]);
            }
            console.log("Initial genres seeded successfully.");
        }

        // Seed new installations and upgrade only the untouched five-rule default.
        // An edited or intentionally empty document belongs to the admin.
        const rulesResult = await initializeCommunityRules(connectionWithDb, existingRulesTables.length === 0);
        if (rulesResult !== 'unchanged') console.log(`Community rules ${rulesResult}: 25 articles.`);

        // Ensure deleted_novels table exists (migration)
        console.log("Ensuring deleted_novels migration table exists...");
        await connectionWithDb.query(`
            CREATE TABLE IF NOT EXISTS \`deleted_novels\` (
                \`id\` INT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`reason\` TEXT NULL,
                \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Migration check for deleted_novels completed.");

        // Ensure performance indexes exist (migration)
        console.log("Ensuring database performance indexes exist...");
        const ensureIndexExists = async (tableName: string, indexName: string, sql: string) => {
            const [existing] = await connectionWithDb.query<any[]>(`
                SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND INDEX_NAME = ?
                LIMIT 1
            `, [tableName, indexName]);
            if (existing.length === 0) {
                console.log(`Creating index ${indexName} on ${tableName}...`);
                await connectionWithDb.query(sql);
            }
        };

        await ensureIndexExists('chapters', 'idx_chapters_novel_status', 'CREATE INDEX idx_chapters_novel_status ON chapters (novel_id, status)');
        await ensureIndexExists('chapters', 'idx_chapters_scheduled', 'CREATE INDEX idx_chapters_scheduled ON chapters (scheduled_release)');
        await ensureIndexExists('forum_posts', 'idx_forum_posts_created', 'CREATE INDEX idx_forum_posts_created ON forum_posts (created_at DESC)');
        await ensureIndexExists('forum_posts', 'idx_forum_posts_author', 'CREATE INDEX idx_forum_posts_author ON forum_posts (author_id)');
        await ensureIndexExists('messages', 'idx_messages_unread', 'CREATE INDEX idx_messages_unread ON messages (receiver_id, is_read)');
        await ensureIndexExists('notifications', 'idx_notifications_user_created', 'CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC)');
        await ensureIndexExists('messages', 'idx_messages_conversation', 'CREATE INDEX idx_messages_conversation ON messages (sender_id, receiver_id, id)');
        await ensureIndexExists('messages', 'idx_messages_sender_created', 'CREATE INDEX idx_messages_sender_created ON messages (sender_id, created_at)');
        await ensureIndexExists('novels', 'idx_novels_reads', 'CREATE INDEX idx_novels_reads ON novels (`reads` DESC, id DESC)');
        await ensureIndexExists('forum_posts', 'idx_forum_category_created', 'CREATE INDEX idx_forum_category_created ON forum_posts (category, created_at, id)');
        await ensureIndexExists('novel_tags', 'idx_novel_tags_tag', 'CREATE INDEX idx_novel_tags_tag ON novel_tags (tag, novel_id)');
        console.log("Performance indexes verification completed.");

        const [chapterOrderColumns] = await connectionWithDb.query<any[]>("SHOW COLUMNS FROM chapters LIKE 'sort_order'");
        if (!chapterOrderColumns.length) {
            await connectionWithDb.query('ALTER TABLE chapters ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
            await connectionWithDb.query('UPDATE chapters SET sort_order = id');
        }
        await ensureIndexExists('chapters', 'idx_chapters_public_order', 'CREATE INDEX idx_chapters_public_order ON chapters (novel_id, status, sort_order, id)');
        await connectionWithDb.query(readerSchema);
        if (await migrateEmailOtpSchema(connectionWithDb)) console.log('Legacy email OTP schema upgraded; old codes invalidated.');
        await connectionWithDb.query(electionSchema);
        await ensureIndexExists('election_candidates', 'idx_election_candidate_term', 'CREATE INDEX idx_election_candidate_term ON election_candidates (user_id, decision, ended_at, term_ends_at)');
        await ensureIndexExists('election_candidates', 'idx_election_term_expiry', 'CREATE INDEX idx_election_term_expiry ON election_candidates (decision, ended_at, term_ends_at, election_id)');
        const payments = await migratePaymentSchema(connectionWithDb);
        await assertPaymentSchemaReady(connectionWithDb);
        if (payments.applied.length) console.log(`Payment schema migrated to version ${payments.currentVersion}; balances unchanged.`);
        await connectionWithDb.end();
        migrationConnection = undefined;

        pool = openPool();

        console.log("MySQL connection pool established.");
    } catch (err: any) {
        // Failed readiness must not leave a usable half-initialized pool.
        if (pool) { await pool.end(); pool = null; }
        console.error("❌ MySQL connection failure! Please ensure MySQL is running locally and credentials in server/.env are correct.");
        console.error("Error details:", err.message);
        throw err;
    } finally { await migrationConnection?.end(); }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
    if (!pool) {
        throw new Error("Database pool not initialized. Call initializeDbConnection first.");
    }
    const connection = await acquireConnection();
    const start = performance.now(); databaseMetrics.queries++;
    try {
        const [results] = await connection.execute({ sql, timeout: 15000 }, params);
        return results as T;
    } catch (error) { databaseMetrics.errors++; throw error; }
    finally { databaseMetrics.durationMs += performance.now() - start; databaseMetrics.active--; connection.release(); }
}

async function acquireConnection() {
    if (!pool) throw new Error('Database pool not initialized.');
    const start = performance.now(); databaseMetrics.waiting++;
    try { const connection = await pool.getConnection(); databaseMetrics.active++; return connection; }
    finally { databaseMetrics.waiting--; databaseMetrics.waitMs += performance.now() - start; }
}

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    if (!pool) throw new Error('Database pool not initialized.');
    const connection = await acquireConnection();
    const start = performance.now(); databaseMetrics.transactions++;
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        databaseMetrics.errors++;
        await connection.rollback();
        throw error;
    } finally {
        databaseMetrics.active--; databaseMetrics.durationMs += performance.now() - start;
        connection.release();
    }
}

export async function closeDbConnection() {
    invalidatePublicReads();
    if (pool) { await pool.end(); pool = null; }
}

export default {
    query,
    transaction,
    closeDbConnection,
    initializeDbConnection
};
