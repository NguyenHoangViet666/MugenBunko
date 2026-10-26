import type { Request } from 'express';
import db from '../db.js';
import { cachedRead } from './readCache.js';

const PUBLIC = "n.status <> 'suspended' AND EXISTS(SELECT 1 FROM chapters visible WHERE visible.novel_id=n.id AND visible.status='published')";
const ORDERS: Record<string, string> = { reads: 'n.reads DESC,n.id DESC', new: 'n.id DESC', rating: 'n.rating DESC,n.reads DESC,n.id DESC', bookmarks: 'n.bookmarks_count DESC,n.id DESC' };
export interface CatalogQuery { page: number; limit: number; q: string; genre: string; type: string; status: string; sort: string; tags: string[]; ids: number[]; random: boolean }

export function catalogQuery(query: Request['query']): CatalogQuery | null {
    if (Object.values(query).some(value => typeof value !== 'string' && value !== undefined)) return null;
    const page = Number(query.page || 1), limit = Number(query.limit || 12);
    const q = String(query.q || '').trim(), genre = String(query.genre || '').trim();
    const type = String(query.type || 'all'), status = String(query.status || 'all'), sort = String(query.sort || 'reads');
    const tags = String(query.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
    const ids = String(query.ids || '').split(',').filter(Boolean).map(Number);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || q.length > 160 || genre.length > 100 ||
        !['all', 'series', 'oneshot'].includes(type) || !['all', 'ongoing', 'completed'].includes(status) || !ORDERS[sort] ||
        tags.length > 20 || tags.some(tag => tag.length > 50) || ids.length > 30 || ids.some(id => !Number.isSafeInteger(id) || id < 1) ||
        (query.random !== undefined && query.random !== '1')) return null;
    return { page, limit, q, genre, type, status, sort, tags, ids, random: query.random === '1' };
}

function conditions(query: CatalogQuery) {
    const parts = [PUBLIC]; const values: unknown[] = [];
    if (query.q) {
        const term = '%' + query.q.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_') + '%';
        parts.push("(n.title LIKE ? ESCAPE '!' OR u.displayname LIKE ? ESCAPE '!' OR u.username LIKE ? ESCAPE '!' OR EXISTS(SELECT 1 FROM novel_tags t WHERE t.novel_id=n.id AND t.tag LIKE ? ESCAPE '!'))");
        values.push(term, term, term, term);
    }
    if (query.genre && query.genre !== 'Tất cả') {
        parts.push("(FIND_IN_SET(?,REPLACE(n.genre,', ',','))>0 OR EXISTS(SELECT 1 FROM novel_tags t WHERE t.novel_id=n.id AND t.tag=?))"); values.push(query.genre, query.genre);
    }
    if (query.type !== 'all') { parts.push('n.type=?'); values.push(query.type); }
    if (query.status !== 'all') parts.push(query.status === 'completed' ? "n.status='completed'" : "n.status<>'completed'");
    if (query.tags.length) {
        parts.push('(' + query.tags.map(() => "(FIND_IN_SET(?,REPLACE(n.genre,', ',','))>0 OR EXISTS(SELECT 1 FROM novel_tags t WHERE t.novel_id=n.id AND t.tag=?))").join(' OR ') + ')');
        for (const tag of query.tags) values.push(tag, tag);
    }
    if (query.ids.length) { parts.push(`n.id IN (${query.ids.map(() => '?').join(',')})`); values.push(...query.ids); }
    return { where: parts.join(' AND '), values };
}

export async function readCatalog(query: CatalogQuery) {
    const load = async () => {
        const { where, values } = conditions(query);
        const totals = await db.query<any[]>(`SELECT COUNT(*) total FROM novels n JOIN users u ON u.id=n.author_id WHERE ${where}`, values);
        const total = Number(totals[0].total);
        const limit = query.random ? 1 : query.limit;
        const offset = query.random ? Math.floor(Math.random() * total) : (query.page - 1) * limit;
        const novels = await db.query<any[]>(`SELECT n.id,n.title,n.author_id,n.cover,LEFT(n.summary,1200) summary,n.genre,n.status,n.type,n.reads,n.rating,n.bookmarks_count,n.created_at,
            u.username authorId,u.displayname author,u.avatar_seed authorAvatarSeed,u.bio authorBio,
            (SELECT COUNT(*) FROM chapters c WHERE c.novel_id=n.id AND c.status='published') chapters_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.novel_id=n.id) reviewsCount,
            (SELECT c.id FROM chapters c WHERE c.novel_id=n.id AND c.status='published' ORDER BY c.sort_order,c.id LIMIT 1) firstChapterId,
            (SELECT c.id FROM chapters c WHERE c.novel_id=n.id AND c.status='published' ORDER BY c.sort_order DESC,c.id DESC LIMIT 1) lastChapterId
            FROM novels n JOIN users u ON u.id=n.author_id WHERE ${where} ORDER BY ${ORDERS[query.sort]} LIMIT ? OFFSET ?`, [...values, limit, offset]);
        if (!novels.length) return { novels: [], total, page: query.page, limit, hasMore: false };
        const ids = novels.map(novel => novel.id);
        const chapterIds = [...new Set(novels.flatMap(novel => [novel.firstChapterId, novel.lastChapterId]))];
        const [tags, chapters] = await Promise.all([
            db.query<any[]>(`SELECT novel_id,tag FROM novel_tags WHERE novel_id IN (${ids.map(() => '?').join(',')})`, ids),
            db.query<any[]>(`SELECT id,novel_id,volume_name,title,status,word_count,sort_order,created_at,DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') date FROM chapters WHERE id IN (${chapterIds.map(() => '?').join(',')}) AND status='published'`, chapterIds),
        ]);
        return { novels: novels.map(novel => ({ ...novel, reads: Number(novel.reads), bookmarksCount: Number(novel.bookmarks_count), detailsLoaded: false,
            tags: tags.filter(tag => tag.novel_id === novel.id).map(tag => tag.tag),
            chapters: chapters.filter(chapter => chapter.novel_id === novel.id).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
                .map(chapter => ({ ...chapter, publishedIndex: chapter.id === novel.firstChapterId ? 0 : Number(novel.chapters_count) - 1 })),
        })), total, page: query.page, limit, hasMore: offset + novels.length < total };
    };
    return query.random ? load() : cachedRead('catalog:' + JSON.stringify(query), load);
}

