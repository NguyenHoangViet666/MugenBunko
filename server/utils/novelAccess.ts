import db from '../db.js';

export const publicNovelSql = `n.status <> 'suspended' AND EXISTS (
    SELECT 1 FROM chapters public_chapter WHERE public_chapter.novel_id = n.id AND public_chapter.status = 'published'
)`;

export const positiveId = (value: unknown): number | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const validText = (value: unknown, max: number): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export async function accessibleNovel(novelId: number, user?: { id: number; roles: string[] }) {
    const novels = await db.query<any[]>(`SELECT n.id, n.title, n.type FROM novels n WHERE n.id = ?
        AND ((${publicNovelSql}) OR n.author_id = ? OR ? = 1)`,
        [novelId, user?.id || 0, Boolean(user?.roles.some(role => role === 'admin' || role === 'moderator'))]);
    return novels[0] || null;
}
