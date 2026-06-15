import React, { useState, useEffect } from 'react';
import { Rule } from '../types';

interface ManageRulesProps {
    API_BASE: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    showToast: (msg: string) => void;
    setCurrentView: (view: string) => void;
    triggerConfirm: (msg: string, callback: () => void) => void;
}

export default function ManageRules({ API_BASE, fetchWithAuth, showToast, setCurrentView, triggerConfirm }: ManageRulesProps) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<Rule | null>(null); // null or Rule object
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [orderIndex, setOrderIndex] = useState(0);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/policies`);
            if (res.ok) {
                const data = await res.json();
                setRules(data);
            }
        } catch (err) {
            console.error("Error loading rules:", err);
            if (showToast) showToast("Lỗi tải danh sách quy định!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleAdd = () => {
        setIsAdding(true);
        setEditingRule(null);
        setTitle('');
        setContent('');
        setOrderIndex(rules.length > 0 ? Math.max(...rules.map(r => r.order_index)) + 10 : 10);
    };

    const handleEdit = (rule: Rule) => {
        setEditingRule(rule);
        setIsAdding(false);
        setTitle(rule.title);
        setContent(rule.content);
        setOrderIndex(rule.order_index);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingRule(null);
        setTitle('');
        setContent('');
        setOrderIndex(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert("Vui lòng nhập đầy đủ tiêu đề và nội dung quy định!");
            return;
        }

        const payload = {
            title: title.trim(),
            content: content.trim(),
            orderIndex: Number(orderIndex) || 0
        };

        try {
            let res: Response;
            if (isAdding) {
                res = await fetchWithAuth(`${API_BASE}/admin/rules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else if (editingRule) {
                res = await fetchWithAuth(`${API_BASE}/admin/rules/${editingRule.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                return;
            }

            const data = await res.json();
            if (res.ok && data.success) {
                if (showToast) showToast(isAdding ? "Thêm quy định mới thành công! ✨" : "Cập nhật quy định thành công! 💾");
                handleCancel();
                fetchRules();
            } else {
                alert(data.error || "Gặp lỗi khi lưu quy định.");
            }
        } catch (err) {
            console.error("Submit rule error:", err);
            alert("Lỗi kết nối máy chủ.");
        }
    };

    const handleDelete = async (ruleId: number) => {
        triggerConfirm("Bạn có chắc chắn muốn xóa vĩnh viễn quy định này không? Độc giả sẽ không thể xem nội dung này nữa.", async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/admin/rules/${ruleId}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (showToast) showToast("Đã xóa quy định thành công.");
                    fetchRules();
                } else {
                    alert(data.error || "Lỗi khi xóa quy định.");
                }
            } catch (err) {
                console.error("Delete rule error:", err);
                alert("Lỗi kết nối máy chủ khi xóa.");
            }
        });
    };

    return (
        <div className="author-studio-container" style={{ minHeight: '80vh', padding: '20px 0' }}>
            <div className="studio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary, #ea580c)' }}>
                        Sửa đổi quy định hệ thống
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)', marginTop: '5px' }}>
                        Trình soạn thảo quy định đăng tải tác phẩm và quy chuẩn cộng đồng dành riêng cho Quản trị viên.
                    </p>
                </div>
                {!isAdding && !editingRule && (
                    <button className="btn btn-primary" onClick={handleAdd}>
                        ➕ Thêm quy định mới
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted, #94a3b8)' }}>
                    Đang tải danh sách điều khoản...
                </div>
            ) : isAdding || editingRule ? (
                /* Form soạn thảo */
                <div className="studio-card" style={{ padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', background: 'var(--card-bg, rgba(20,20,20,0.6))' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-color, #f8fafc)' }}>
                        {isAdding ? "🆕 Tạo điều khoản quy định mới" : `📝 Chỉnh sửa: ${editingRule?.title}`}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-color, #f8fafc)' }}>
                                    Tiêu đề điều khoản
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Điều 1. Dung lượng và Định dạng văn bản"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: '#fff',
                                        fontSize: '15px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-color, #f8fafc)' }}>
                                    Thứ tự hiển thị (Order)
                                </label>
                                <input
                                    type="number"
                                    value={orderIndex}
                                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: '#fff',
                                        fontSize: '15px',
                                        textAlign: 'center'
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-color, #f8fafc)' }}>
                                Nội dung chi tiết quy định
                            </label>
                            <textarea
                                placeholder="Nhập nội dung điều khoản..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={18}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    lineHeight: '1.6',
                                    fontFamily: 'monospace',
                                    resize: 'vertical'
                                }}
                                required
                            />
                            <small style={{ display: 'block', color: 'var(--text-muted, #94a3b8)', marginTop: '5px' }}>
                                Mẹo: Các dòng trống sẽ tự động được hiển thị thành ngắt đoạn văn bản khi độc giả xem.
                            </small>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ padding: '8px 16px' }}>
                                Hủy bỏ
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                                Lưu quy định
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Danh sách quy định hiện tại */
                <div>
                    {rules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                            Chưa có điều khoản quy định nào trong cơ sở dữ liệu. Nhấp "Thêm quy định mới" để tạo.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {rules.map((rule) => (
                                <div 
                                    key={rule.id} 
                                    className="studio-card" 
                                    style={{
                                        padding: '20px', 
                                        borderRadius: '10px', 
                                        border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                                        background: 'var(--card-bg, rgba(30,30,30,0.3))',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{ flex: 1, paddingRight: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                background: 'rgba(234,88,12,0.15)', 
                                                color: 'var(--color-primary, #ea580c)', 
                                                padding: '2px 8px', 
                                                borderRadius: '12px',
                                                fontWeight: '600'
                                            }}>
                                                Thứ tự: {rule.order_index}
                                            </span>
                                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-color, #f8fafc)' }}>
                                                {rule.title}
                                            </h4>
                                        </div>
                                        <p style={{ 
                                            fontSize: '13px', 
                                            color: 'var(--text-muted, #94a3b8)', 
                                            marginTop: '6px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '600px'
                                        }}>
                                            {rule.content}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            className="btn btn-secondary" 
                                            onClick={() => handleEdit(rule)}
                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                        >
                                            ✏️ Sửa
                                        </button>
                                        <button 
                                            className="btn btn-danger" 
                                            onClick={() => handleDelete(rule.id)}
                                            style={{ padding: '6px 12px', fontSize: '13px', background: '#991b1b', borderColor: '#991b1b' }}
                                        >
                                            🗑️ Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
