import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    }

    public handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.hash = '#/';
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '60vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px'
                }}>
                    <div style={{
                        maxWidth: '520px',
                        width: '100%',
                        background: 'var(--bg-card, #1e1e24)',
                        border: '1px solid var(--border-color, #333)',
                        borderRadius: '16px',
                        padding: '32px',
                        textAlign: 'center',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            fontSize: '24px'
                        }}>
                            ⚠
                        </div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-main, #fff)',
                            margin: '0 0 8px 0'
                        }}>
                            {this.props.fallbackTitle || 'Đã xảy ra lỗi khi hiển thị trang'}
                        </h2>
                        <p style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted, #888)',
                            lineHeight: 1.5,
                            margin: '0 0 20px 0'
                        }}>
                            Hệ thống đã ghi nhận lỗi này. Bạn có thể thử tải lại hoặc quay về trang chủ.
                        </p>
                        {this.state.error && (
                            <div style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid var(--border-color, #333)',
                                borderRadius: '8px',
                                padding: '10px',
                                fontSize: '0.75rem',
                                color: '#e06c75',
                                textAlign: 'left',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                maxHeight: '100px',
                                overflowY: 'auto',
                                marginBottom: '20px'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--sakura-pink, #f43f5e)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Về Trang Chủ
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #444)',
                                    background: 'transparent',
                                    color: 'var(--text-main, #eee)',
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
