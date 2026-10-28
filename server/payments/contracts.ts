/** P0 contract agreed in T01. Runtime request validation belongs to BE01. */
export const PAYMENT_LIMITS = Object.freeze({
    currency: 'VND' as const,
    maxAmountVnd: 500_000,
    maxBalanceCoins: 2_000_000_000,
    orderTtlMinutes: 15,
    maxPendingOrders: 3,
});

export const INITIAL_COIN_PACKAGES = Object.freeze([
    Object.freeze({ code: 'xu_100', name: '100 xu', amountVnd: 10_000, coinAmount: 100 }),
    Object.freeze({ code: 'xu_500', name: '500 xu', amountVnd: 50_000, coinAmount: 500 }),
    Object.freeze({ code: 'xu_1000', name: '1.000 xu', amountVnd: 100_000, coinAmount: 1_000 }),
]);

export type PaymentProvider = 'vnpay';
export type PaymentEnvironment = 'sandbox' | 'live';
export type PaymentClient = 'web' | 'native_demo';
export type PaymentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
export type FulfillmentStatus = 'pending' | 'credited' | 'needs_review';
export type WalletEntryType = 'opening_balance' | 'topup';

export interface CreateTopupInput {
    packageCode: string;
    client: PaymentClient;
}

export interface CoinPackageDto {
    code: string;
    name: string;
    amountVnd: number;
    coinAmount: number;
}

export interface TopupOrderDto {
    orderId: string;
    status: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    amountVnd: number;
    coinAmount: number;
    environment: PaymentEnvironment;
    createdAt: string;
    expiresAt: string;
    paidAt: string | null;
    creditedAt: string | null;
    reviewCode: string | null;
}

export interface CreateTopupResultDto extends TopupOrderDto {
    checkoutUrl: string;
}

export interface WalletDto {
    balanceCoins: number;
    updatedAt: string;
}

export interface WalletEntryDto {
    /** BIGINT identifiers are decimal strings across HTTP and both clients. */
    id: string;
    type: WalletEntryType;
    deltaCoins: number;
    balanceAfter: number;
    orderId: string | null;
    createdAt: string;
    reason: string;
}

export interface PaymentPageDto<T> {
    items: T[];
    nextCursor: string | null;
}
