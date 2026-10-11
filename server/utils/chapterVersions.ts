import { PoolConnection } from 'mysql2/promise';

export async function snapshotChapter(connection: PoolConnection, chapter: any, editorId: number, source: string) {
    await connection.execute(`INSERT INTO chapter_versions (chapter_id, editor_id, volume_name, title, content, word_count, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [chapter.id, editorId, chapter.volume_name, chapter.title, chapter.content, chapter.word_count || 0, source]);
    // Keep the most recent 50 snapshots, including snapshots taken before a restore.
    await connection.execute(`DELETE FROM chapter_versions WHERE chapter_id = ? AND id NOT IN
        (SELECT id FROM (SELECT id FROM chapter_versions WHERE chapter_id = ? ORDER BY id DESC LIMIT 50) retained)`, [chapter.id, chapter.id]);
}
