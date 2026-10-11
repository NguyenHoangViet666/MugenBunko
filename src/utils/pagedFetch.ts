// Preserve the current complete-library views while keeping each API query bounded.
export async function fetchArrayPages<T>(fetcher: (url: string) => Promise<Response>, url: string): Promise<T[]> {
    const result: T[] = [];
    let page = '1';
    while (page) {
        const response = await fetcher(`${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=100`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || 'Không thể tải dữ liệu.');
        result.push(...data);
        const next = response.headers.get('X-Next-Page') || '';
        if (next && (!/^\d+$/.test(next) || Number(next) <= Number(page))) throw new Error('Invalid pagination cursor');
        page = next;
    }
    return result;
}
