export const plainText = (html: string) => html.replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
export const textHtml = (text: string) => text.split(/\n\n+/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`).join('');

export function contentBlocks(html: string): string[] {
  const pattern = /<(p|h[1-6]|blockquote|li|figure)\b[^>]*>[\s\S]*?<\/\1\s*>|<img\b[^>]*>/gi;
  const result: string[] = [];
  let end = 0;
  for (const match of html.matchAll(pattern)) {
    const gap = html.slice(end, match.index);
    if (plainText(gap).trim()) result.push(gap);
    result.push(match[0]);
    end = match.index + match[0].length;
  }
  const trailing = html.slice(end);
  if (plainText(trailing).trim()) result.push(trailing);
  return result.length ? result : [html];
}
