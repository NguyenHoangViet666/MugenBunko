import type { Connection, RowDataPacket } from 'mysql2/promise';

export const PAYMENT_TABLES = [
    'coin_packages', 'payment_orders', 'wallet_entries', 'payment_events', 'payment_audit', 'payment_schema_migrations', 'payment_balance_migration',
] as const;

type Cell = string | number | null;
export interface TableContract {
    table: Cell[];
    columns: Cell[][];
    indexes: Cell[][];
    foreignKeys: Cell[][];
    checks: Cell[][];
}
export type PaymentLayout = Record<string, TableContract>;

// Normalize SQL formatting outside literals only. Keep parentheses, operators
// and literal case so a changed predicate cannot pass as the original CHECK.
function expression(value: string) {
    // MySQL's dictionary can return escaped delimiters in CHECK_CLAUSE.
    // v1 literals contain no embedded quote; normalize that presentation layer.
    return value.replace(/\\'/g, "'").replace(/_[a-zA-Z0-9]+(?=')|`([^`]+)`|'(?:''|[^'])*'|\s+|[A-Z]+/g, token => {
        if (token.startsWith("'")) return token;
        if (/^_[a-zA-Z0-9]+$/.test(token)) return '';
        if (token.startsWith('`')) return token.slice(1, -1).toLowerCase();
        return /^\s+$/.test(token) ? '' : token.toLowerCase();
    });
}

/** SELECTs only; works with the application's DML account and READ ONLY tx. */
export async function readPaymentLayout(connection: Connection): Promise<PaymentLayout> {
    const names = [...PAYMENT_TABLES];
    const placeholders = names.map(() => '?').join(',');
    const [tables] = await connection.query<RowDataPacket[]>(`SELECT TABLE_NAME AS t, ENGINE AS engine,
        TABLE_COLLATION AS collation_name, TABLE_TYPE AS kind FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME`, names);
    const layout: PaymentLayout = {};
    for (const row of tables) layout[row.t] = {
        table: [row.engine, row.collation_name, row.kind], columns: [], indexes: [], foreignKeys: [], checks: [],
    };
    const [columns] = await connection.query<RowDataPacket[]>(`SELECT TABLE_NAME AS t, COLUMN_NAME AS name,
        COLUMN_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS default_value, EXTRA AS extra,
        CHARACTER_SET_NAME AS charset_name, COLLATION_NAME AS collation_name, GENERATION_EXPRESSION AS generated_expression
        FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})
        ORDER BY TABLE_NAME, ORDINAL_POSITION`, names);
    const defaultValue = (value: unknown) => value === null ? null :
        /^current_timestamp(?:\(\d+\))?$/i.test(String(value)) ? String(value).toLowerCase() : String(value);
    for (const row of columns) layout[row.t]?.columns.push([
        row.name, row.type, row.nullable, defaultValue(row.default_value),
        row.extra.toLowerCase(), row.charset_name, row.collation_name, expression(row.generated_expression),
    ]);
    const [indexes] = await connection.query<RowDataPacket[]>(`SELECT TABLE_NAME AS t, INDEX_NAME AS name,
        NON_UNIQUE AS non_unique, SEQ_IN_INDEX AS sequence, COLUMN_NAME AS column_name, SUB_PART AS prefix_length,
        COLLATION AS direction, INDEX_TYPE AS type, IS_VISIBLE AS visible, EXPRESSION AS expr
        FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})
        ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, names);
    for (const row of indexes) layout[row.t]?.indexes.push([
        row.name, Number(row.non_unique), Number(row.sequence), row.column_name, row.prefix_length,
        row.direction, row.type, row.visible, row.expr,
    ]);
    const [foreignKeys] = await connection.query<RowDataPacket[]>(`SELECT k.TABLE_NAME AS t,
        k.CONSTRAINT_NAME AS name, k.ORDINAL_POSITION AS sequence, k.COLUMN_NAME AS column_name,
        k.REFERENCED_TABLE_NAME AS ref_table, k.REFERENCED_COLUMN_NAME AS ref_column,
        (k.REFERENCED_TABLE_SCHEMA = DATABASE()) AS same_schema, r.DELETE_RULE AS delete_rule, r.UPDATE_RULE AS update_rule
        FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
          ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME IN (${placeholders}) AND k.REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`, names);
    const rule = (value: string) => value === 'NO ACTION' ? 'RESTRICT' : value;
    for (const row of foreignKeys) layout[row.t]?.foreignKeys.push([
        row.name, Number(row.sequence), row.column_name, row.ref_table, row.ref_column, Number(row.same_schema),
        rule(row.delete_rule), rule(row.update_rule),
    ]);
    const [checks] = await connection.query<RowDataPacket[]>(`SELECT t.TABLE_NAME AS t, t.CONSTRAINT_NAME AS name,
        c.CHECK_CLAUSE AS clause, t.ENFORCED AS enforced FROM information_schema.TABLE_CONSTRAINTS t
        JOIN information_schema.CHECK_CONSTRAINTS c
          ON c.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME = t.CONSTRAINT_NAME
        WHERE t.CONSTRAINT_SCHEMA = DATABASE() AND t.TABLE_NAME IN (${placeholders}) AND t.CONSTRAINT_TYPE = 'CHECK'
        ORDER BY t.TABLE_NAME, t.CONSTRAINT_NAME`, names);
    for (const row of checks) layout[row.t]?.checks.push([row.name, expression(row.clause), row.enforced]);
    return layout;
}
