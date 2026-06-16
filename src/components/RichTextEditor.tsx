import React, { useState, useRef } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    id?: string;
    minHeight?: string;
    required?: boolean;
}

export function parseFormattedContent(text: string): React.ReactNode {
    if (!text) return "";
    
    // 1. Escape HTML to prevent XSS
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    // 2. Parse Spoilers: [spoiler]text[/spoiler]
    escaped = escaped.replace(/\[spoiler\](.*?)\[\/spoiler\]/gi, (match, content) => {
        return `<span class="spoiler-text" title="Nhấp để xem spoil" onclick="this.classList.toggle('revealed')">${content}</span>`;
    });
    
    // 3. Parse Bold: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 4. Parse Italic: *text*
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 5. Parse Links: [label](url)
    escaped = escaped.replace(/\[(.*?)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer" class="forum-link">$1</a>');
    
    // 6. Convert newlines to <br />
    escaped = escaped.replace(/\n/g, '<br />');
    
    return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}

// Extract [img]url[/img] from content and return clean content and image array
export function extractAndCleanImages(content: string): { cleanContent: string, images: string[] } {
    if (!content) return { cleanContent: "", images: [] };

    const images: string[] = [];
    const imgRegex = /\[img\](.*?)\[\/img\]/gi;
    
    let match;
    const urlsFound = new Set<string>();
    while ((match = imgRegex.exec(content)) !== null) {
        if (match[1]) {
            const url = match[1].trim();
            if (url) {
                images.push(url);
                urlsFound.add(match[0]);
            }
        }
    }

    let cleanContent = content;
    urlsFound.forEach(tag => {
        cleanContent = cleanContent.split(tag).join('');
    });

    // Clean up excessive newlines
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

    return { cleanContent, images };
}

interface ForumImageGridProps {
    images: string[];
    onImageClick: (url: string) => void;
}

export function ForumImageGrid({ images, onImageClick }: ForumImageGridProps) {
    if (!images || images.length === 0) return null;

    const count = images.length;
    
    if (count === 1) {
        return (
            <div className="forum-image-wrapper" style={{ marginTop: '14px' }}>
                <img 
                    src={images[0]} 
                    alt="Post media" 
                    className="forum-image-preview" 
                    onClick={() => onImageClick(images[0])}
                />
            </div>
        );
    }

    let gridStyle: React.CSSProperties = {
        display: 'grid',
        gap: '8px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '14px',
        border: '1px solid var(--border-color)',
        width: '100%',
        cursor: 'pointer'
    };

    if (count === 2) {
        return (
            <div style={{ ...gridStyle, gridTemplateColumns: '1fr 1fr', height: '320px' }}>
                {images.map((img, i) => (
                    <div key={i} className="grid-image-item" onClick={() => onImageClick(img)}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (count === 3) {
        return (
            <div style={{ ...gridStyle, gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', height: '360px' }}>
                <div onClick={() => onImageClick(images[0])} style={{ gridRow: 'span 2' }} className="grid-image-item">
                    <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div onClick={() => onImageClick(images[1])} className="grid-image-item">
                    <img src={images[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div onClick={() => onImageClick(images[2])} className="grid-image-item">
                    <img src={images[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>
        );
    }

    // 4 or more images
    const remaining = count - 4;
    return (
        <div style={{ ...gridStyle, gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr 1fr', height: '400px' }}>
            <div onClick={() => onImageClick(images[0])} style={{ gridRow: 'span 3' }} className="grid-image-item">
                <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div onClick={() => onImageClick(images[1])} className="grid-image-item">
                <img src={images[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div onClick={() => onImageClick(images[2])} className="grid-image-item">
                <img src={images[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div onClick={() => onImageClick(images[3])} className="grid-image-item">
                <img src={images[3]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {remaining > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}>
                        +{remaining + 1}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = "Nhập nội dung...",
    id,
    minHeight = "120px",
    required = false
}: RichTextEditorProps) {
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [editorPrompt, setEditorPrompt] = useState<{
        type: 'link' | 'image' | null;
        url: string;
        label: string;
    }>({ type: null, url: '', label: '' });

    const insertTag = (beforeVal: string, afterVal: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        const replacement = beforeVal + selectedText + afterVal;
        const newValue = text.substring(0, start) + replacement + text.substring(end);

        onChange(newValue);

        // Put focus back and restore cursor/selection
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + beforeVal.length + selectedText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 50);
    };

    const handleBold = () => insertTag('**', '**');
    const handleItalic = () => insertTag('*', '*');
    
    const handleLink = () => {
        const textarea = textareaRef.current;
        const selectedText = textarea ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : "";
        setEditorPrompt({
            type: 'link',
            url: 'https://',
            label: selectedText || 'Liên kết'
        });
    };

    const handleSpoiler = () => insertTag('[spoiler]', '[/spoiler]');
    
    const handleImage = () => {
        setEditorPrompt({
            type: 'image',
            url: 'https://',
            label: ''
        });
    };

    return (
        <div className="rich-text-editor-container" style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--bg-card)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {/* Editor Toolbar */}
            <div className="editor-toolbar" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-base)',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                {/* Formatting controls */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={handleBold}
                        disabled={activeTab === 'preview'}
                        style={{
                            padding: '4px 10px',
                            fontWeight: 'bold',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: activeTab === 'preview' ? 'not-allowed' : 'pointer',
                            opacity: activeTab === 'preview' ? 0.5 : 1,
                            fontSize: '0.82rem',
                            transition: 'var(--transition-smooth)'
                        }}
                        className="toolbar-btn"
                        title="In đậm (Bold)"
                    >
                        B
                    </button>
                    <button
                        type="button"
                        onClick={handleItalic}
                        disabled={activeTab === 'preview'}
                        style={{
                            padding: '4px 10px',
                            fontStyle: 'italic',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: activeTab === 'preview' ? 'not-allowed' : 'pointer',
                            opacity: activeTab === 'preview' ? 0.5 : 1,
                            fontSize: '0.82rem',
                            transition: 'var(--transition-smooth)'
                        }}
                        className="toolbar-btn"
                        title="In nghiêng (Italic)"
                    >
                        I
                    </button>
                    <button
                        type="button"
                        onClick={handleLink}
                        disabled={activeTab === 'preview'}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: activeTab === 'preview' ? 'not-allowed' : 'pointer',
                            opacity: activeTab === 'preview' ? 0.5 : 1,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'var(--transition-smooth)'
                        }}
                        className="toolbar-btn"
                        title="Chèn liên kết"
                    >
                        🔗 Link
                    </button>
                    <button
                        type="button"
                        onClick={handleSpoiler}
                        disabled={activeTab === 'preview'}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: activeTab === 'preview' ? 'not-allowed' : 'pointer',
                            opacity: activeTab === 'preview' ? 0.5 : 1,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'var(--transition-smooth)'
                        }}
                        className="toolbar-btn"
                        title="Chèn thẻ Spoiler che nội dung spoil"
                    >
                        🤫 Spoiler
                    </button>
                    <button
                        type="button"
                        onClick={handleImage}
                        disabled={activeTab === 'preview'}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: activeTab === 'preview' ? 'not-allowed' : 'pointer',
                            opacity: activeTab === 'preview' ? 0.5 : 1,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'var(--transition-smooth)'
                        }}
                        className="toolbar-btn"
                        title="Chèn hình ảnh từ link URL"
                    >
                        🖼️ Ảnh URL
                    </button>
                </div>

                {/* Tab selector */}
                <div style={{ display: 'flex', gap: '4px', background: 'var(--border-color)', padding: '2px', borderRadius: '6px' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        style={{
                            padding: '3px 10px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: activeTab === 'write' ? '600' : 'normal',
                            background: activeTab === 'write' ? 'var(--bg-card)' : 'transparent',
                            color: activeTab === 'write' ? 'var(--sakura-pink)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Viết
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        style={{
                            padding: '3px 10px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: activeTab === 'preview' ? '600' : 'normal',
                            background: activeTab === 'preview' ? 'var(--bg-card)' : 'transparent',
                            color: activeTab === 'preview' ? 'var(--sakura-pink)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Xem trước
                    </button>
                </div>
            </div>

            {/* Input / Preview Area */}
            <div className="editor-content-area" style={{ flex: 1, position: 'relative' }}>
                {activeTab === 'write' ? (
                    <textarea
                        ref={textareaRef}
                        id={id}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        required={required}
                        style={{
                            width: '100%',
                            minHeight: minHeight,
                            padding: '12px',
                            border: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: '0.88rem',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            display: 'block'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            minHeight: minHeight,
                            padding: '12px',
                            background: 'var(--bg-base)',
                            color: 'var(--text-main)',
                            fontSize: '0.88rem',
                            lineHeight: '1.6',
                            overflowY: 'auto',
                            maxHeight: '400px',
                            borderBottomLeftRadius: 'var(--border-radius-md)',
                            borderBottomRightRadius: 'var(--border-radius-md)'
                        }}
                        className="rich-preview-content"
                    >
                        {value ? (
                            (() => {
                                const { cleanContent, images } = extractAndCleanImages(value);
                                return (
                                    <>
                                        <div style={{ wordBreak: 'break-word' }}>{parseFormattedContent(cleanContent)}</div>
                                        <ForumImageGrid images={images} onImageClick={() => {}} />
                                    </>
                                );
                            })()
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có nội dung xem trước...</span>
                        )}
                    </div>
                )}
            </div>

            {editorPrompt.type && (
                <div className="editor-prompt-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    animation: 'fadeInPrompt 0.2s ease-out'
                }}>
                    <style>{`
                        @keyframes fadeInPrompt {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                    `}</style>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '16px',
                        width: '100%',
                        maxWidth: '280px',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--sakura-pink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {editorPrompt.type === 'link' ? '🔗 Chèn liên kết' : '🖼️ Chèn ảnh URL'}
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Địa chỉ URL</label>
                            <input
                                type="text"
                                value={editorPrompt.url}
                                onChange={(e) => setEditorPrompt(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://..."
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-base)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                    width: '100%'
                                }}
                                autoFocus
                            />
                        </div>

                        {editorPrompt.type === 'link' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tiêu đề hiển thị</label>
                                <input
                                    type="text"
                                    value={editorPrompt.label}
                                    onChange={(e) => setEditorPrompt(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="Liên kết"
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-base)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.78rem',
                                        outline: 'none',
                                        width: '100%'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="outline-btn small"
                                style={{ padding: '4px 10px', fontSize: '0.72rem', height: '28px' }}
                                onClick={() => setEditorPrompt({ type: null, url: '', label: '' })}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="primary-btn small"
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'var(--sakura-pink)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
                                onClick={() => {
                                    if (editorPrompt.type === 'link') {
                                        insertTag(`[${editorPrompt.label || 'Liên kết'}]`, `(${editorPrompt.url})`);
                                    } else if (editorPrompt.type === 'image') {
                                        insertTag(`[img]${editorPrompt.url}`, `[/img]`);
                                    }
                                    setEditorPrompt({ type: null, url: '', label: '' });
                                }}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
