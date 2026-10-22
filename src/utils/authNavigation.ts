export type AuthMode = 'login' | 'register';

export function safeAuthReturn(value: string | null | undefined): string {
    if (!value || value.length > 2000) return '#/';
    if (/^#\/(?:|explore|library|studio|profile|forum(?:\?post=[1-9]\d*)?|about|mod-dashboard|admin-dashboard|manage-rules|elections(?:\/[1-9]\d*)?)$/.test(value) ||
        /^#\/(?:novel\/[1-9]\d*(?:\/reader\/\d+)?|event\/[1-9]\d*|collection\/[a-f0-9]{32})$/.test(value)) return value;
    if (/^#\/profile\/[^/?#]+$/.test(value)) {
        try { decodeURIComponent(value); return value; } catch { return '#/'; }
    }
    return '#/';
}

export function authHref(mode: AuthMode, returnTo?: string): string {
    const target = safeAuthReturn(returnTo);
    return `#/${mode}${target === '#/' ? '' : `?returnTo=${encodeURIComponent(target)}`}`;
}

export function parseAuthHash(hash: string): { mode: AuthMode; returnTo: string } | null {
    const match = hash.match(/^#\/(login|register)(?:\?(.*))?$/);
    return match ? { mode: match[1] as AuthMode, returnTo: safeAuthReturn(new URLSearchParams(match[2]).get('returnTo')) } : null;
}
