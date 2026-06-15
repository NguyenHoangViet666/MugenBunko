import React, { useState, useEffect } from 'react';
import { Rule } from '../types';

interface ViewRulesProps {
    API_BASE: string;
    setCurrentView: (view: string) => void;
}

export default function ViewRules({ API_BASE, setCurrentView }: ViewRulesProps) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const res = await fetch(`${API_BASE}/policies`);
                if (res.ok) {
                    const data = await res.json();
                    setRules(data);
                }
            } catch (err) {
                console.error("Error loading rules:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRules();
    }, [API_BASE]);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', minHeight: '80vh' }}>
            {/* Header / Back Link */}
            <div style={{ marginBottom: '30px' }}>
                <span 
                    onClick={() => { if (setCurrentView) setCurrentView('home'); }} 
                    style={{ 
                        cursor: 'pointer', 
                        color: 'var(--color-primary, #ea580c)', 
                        fontSize: '14px', 
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                    ← Quay lại Trang chủ
                </span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{ 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: 'var(--text-color, #f8fafc)',
                    letterSpacing: '-0.5px',
                    fontFamily: '"Outfit", "Inter", sans-serif'
                }}>
                    QUY ĐỊNH CỘNG ĐỒNG MUGENBUNKO
                </h1>
                <div style={{ 
                    width: '60px', 
                    height: '3px', 
                    background: 'var(--color-primary, #ea580c)', 
                    margin: '15px auto 0 auto',
                    borderRadius: '2px'
                }}></div>
                <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-muted, #94a3b8)', 
                    marginTop: '15px',
                    fontStyle: 'italic'
                }}>
                    Nền tảng chia sẻ và sáng tác Light Novel phi lợi nhuận.
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
                    Đang tải nội dung quy chế...
                </div>
            ) : rules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    Quy chế hiện đang được cập nhật. Vui lòng quay lại sau!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {rules.map((rule) => (
                        <div 
                            key={rule.id} 
                            style={{ 
                                padding: '30px',
                                borderRadius: '12px',
                                background: 'var(--card-bg, rgba(20,20,20,0.4))',
                                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <h3 style={{ 
                                fontSize: '18px', 
                                fontWeight: '600', 
                                color: 'var(--color-primary, #ea580c)',
                                marginBottom: '20px',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                paddingBottom: '10px'
                            }}>
                                {rule.title}
                            </h3>
                            <div style={{ 
                                color: 'var(--text-color, #e2e8f0)', 
                                lineHeight: '1.7', 
                                fontSize: '15px' 
                            }}>
                                {rule.content.split('\n\n').map((paragraph, pIdx) => (
                                    <p key={pIdx} style={{ marginBottom: '16px' }}>
                                        {paragraph.split('\n').map((line, lIdx) => (
                                            <React.Fragment key={lIdx}>
                                                {line}
                                                {lIdx < paragraph.split('\n').length - 1 && <br />}
                                            </React.Fragment>
                                        ))}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
