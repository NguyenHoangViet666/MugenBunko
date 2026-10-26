import { monitorEventLoopDelay } from 'node:perf_hooks';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
const buckets = [25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];
const http = new Map<string, { count: number; errors: number; sum: number; buckets: number[] }>();
const loop = monitorEventLoopDelay({ resolution: 20 }); loop.enable();
export const databaseMetrics = { active: 0, waiting: 0, queries: 0, transactions: 0, errors: 0, durationMs: 0, waitMs: 0 };

export function recordHttp(method: string, path: string, status: number, duration: number) {
    let route = path.split('?')[0].replace(/\/[0-9]+(?=\/|$)/g, '/:id').replace(/\/[a-f0-9]{32}(?=\/|$)/g, '/:token')
        .replace(/\/(profile|user)\/[^/]+/g, '/$1/:name');
    if (!route.startsWith('/api') && !['/healthz', '/livez'].includes(route)) route = '/static';
    let key = method + ' ' + route;
    if (!http.has(key) && http.size >= 100) key = 'OTHER /other';
    const value = http.get(key) || { count: 0, errors: 0, sum: 0, buckets: buckets.map(() => 0) };
    value.count++; value.errors += status >= 500 ? 1 : 0; value.sum += duration;
    buckets.forEach((bucket, index) => { if (duration <= bucket) value.buckets[index]++; });
    http.set(key, value);
}

export function metricsHandler(req: Request, res: Response) {
    const expected = process.env.METRICS_TOKEN;
    if (!expected) return res.sendStatus(404);
    const supplied = req.get('authorization')?.replace(/^Bearer /, '') || '';
    const actualBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return res.sendStatus(403);
    const lines = ['# TYPE mugen_http_requests_total counter', '# TYPE mugen_http_duration_seconds histogram'];
    for (const [key, value] of http) {
        const space = key.indexOf(' '); const labels = `method=${JSON.stringify(key.slice(0, space))},route=${JSON.stringify(key.slice(space + 1))}`;
        lines.push(`mugen_http_requests_total{${labels}} ${value.count}`, `mugen_http_errors_total{${labels}} ${value.errors}`);
        buckets.forEach((bucket, index) => lines.push(`mugen_http_duration_seconds_bucket{${labels},le="${bucket === Infinity ? '+Inf' : bucket / 1000}"} ${value.buckets[index]}`));
        lines.push(`mugen_http_duration_seconds_sum{${labels}} ${value.sum / 1000}`, `mugen_http_duration_seconds_count{${labels}} ${value.count}`);
    }
    const memory = process.memoryUsage();
    lines.push(`mugen_process_uptime_seconds ${process.uptime()}`, `mugen_process_rss_bytes ${memory.rss}`, `mugen_process_heap_used_bytes ${memory.heapUsed}`,
        `mugen_event_loop_p99_seconds ${Number.isFinite(loop.percentile(99)) ? loop.percentile(99) / 1e9 : 0}`);
    for (const [key, value] of Object.entries(databaseMetrics)) lines.push(`mugen_db_${key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase())} ${value}`);
    res.set('Cache-Control', 'no-store').type('text/plain; version=0.0.4').send(lines.join('\n') + '\n');
}
