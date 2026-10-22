import type { ReactNode } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

export default function StudioDialog({ title, children, onClose, busy = false }: {
    title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
    const ref = useDialogFocus(true);
    return <div className="feature-modal-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
        <section ref={ref} className="feature-modal studio-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-dialog-title"
            onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose(); }}>
            <div className="section-heading-row"><h2 id="studio-dialog-title">{title}</h2>
                <button className="outline-btn small" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}>✕</button></div>
            {children}
        </section>
    </div>;
}
