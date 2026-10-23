type OtpStage = 'configuration' | 'account_lookup' | 'otp_storage' | 'smtp_setup' | 'smtp_delivery' | 'otp_cleanup' | 'verification';

export function logOtpFailure(stage: OtpStage, error: unknown) {
    const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    // Error messages, SQL parameters and SMTP responses may contain addresses,
    // codes or credentials. Only fixed diagnostic fields are safe to log.
    console.error('[OTP] Request failed', {
        stage,
        ...(typeof value.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(value.code) ? { code: value.code } : {}),
        ...(Number.isInteger(value.errno) ? { errno: value.errno } : {}),
        ...(Number.isInteger(value.responseCode) ? { smtpResponseCode: value.responseCode } : {})
    });
}
