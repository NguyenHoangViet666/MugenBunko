import { createHash } from 'node:crypto';
import { paymentSchema } from '../paymentSchema.js';

export const PAYMENT_SCHEMA_VERSION = 1;
export const PAYMENT_MIGRATION_NAME = 'initial_payment_tables';
// Immutable v1 seed: subsequent price/catalog changes must not rewrite v1.
export const PAYMENT_V1_PACKAGES = [
    { code: 'xu_100', name: '100 xu', amountVnd: 10000, coinAmount: 100 },
    { code: 'xu_500', name: '500 xu', amountVnd: 50000, coinAmount: 500 },
    { code: 'xu_1000', name: '1.000 xu', amountVnd: 100000, coinAmount: 1000 },
] as const;

export const paymentMigrationTableSchema = `CREATE TABLE IF NOT EXISTS payment_schema_migrations (
    version INT UNSIGNED PRIMARY KEY,
    name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    applied_at DATETIME(3) NULL,
    CONSTRAINT chk_payment_migration_state CHECK (
        (status = 'applying' AND applied_at IS NULL) OR (status = 'applied' AND applied_at IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

// Normalize line endings so Windows and Linux builds have the same checksum.
export const PAYMENT_MIGRATION_CHECKSUM = createHash('sha256')
    .update(paymentSchema.replace(/\r\n/g, '\n')).update('\n')
    .update(paymentMigrationTableSchema.replace(/\r\n/g, '\n')).update('\n')
    .update(JSON.stringify(PAYMENT_V1_PACKAGES)).digest('hex');
