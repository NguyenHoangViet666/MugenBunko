import type { Connection, Pool, PoolConnection } from 'mysql2/promise';

/** Driver conversion and SQL session time zone must both be UTC. */
export const databaseTimeOptions = { timezone: 'Z' } as const;

export async function setDatabaseSessionUtc(connection: Pick<Connection, 'query'>): Promise<void> {
    // A numeric offset works without loading MySQL's named time zone tables.
    await connection.query({ sql: "SET SESSION time_zone = '+00:00'", timeout: 10000 });
}

/** Reset on every checkout, including sessions modified by an earlier caller. */
export async function acquireUtcConnection(pool: Pool): Promise<PoolConnection> {
    const connection = await pool.getConnection();
    try {
        await setDatabaseSessionUtc(connection);
        return connection;
    } catch (error) {
        // An uninitialized session must never be returned to another caller.
        connection.destroy();
        throw error;
    }
}
