import { createHash } from 'node:crypto';

/** Immutable v2 inputs. Keep v1 SQL, seed and checksum unchanged. */
export const PAYMENT_V2_NAME = 'opening_balances_and_coin_defaults';
export const PAYMENT_V2_ALTER = `ALTER TABLE users MODIFY COLUMN coins INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_users_coin_balance CHECK (coins BETWEEN 0 AND 2000000000)`;
export const PAYMENT_V2_PROGRESS_SCHEMA = `CREATE TABLE IF NOT EXISTS payment_balance_migration (
    version INT UNSIGNED PRIMARY KEY,
    last_user_id INT NULL,
    expected_user_count BIGINT UNSIGNED NOT NULL,
    expected_total_coins DECIMAL(65,0) NOT NULL,
    completed_batches INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_balance_migration_version CHECK (version = 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

export function balanceFreezeTriggers(lock: string) {
    if (!/^mugen_pay:[a-f0-9]{48}$/.test(lock)) throw new Error('Invalid payment migration lock.');
    return ['INSERT', 'UPDATE', 'DELETE'].map(event => {
        const name = 'payment_balance_freeze_' + event.toLowerCase();
        // A locking read sees current state even in a pre-existing REPEATABLE
        // READ transaction. Its shared next-key lock also drains transactions
        // that passed the guard before the v2 applying marker can be committed.
        const body = `BEGIN
            DECLARE migration_state VARCHAR(16) DEFAULT NULL;
            ${event === 'UPDATE' ? 'IF NOT (OLD.coins <=> NEW.coins) THEN' : ''}
            BEGIN
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET migration_state = NULL;
                SELECT status INTO migration_state FROM payment_schema_migrations WHERE version = 2 FOR SHARE;
            END;
            IF migration_state = 'applying' AND COALESCE(IS_USED_LOCK('${lock}'),0) <> CONNECTION_ID() THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PAYMENT_BALANCE_MIGRATION_IN_PROGRESS';
            END IF;
            ${event === 'UPDATE' ? 'END IF;' : ''}
        END`.replace(/\r\n/g, '\n');
        return { name, event, body, sql: `CREATE TRIGGER ${name} BEFORE ${event} ON users FOR EACH ROW ${body}` };
    });
}

export const PAYMENT_V2_CHECKSUM = createHash('sha256')
    .update(PAYMENT_V2_ALTER.replace(/\r\n/g, '\n')).update('\n')
    .update(PAYMENT_V2_PROGRESS_SCHEMA.replace(/\r\n/g, '\n')).update('\n')
    .update(JSON.stringify(balanceFreezeTriggers('mugen_pay:' + '0'.repeat(48)))).update('\n')
    .update('opening:v1:<userId>|reason=Opening balance migrated v2|batch-checkpoint-v1|reconcile-before-apply|migration-session-UTC')
    .digest('hex');
