import { paymentSchemaV1Contract } from './schemaV1Contract.js';
import type { PaymentLayout } from './schemaMetadata.js';

export const paymentSchemaV2Contract: PaymentLayout = {
    ...paymentSchemaV1Contract,
    payment_balance_migration: {
        table: ['InnoDB', 'utf8mb4_unicode_ci', 'BASE TABLE'],
        columns: [
            ['version', 'int unsigned', 'NO', null, '', null, null, ''],
            ['last_user_id', 'int', 'YES', null, '', null, null, ''],
            ['expected_user_count', 'bigint unsigned', 'NO', null, '', null, null, ''],
            ['expected_total_coins', 'decimal(65,0)', 'NO', null, '', null, null, ''],
            ['completed_batches', 'int unsigned', 'NO', '0', '', null, null, ''],
            ['updated_at', 'datetime(3)', 'NO', 'current_timestamp(3)', 'default_generated on update current_timestamp(3)', null, null, ''],
        ],
        indexes: [['PRIMARY', 0, 1, 'version', null, 'A', 'BTREE', 'YES', null]],
        foreignKeys: [],
        checks: [['chk_balance_migration_version', '(version=2)', 'YES']],
    },
};
