import type { Connection, RowDataPacket } from 'mysql2/promise';

/** Caller must insert the user and opening on the SAME transaction/connection. */
export async function recordNewUserOpening(connection: Connection, userId: number) {
    const [versions] = await connection.execute<RowDataPacket[]>(
        "SELECT status FROM payment_schema_migrations WHERE version=2 FOR SHARE");
    if (versions[0]?.status !== 'applied') throw new Error('Wallet migration is not ready for account creation.');
    const [users] = await connection.execute<RowDataPacket[]>('SELECT coins FROM users WHERE id=? FOR UPDATE', [userId]);
    if (users.length !== 1 || users[0].coins !== 0) throw new Error('A new account must start at zero coins.');
    await connection.execute(`INSERT INTO wallet_entries
        (user_id,entry_type,delta_coins,balance_after,reason,migration_key,created_at)
        VALUES (?,'opening_balance',0,0,'Opening balance for new account',?,UTC_TIMESTAMP(3))`, [userId, `opening:v1:${userId}`]);
}

/** Read-only reconciliation, with totals returned as decimal strings. */
export async function inspectWalletLedger(connection: Connection) {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT
        COUNT(*) AS user_count,
        CAST(COALESCE(SUM(u.coins),0) AS CHAR) AS total_coins,
        CAST(COALESCE(SUM(w.delta_total),0) AS CHAR) AS total_ledger,
        COALESCE(SUM(COALESCE(w.opening_count,0) <> 1),0) AS invalid_openings,
        COALESCE(SUM(w.delta_total IS NULL OR w.delta_total <> u.coins),0) AS mismatched_users
        FROM users u LEFT JOIN (
            SELECT user_id,SUM(delta_coins) AS delta_total,SUM(entry_type='opening_balance') AS opening_count
            FROM wallet_entries GROUP BY user_id
        ) w ON w.user_id=u.id`);
    const row = rows[0];
    return {
        userCount: Number(row.user_count), totalCoins: String(row.total_coins), totalLedger: String(row.total_ledger),
        invalidOpenings: Number(row.invalid_openings), mismatchedUsers: Number(row.mismatched_users),
        valid: Number(row.invalid_openings) === 0 && Number(row.mismatched_users) === 0 && String(row.total_coins) === String(row.total_ledger),
    };
}