export async function readHome(query: CatalogQuery) {
    const make = (overrides: Partial<CatalogQuery>) => readCatalog({ ...query, page: 1, limit: 10, random: false, ...overrides });
    const [featured, trending, newest, rated, completed, oneshots, stats, genres, recent] = await Promise.all([
        make({ q: '', genre: '', tags: [], type: 'all', status: 'all', sort: 'reads', ids: [], limit: 5 }),
        make({ sort: 'reads' }), make({ sort: 'new' }), make({ sort: 'rating' }), make({ sort: 'reads', status: 'completed' }), make({ sort: 'reads', type: 'oneshot' }),
        cachedRead('home:stats', async () => {
            const rows = await db.query<any[]>(`SELECT COUNT(*) totalNovels,COALESCE(SUM(n.reads),0) totalReads,
                COALESCE(SUM((SELECT COUNT(*) FROM chapters c WHERE c.novel_id=n.id AND c.status='published')),0) totalChapters FROM novels n WHERE ${PUBLIC}`);
            return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
        }, 30000),
        cachedRead('home:genres', () => db.query<any[]>(`SELECT g.name genre,(SELECT COUNT(*) FROM novels n WHERE ${PUBLIC} AND
            (FIND_IN_SET(g.name,REPLACE(n.genre,', ',','))>0 OR EXISTS(SELECT 1 FROM novel_tags t WHERE t.novel_id=n.id AND t.tag=g.name))) count FROM genres g ORDER BY g.name`), 30000),
        cachedRead('home:recent', () => db.query<any[]>(`SELECT c.id,c.novel_id,c.title,c.volume_name,c.status,c.word_count,c.created_at,DATE_FORMAT(c.created_at,'%d/%m/%Y %H:%i') date,
            (SELECT COUNT(*) FROM chapters preceding WHERE preceding.novel_id=c.novel_id AND preceding.status='published' AND (preceding.sort_order<c.sort_order OR (preceding.sort_order=c.sort_order AND preceding.id<c.id))) publishedIndex
            FROM chapters c JOIN novels n ON n.id=c.novel_id WHERE c.status='published' AND n.status<>'suspended'
            AND NOT EXISTS(SELECT 1 FROM chapters newer WHERE newer.novel_id=c.novel_id AND newer.status='published' AND newer.id>c.id) ORDER BY c.id DESC LIMIT 6`)),
    ]);
    const rankings = await Promise.all(['reads', 'rating', 'bookmarks'].map(sort => make({ q: '', genre: '', tags: [], type: 'all', status: 'all', ids: [], limit: 5, sort })));
    const recentNovels = recent.length ? await make({ ids: recent.map(chapter => Number(chapter.novel_id)), q: '', genre: '', tags: [], type: 'all', status: 'all' }) : { novels: [] };
    const novels = [...new Map([...featured.novels, ...trending.novels, ...newest.novels, ...rated.novels, ...completed.novels, ...oneshots.novels, ...recentNovels.novels, ...rankings.flatMap(group => group.novels)].map(novel => [novel.id, novel])).values()];
    return { novels, rankings: Object.fromEntries(['reads', 'stars', 'bookmarks'].map((name, index) => [name, rankings[index].novels.map(novel => novel.id)])), featured: featured.novels.map(novel => novel.id), sections: { trending: trending.novels.map(novel => novel.id), newest: newest.novels.map(novel => novel.id), 'top-rated': rated.novels.map(novel => novel.id), completed: completed.novels.map(novel => novel.id), oneshot: oneshots.novels.map(novel => novel.id) }, stats, genres, recent };
}
