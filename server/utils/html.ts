import sanitizeHtml from 'sanitize-html';

export function cleanHtml(value: string): string {
    return sanitizeHtml(value, {
        allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'img', 'figure', 'figcaption', 'span', 'div', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['style'] },
        allowedSchemes: ['https', 'http'], allowProtocolRelative: false,
        allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/], 'font-weight': [/^(bold|normal|[1-9]00)$/], 'font-style': [/^(italic|normal)$/], 'text-decoration': [/^(underline|line-through|none)$/] } },
        transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
    });
}
