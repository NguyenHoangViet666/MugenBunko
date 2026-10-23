export const passwordChecks = (password: string) => [
    { label: 'Ít nhất 8 ký tự', valid: password.length >= 8 },
    { label: 'Một chữ hoa', valid: /[A-Z]/.test(password) },
    { label: 'Một chữ số', valid: /\d/.test(password) },
    { label: 'Một ký tự đặc biệt', valid: /[^a-zA-Z0-9]/.test(password) }
];

export function passwordError(password: string, confirmation: string) {
    if (!passwordChecks(password).every(check => check.valid)) return 'Mật khẩu cần ít nhất 8 ký tự, một chữ hoa, một chữ số và một ký tự đặc biệt.';
    if (new TextEncoder().encode(password).length > 72) return 'Mật khẩu quá dài. Tối đa 72 byte; chữ có dấu có thể chiếm nhiều byte.';
    if (password !== confirmation) return 'Mật khẩu nhập lại chưa khớp.';
    return '';
}
