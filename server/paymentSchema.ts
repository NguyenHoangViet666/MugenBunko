import { PAYMENT_LIMITS } from './payments/contracts.js';

/**
 * T01 executable schema contract, exercised ONLY in isolated payment fixtures.
 * Not mounted in db.ts yet: DB01/DB02 must first handle users.coins, existing
 * writers, opening balances, versioned upgrades and production readiness.
 * CREATE IF NOT EXISTS is a bootstrap, not an upgrade strategy.
 */
export const paymentSchema = `
CREATE TABLE IF NOT EXISTS coin_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    amount_vnd INT UNSIGNED NOT NULL,
    coin_amount INT UNSIGNED NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_coin_package_amount CHECK (amount_vnd BETWEEN 1 AND ${PAYMENT_LIMITS.maxAmountVnd}),
    CONSTRAINT chk_coin_package_coins CHECK (coin_amount BETWEEN 1 AND ${PAYMENT_LIMITS.maxBalanceCoins}),
    CONSTRAINT chk_coin_package_active CHECK (active IN (0, 1))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_orders (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    provider VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    environment VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    merchant_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    provider_txn_ref VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    package_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    amount_vnd INT UNSIGNED NOT NULL,
    coin_amount INT UNSIGNED NOT NULL,
    currency CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'created',
    fulfillment_status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'pending',
    provider_transaction_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
    provider_response_code VARCHAR(32) NULL,
    provider_paid_at DATETIME(3) NULL,
    credited_at DATETIME(3) NULL,
    review_reason VARCHAR(100) NULL,
    idempotency_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    client VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    checkout_snapshot JSON NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    reconcile_after DATETIME(3) NULL,
    last_reconciled_at DATETIME(3) NULL,
    reconcile_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    lease_owner VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL,
    lease_until DATETIME(3) NULL,
    UNIQUE KEY uq_payment_order_owner (id, user_id),
    UNIQUE KEY uq_payment_idempotency (user_id, idempotency_key),
    UNIQUE KEY uq_payment_reference (provider, environment, merchant_code, provider_txn_ref),
    UNIQUE KEY uq_payment_transaction (provider, environment, merchant_code, provider_transaction_id),
    INDEX idx_payment_history (user_id, created_at, id),
    INDEX idx_payment_reconcile (status, reconcile_after, lease_until),
    CONSTRAINT fk_payment_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_order_package FOREIGN KEY (package_id) REFERENCES coin_packages(id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_provider CHECK (provider = 'vnpay'),
    CONSTRAINT chk_payment_environment CHECK (environment IN ('sandbox', 'live')),
    CONSTRAINT chk_payment_currency CHECK (currency = 'VND'),
    CONSTRAINT chk_payment_amount CHECK (amount_vnd BETWEEN 1 AND ${PAYMENT_LIMITS.maxAmountVnd}),
    CONSTRAINT chk_payment_coins CHECK (coin_amount BETWEEN 1 AND ${PAYMENT_LIMITS.maxBalanceCoins}),
    CONSTRAINT chk_payment_status CHECK (status IN ('created','pending','paid','failed','cancelled','expired')),
    CONSTRAINT chk_payment_fulfillment CHECK (fulfillment_status IN ('pending','credited','needs_review')),
    CONSTRAINT chk_payment_state CHECK (
        (status = 'paid' AND fulfillment_status IN ('credited','needs_review')) OR
        (status <> 'paid' AND fulfillment_status = 'pending')
    ),
    CONSTRAINT chk_payment_credit_time CHECK (
        (fulfillment_status = 'credited' AND credited_at IS NOT NULL) OR
        (fulfillment_status <> 'credited' AND credited_at IS NULL)
    ),
    CONSTRAINT chk_payment_review_reason CHECK (
        (fulfillment_status = 'needs_review' AND review_reason IS NOT NULL AND CHAR_LENGTH(review_reason) > 0) OR
        (fulfillment_status <> 'needs_review' AND review_reason IS NULL)
    ),
    CONSTRAINT chk_payment_transaction_id CHECK (
        provider_transaction_id IS NULL OR (CHAR_LENGTH(provider_transaction_id) > 0 AND provider_transaction_id <> '0')
    ),
    CONSTRAINT chk_payment_client CHECK (client IN ('web', 'native_demo')),
    CONSTRAINT chk_payment_key CHECK (CHAR_LENGTH(idempotency_key) BETWEEN 1 AND 80),
    CONSTRAINT chk_payment_fingerprint CHECK (CHAR_LENGTH(request_fingerprint) = 64),
    CONSTRAINT chk_payment_merchant CHECK (CHAR_LENGTH(merchant_code) > 0),
    CONSTRAINT chk_payment_reference CHECK (CHAR_LENGTH(provider_txn_ref) > 0),
    CONSTRAINT chk_payment_snapshot CHECK (JSON_TYPE(checkout_snapshot) = 'OBJECT'),
    CONSTRAINT chk_payment_expiry CHECK (expires_at > created_at),
    CONSTRAINT chk_payment_lease CHECK (
        (lease_owner IS NULL AND lease_until IS NULL) OR
        (lease_owner IS NOT NULL AND lease_until IS NOT NULL)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    payment_order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    entry_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    delta_coins INT NOT NULL,
    balance_after INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    migration_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
    opening_user_id INT GENERATED ALWAYS AS (
        CASE WHEN entry_type = 'opening_balance' THEN user_id ELSE NULL END
    ) STORED,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_wallet_topup (payment_order_id),
    UNIQUE KEY uq_wallet_opening (migration_key),
    UNIQUE KEY uq_wallet_one_opening (opening_user_id),
    INDEX idx_wallet_history (user_id, id),
    CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_order_owner FOREIGN KEY (payment_order_id, user_id)
        REFERENCES payment_orders(id, user_id),
    CONSTRAINT chk_wallet_balance CHECK (balance_after BETWEEN 0 AND ${PAYMENT_LIMITS.maxBalanceCoins}),
    CONSTRAINT chk_wallet_entry CHECK (
        (entry_type = 'opening_balance' AND payment_order_id IS NULL AND migration_key IS NOT NULL
            AND CHAR_LENGTH(migration_key) > 0 AND delta_coins >= 0 AND balance_after = delta_coins) OR
        (entry_type = 'topup' AND payment_order_id IS NOT NULL AND migration_key IS NULL
            AND delta_coins > 0 AND balance_after >= delta_coins)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    provider VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    environment VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    merchant_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    source VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    verification_result VARCHAR(32) NOT NULL,
    processing_result VARCHAR(32) NOT NULL,
    provider_response_code VARCHAR(32) NULL,
    safe_payload JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_payment_events_order (order_id, created_at, id),
    INDEX idx_payment_events_fingerprint (event_fingerprint),
    CONSTRAINT fk_payment_event_order FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_event_provider CHECK (provider = 'vnpay'),
    CONSTRAINT chk_payment_event_environment CHECK (environment IN ('sandbox','live')),
    CONSTRAINT chk_payment_event_source CHECK (source IN ('ipn','reconciliation','return')),
    CONSTRAINT chk_payment_event_fingerprint CHECK (CHAR_LENGTH(event_fingerprint) = 64),
    CONSTRAINT chk_payment_event_payload CHECK (safe_payload IS NULL OR JSON_TYPE(safe_payload) = 'OBJECT')
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    actor_user_id INT NULL,
    action VARCHAR(64) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    request_id VARCHAR(80) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_payment_audit_order (order_id, created_at, id),
    CONSTRAINT fk_payment_audit_order FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
`;
