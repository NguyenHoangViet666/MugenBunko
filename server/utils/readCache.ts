type Entry = { value: unknown; expires: number; bytes: number };
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
let generation = 0;
let bytes = 0;
let broadcaster: (() => void) | undefined;
const MAX_ENTRIES = 200;
const MAX_BYTES = 8 * 1024 * 1024;

/** Public, permission-independent data only. Never cache sessions or drafts here. */
export async function cachedRead<T>(key: string, load: () => Promise<T>, ttlMs = 15000): Promise<T> {
    const now = Date.now();
    const entry = entries.get(key);
    if (entry && entry.expires > now) {
        entries.delete(key); entries.set(key, entry);
        return entry.value as T;
    }
    if (entry) { bytes -= entry.bytes; entries.delete(key); }
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const version = generation;
    const task = load().then(value => {
        const size = Buffer.byteLength(JSON.stringify(value));
        if (generation === version && size <= 512 * 1024) {
            const replaced = entries.get(key);
            if (replaced) bytes -= replaced.bytes;
            entries.set(key, { value, expires: Date.now() + ttlMs, bytes: size }); bytes += size;
            while (entries.size > MAX_ENTRIES || bytes > MAX_BYTES) {
                const oldest = entries.keys().next().value!;
                bytes -= entries.get(oldest)!.bytes; entries.delete(oldest);
            }
        }
        return value;
    }).finally(() => { if (pending.get(key) === task) pending.delete(key); });
    if (pending.size < MAX_ENTRIES) pending.set(key, task);
    return task;
}

export function setCacheBroadcaster(publish: () => void) { broadcaster = publish; }

export function invalidatePublicReads(notify = true) {
    generation++;
    entries.clear(); pending.clear(); bytes = 0;
    if (notify) broadcaster?.();
}
