import { createHash } from 'node:crypto';
import type { Connection, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { communityRules, type CommunityRule } from './communityRules.js';

type StoredRule = CommunityRule & RowDataPacket & { id: number };

// SHA-256 of the five original defaults, ordered by order_index/id and serialized
// as { title, content, order_index }. The v1 snapshot lives in tests/fixtures.
// A single admin edit, addition or deletion makes the whole upgrade ineligible.
const legacyFingerprint = '03b9b1ba2422361dff9f424445f2aadc082634498eef5354d9427f8aa1ae2884';

export async function initializeCommunityRules(connection: Connection | PoolConnection, seedIfEmpty = false) {
    await connection.beginTransaction();
    try {
        const [existing] = await connection.query<StoredRule[]>(
            'SELECT id, title, content, order_index FROM `rules` ORDER BY order_index, id FOR UPDATE'
        );
        const fingerprint = createHash('sha256').update(JSON.stringify(existing.map(({ title, content, order_index }) => ({ title, content, order_index })))).digest('hex');
        const upgradeLegacy = existing.length === 5 && fingerprint === legacyFingerprint;
        if (!upgradeLegacy && !(seedIfEmpty && existing.length === 0)) {
            await connection.commit();
            return 'unchanged';
        }

        for (const [index, rule] of communityRules.entries()) {
            if (upgradeLegacy && index < existing.length) {
                await connection.execute('UPDATE `rules` SET title = ?, content = ?, order_index = ? WHERE id = ?',
                    [rule.title, rule.content, rule.order_index, existing[index].id]);
            } else {
                await connection.execute('INSERT INTO `rules` (title, content, order_index) VALUES (?, ?, ?)',
                    [rule.title, rule.content, rule.order_index]);
            }
        }
        await connection.commit();
        return upgradeLegacy ? 'upgraded' : 'seeded';
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}
