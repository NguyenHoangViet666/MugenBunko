import { useEffect, useState } from 'react';
import Icons from '../components/Icons';
import { PageError, PageLoading } from '../components/LoadState';
import RuleContent from '../components/RuleContent';
import { useRules } from '../hooks/useRules';
import '../styles/rules.css';

const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const currentSection = () => new URLSearchParams(window.location.hash.split('?')[1]).get('section');

export default function ViewRules({ API_BASE, isAdmin = false }: { API_BASE: string; isAdmin?: boolean }) {
    const { rules, loading, error, retry } = useRules(API_BASE);
    const [query, setQuery] = useState('');
    const [section, setSection] = useState(currentSection);
    const [tocOpen, setTocOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
    const visibleRules = rules.filter(rule => normalize(`${rule.title}\n${rule.content}`).includes(normalize(query.trim())));
    const dates = rules.map(rule => Date.parse(rule.updated_at || '')).filter(Number.isFinite);
    const updatedAt = dates.length ? new Date(Math.max(...dates)) : null;

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const resize = () => setTocOpen(media.matches);
        media.addEventListener('change', resize);
        return () => media.removeEventListener('change', resize);
    }, []);

    useEffect(() => {
        const navigate = () => { setSection(currentSection()); setQuery(''); };
        window.addEventListener('hashchange', navigate);
        return () => window.removeEventListener('hashchange', navigate);
    }, []);
    useEffect(() => {
        if (loading || error || !section) return;
        const heading = document.getElementById(`rule-${section}`)?.querySelector('h2');
        heading?.scrollIntoView({ block: 'start' });
        heading?.focus({ preventScroll: true });
    }, [section, loading, error, rules]);

    return <div className="rules-page">
        <header className="rules-heading">
            <div className="rules-heading-top"><span className="rules-eyebrow"><Icons.Book size={15} /> MUGENBUNKO · CỘNG ĐỒNG</span>
                {isAdmin && <a className="outline-btn" href="#/manage-rules"><Icons.Edit size={15} /> Quản lý quy định</a>}
            </div>
            <h1>Quy định cộng đồng</h1>
            <p>Quyền và trách nhiệm khi đọc, sáng tác và tham gia MugenBunko. Tìm hiểu chuẩn nội dung, cách ứng xử, xử lý vi phạm và quyền khiếu nại của bạn.</p>
            {!loading && !error && rules.length > 0 && <div className="rules-metadata"><span>{rules.length} điều khoản</span>{updatedAt && <span>Cập nhật {updatedAt.toLocaleDateString('vi-VN')}</span>}</div>}
        </header>

        {loading ? <PageLoading reader /> : error ? <PageError message={error} onRetry={retry} /> : !rules.length ? <div className="rules-empty"><Icons.FileText size={30} /><h2>Chưa có quy định được công bố</h2><p>Nội dung sẽ xuất hiện tại đây khi được quản trị viên công bố.</p><a className="outline-btn" href={isAdmin ? '#/manage-rules' : '#/'}>{isAdmin ? 'Soạn quy định đầu tiên' : 'Về thư viện'}</a></div> : <div className="rules-layout">
            <aside className="rules-sidebar">
                <label className="rules-search" htmlFor="rules-search"><Icons.Search size={17} /><input id="rules-search" type="search" aria-label="Tìm trong quy định" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm trong quy định…" /></label>
                <details className="rules-toc" open={tocOpen || Boolean(query.trim())} onToggle={event => setTocOpen(event.currentTarget.open)}><summary>Mục lục <span>{visibleRules.length} điều khoản</span></summary><nav aria-label="Mục lục quy định">{visibleRules.map(rule => <a key={rule.id} href={`#/rules?section=${rule.id}`} aria-current={section === String(rule.id) ? 'location' : undefined} onClick={() => {
                    const heading = document.getElementById(`rule-${rule.id}`)?.querySelector('h2');
                    heading?.scrollIntoView({ block: 'start' });
                    heading?.focus({ preventScroll: true });
                }}><span aria-hidden="true">{String(rules.indexOf(rule) + 1).padStart(2, '0')}</span>{rule.title}</a>)}
                </nav></details>
                <p className="rules-sidebar-note">Áp dụng cho tác phẩm, hồ sơ, bình luận, diễn đàn, tin nhắn và hoạt động cộng đồng. Mỗi quyết định xử lý cần có căn cứ và được quyền phản hồi.</p>
            </aside>
            <div className="rules-document">
                {query.trim() && <p className="rules-search-result" role="status">{visibleRules.length} / {rules.length} điều khoản phù hợp</p>}
                {visibleRules.length ? visibleRules.map(rule => <RuleContent key={rule.id} rule={rule} number={rules.indexOf(rule) + 1} />) : <div className="rules-empty"><Icons.Search size={28} /><h2>Không tìm thấy điều khoản</h2><p>Thử từ khóa khác hoặc xem lại toàn bộ quy định.</p><button className="outline-btn" onClick={() => setQuery('')}>Xóa tìm kiếm</button></div>}
                {visibleRules.length > 0 && <a className="rules-back-top" href="#/rules" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Icons.ArrowUp size={15} /> Về đầu trang</a>}
            </div>
        </div>}
    </div>;
}
