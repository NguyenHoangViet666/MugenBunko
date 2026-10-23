import type { Connection, RowDataPacket } from 'mysql2/promise';

type Column = RowDataPacket & { Field: string; Type: string };

// CREATE TABLE IF NOT EXISTS does not upgrade the old plaintext OTP table.
// Old codes are invalidated rather than copied into the new hashed-code format.
export async function migrateEmailOtpSchema(connection: Connection) {
    const [columns] = await connection.query<Column[]>('SHOW COLUMNS FROM email_otps');
    const fields = new Map(columns.map(column => [column.Field, column.Type.toLowerCase()]));
    const changes: string[] = [];
    if (!fields.has('purpose')) changes.push("ADD COLUMN purpose VARCHAR(32) NOT NULL DEFAULT 'registration'", 'DROP PRIMARY KEY', 'ADD PRIMARY KEY (email, purpose)');
    if (!fields.has('code_hash')) changes.push("ADD COLUMN code_hash CHAR(64) NOT NULL DEFAULT ''");
    if (!fields.has('sent_at')) changes.push('ADD COLUMN sent_at BIGINT NOT NULL DEFAULT 0');
    if (!fields.has('attempts')) changes.push('ADD COLUMN attempts INT NOT NULL DEFAULT 0');
    if (!fields.get('expires_at')?.startsWith('bigint')) changes.push('MODIFY COLUMN expires_at BIGINT NOT NULL DEFAULT 0');
    if (fields.has('otp_code')) changes.push('DROP COLUMN otp_code');
    if (changes.length) await connection.query(`ALTER TABLE email_otps ${changes.join(', ')}`);

    // Also finishes invalidation after an interrupted previous migration.
    // Valid hashes and current cooldowns survive repeated initialization.
    await connection.query("UPDATE email_otps SET expires_at = 0, sent_at = 0, attempts = 0 WHERE code_hash = '' AND (expires_at <> 0 OR sent_at <> 0 OR attempts <> 0)");
    const [indexes] = await connection.query<RowDataPacket[]>('SHOW INDEX FROM email_otps');
    if (!indexes.some(index => index.Column_name === 'expires_at' && index.Seq_in_index === 1)) {
        await connection.query('CREATE INDEX idx_email_otps_expiry ON email_otps (expires_at)');
    }
    return changes.length > 0;
}
