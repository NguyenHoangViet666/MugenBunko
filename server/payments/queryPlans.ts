/** DB03 query contracts. These do not mount routes, claim leases or call a provider. */
import type { Connection, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PaymentEnvironment } from './contracts.js';

export interface PaymentQuery { sql: string; values: (string | number)[]; }
export interface PaymentHistoryCursor { createdAt: string; id: string; }
export type ReconcileCandidateStatus = 'created' | 'pending' | 'expired' | 'paid';

function pageLimit(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid payment query limit.');
    return limit;
}
function owner(userId: number) {
    if (!Number.isSafeInteger(userId) || userId < -2147483648 || userId > 2147483647) throw new Error('Invalid wallet owner.');
    return userId;
}
function utcDatetime(value: string) {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)) throw new Error('Invalid UTC query timestamp.');
    const parsed = new Date(value.replace(' ', 'T') + 'Z');
    if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().replace('T', ' ').replace('Z', '') !== value) {
        throw new Error('Invalid UTC query timestamp.');
    }
    return value;
}

/** Entries are ordered by immutable BIGINT id, not a timestamp that can tie. */
export function walletHistoryQuery(userId: number, limit: number, beforeId?: string): PaymentQuery {
    const values: (string | number)[] = [owner(userId)];
    if (beforeId !== undefined) {
        if (!/^[1-9]\d{0,19}$/.test(beforeId) || BigInt(beforeId) > 18446744073709551615n) throw new Error('Invalid wallet cursor.');
        values.push(beforeId);
    }
    values.push(pageLimit(limit));
    // Qualify the physical key: ORDER BY the CAST alias would sort decimal text
    // lexically, disagree with the numeric cursor and prevent index ordering.
    return { sql: `SELECT CAST(wallet_entries.id AS CHAR) AS id,entry_type,delta_coins,balance_after,payment_order_id,created_at,reason
        FROM wallet_entries WHERE wallet_entries.user_id=?${beforeId === undefined ? '' : ' AND wallet_entries.id<?'}
        ORDER BY wallet_entries.id DESC LIMIT ?`, values };
}

/** Both parts of the descending keyset are required when orders share a millisecond. */
export function paymentHistoryQuery(userId: number, limit: number, cursor?: PaymentHistoryCursor): PaymentQuery {
    const values: (string | number)[] = [owner(userId)];
    if (cursor) {
        if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(cursor.id)) throw new Error('Invalid order cursor.');
        values.push(utcDatetime(cursor.createdAt), cursor.createdAt, cursor.id);
    }
    values.push(pageLimit(limit));
    return { sql: `SELECT id,status,fulfillment_status,amount_vnd,coin_amount,environment,created_at,expires_at,provider_paid_at,credited_at,review_reason
        FROM payment_orders WHERE user_id=?${cursor ? ' AND (created_at<? OR (created_at=? AND id<?))' : ''}
        ORDER BY created_at DESC,id DESC LIMIT ?`, values };
}

/**
 * One status per scan preserves the leading equality of idx_payment_reconcile.
 * The caller must run this on its claim transaction and commit lease updates
 * before network I/O. A future worker must service every eligible status fairly.
 */
export function reconcileCandidatesQuery(scope: { environment: PaymentEnvironment; merchantCode: string },
    status: ReconcileCandidateStatus, now: string, limit: number): PaymentQuery {
    if (!['created', 'pending', 'expired', 'paid'].includes(status) || !['sandbox', 'live'].includes(scope.environment) ||
        !/^[\x21-\x7e]{1,64}$/.test(scope.merchantCode)) throw new Error('Invalid reconciliation scope.');
    utcDatetime(now);
    return { sql: `SELECT id,reconcile_after,lease_until FROM payment_orders
        WHERE status=? AND reconcile_after<=? AND (lease_until IS NULL OR lease_until<=?)
        AND provider='vnpay' AND environment=? AND merchant_code=? AND fulfillment_status<>'credited'
        ORDER BY reconcile_after,lease_until,id LIMIT ? FOR UPDATE SKIP LOCKED`,
        values: [status, now, now, scope.environment, scope.merchantCode, pageLimit(limit)] };
}

export interface PaymentTableAccess {
    table: string;
    accessType: string;
    key: string | null;
    usedKeyParts: string[];
    estimatedRowsExamined: number | null;
}
/** EXPLAIN only; never executes the supplied SELECT or takes its row locks. */
export async function explainPaymentQuery(connection: Connection | PoolConnection, query: PaymentQuery) {
    const [rows] = await connection.execute<RowDataPacket[]>('EXPLAIN FORMAT=JSON ' + query.sql, query.values);
    const raw = rows[0]?.EXPLAIN;
    const plan: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const tables: PaymentTableAccess[] = [];
    let filesort = false;
    const visit = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        const node = value as Record<string, unknown>;
        if (node.using_filesort === true) filesort = true;
        if (typeof node.table_name === 'string') tables.push({
            table: node.table_name, accessType: String(node.access_type), key: typeof node.key === 'string' ? node.key : null,
            usedKeyParts: Array.isArray(node.used_key_parts) ? node.used_key_parts.map(String) : [],
            estimatedRowsExamined: typeof node.rows_examined_per_scan === 'number' ? node.rows_examined_per_scan : null,
        });
        for (const child of Object.values(node)) {
            if (Array.isArray(child)) child.forEach(visit); else visit(child);
        }
    };
    visit(plan);
    return { tables, filesort };
}
