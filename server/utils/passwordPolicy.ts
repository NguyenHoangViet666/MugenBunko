export const passwordPolicyMessage = 'Mật khẩu cần 8–72 byte, ít nhất một chữ hoa, một chữ số và một ký tự đặc biệt.';

export function validPassword(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 72 && Buffer.byteLength(value, 'utf8') <= 72 &&
        /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(value);
}
