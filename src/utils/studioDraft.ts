export interface DraftFields { title: string; volumeName: string; content: string }
export interface LocalStudioDraft extends DraftFields {
    chapterId: number; novelId: number; userId: number; updatedAt: number; base: DraftFields;
}

export const studioDraftKey = (userId: number, chapterId: number) => `mugen_studio_draft_${userId}_${chapterId}`;
export const sameDraft = (a: DraftFields, b: DraftFields) =>
    a.title === b.title && a.volumeName === b.volumeName && a.content === b.content;

export function readStudioDraft(userId: number, chapterId: number): LocalStudioDraft | null {
    try {
        const value = JSON.parse(localStorage.getItem(studioDraftKey(userId, chapterId)) || 'null');
        if (!value || value.userId !== userId || value.chapterId !== chapterId || !Number.isInteger(value.novelId) ||
            !Number.isFinite(value.updatedAt) || !value.base || [value, value.base].some(d =>
                typeof d.title !== 'string' || typeof d.volumeName !== 'string' || typeof d.content !== 'string')) return null;
        return value;
    } catch { return null; }
}

export function toLocalDatetime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function htmlToText(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('br').forEach(el => el.replaceWith(document.createTextNode('\n')));
    document.querySelectorAll('p,div,h1,h2,h3,h4,li,blockquote').forEach(el => el.append(document.createTextNode('\n\n')));
    return document.body.textContent?.trim() || '';
}
