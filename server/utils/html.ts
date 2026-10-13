import sanitizeHtml from 'sanitize-html';
import { createHash } from 'node:crypto';

// Cache only the pure sanitizer result. Database authorization is still checked
// on every read; hashing the actual content makes edits take effect immediately.
const cache = new Map<string, string>();
let cacheBytes = 0;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 128;

export function cleanHtml(value: string): string {
    const key = value.length <= 500000 ? createHash('sha256').update(value).digest('hex') : undefined;
    const cached = key ? cache.get(key) : undefined;
    if (cached !== undefined) {
        cache.delete(key!); cache.set(key!, cached); return cached;
    }
    const result = sanitizeHtml(value, {
        allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'img', 'figure', 'figcaption', 'span', 'div', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['style'] },
        allowedSchemes: ['https', 'http'], allowProtocolRelative: false,
        allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/], 'font-weight': [/^(bold|normal|[1-9]00)$/], 'font-style': [/^(italic|normal)$/], 'text-decoration': [/^(underline|line-through|none)$/] } },
        transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
    });
    if (key) {
        const size = result.length * 2 + key.length * 2;
        while (cache.size && (cache.size >= MAX_ENTRIES || cacheBytes + size > MAX_BYTES)) {
            const oldestKey = cache.keys().next().value!;
            cacheBytes -= cache.get(oldestKey)!.length * 2 + oldestKey.length * 2;
            cache.delete(oldestKey);
        }
        cache.set(key, result); cacheBytes += size;
    }
    return result;
}
