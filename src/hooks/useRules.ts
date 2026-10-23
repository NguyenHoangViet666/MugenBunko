import { useEffect, useState } from 'react';
import type { Rule } from '../types';

export function useRules(API_BASE: string) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        void (async () => {
            try {
                const response = await fetch(`${API_BASE}/policies`, { signal: controller.signal, cache: 'no-store' });
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error();
                if (!controller.signal.aborted) setRules(data);
            } catch {
                if (!controller.signal.aborted) setError('Chưa tải được quy định cộng đồng. Vui lòng thử lại.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [API_BASE, revision]);

    return { rules, setRules, loading, error, retry: () => setRevision(value => value + 1) };
}
