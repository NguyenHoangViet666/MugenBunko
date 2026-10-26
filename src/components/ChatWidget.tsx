import React, { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getTierName } from '../utils/levelHelper';
import { User, Message } from '../types';

interface ChatWidgetProps {
    currentUser: User | null;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
    API_BASE: string;
}

interface ChatMessage extends Message {
    date?: string;
}

export default function ChatWidget({ currentUser, fetchWithAuth, API_BASE }: ChatWidgetProps) {

    const [isOpen, setIsOpen] = useState(false);
    const [friends, setFriends] = useState<User[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFriend, setActiveFriend] = useState<User | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [searchFriendQuery, setSearchFriendQuery] = useState("");

    const messageEndRef = useRef<HTMLDivElement | null>(null);

    const [sending, setSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const live = useRef({ currentUser, fetchWithAuth, activeFriend, isOpen });
    live.current = { currentUser, fetchWithAuth, activeFriend, isOpen };
    const socketRef = useRef<Socket | null>(null);
    const historyRequest = useRef<AbortController | null>(null);
    const seenMessages = useRef(new Set<number>());
    const scrollFrame = useRef(0);
    const unreadInFlight = useRef(false);
    useEffect(() => {
        setIsOpen(false); setActiveFriend(null); setFriends([]); setMessages([]);
        setUnreadCount(0); setInputText(''); setChatError(''); seenMessages.current.clear();
    }, [currentUser?.id]);
    const scrollToBottom = () => {
        cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = requestAnimationFrame(() => {
            const body = messageEndRef.current?.closest<HTMLElement>('.chat-body');
            body?.scrollTo({ top: body.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        });
    };
    const fetchUnreadCount = async () => {
        const userId = live.current.currentUser?.id;
        if (!userId || unreadInFlight.current) return;
        unreadInFlight.current = true;
        try {
            const response = await live.current.fetchWithAuth(API_BASE + '/social/messages/unread-count');
            if (response.ok && live.current.currentUser?.id === userId) setUnreadCount(Number((await response.json()).unreadCount) || 0);
        } catch { /* Reconnect/visibility reconciles the badge. */ }
        finally { unreadInFlight.current = false; }
    };
    const fetchFriends = async () => {
        const userId = live.current.currentUser?.id;
        if (!userId) return;
        try {
            const response = await live.current.fetchWithAuth(API_BASE + '/social/friends');
            if (response.ok && live.current.currentUser?.id === userId) setFriends((await response.json()).friends || []);
        } catch { setChatError('Không thể tải bạn bè. Hãy thử mở lại cửa sổ chat.'); }
    };
    const markRead = async (friendId: number) => {
        try { await live.current.fetchWithAuth(API_BASE + '/social/messages/chat/' + friendId + '/read', { method: 'POST', body: '{}' }); }
        catch { /* Opening the conversation again reconciles unread state. */ }
    };
    const fetchMessages = async (friendId: number) => {
        historyRequest.current?.abort();
        const controller = new AbortController(); historyRequest.current = controller;
        const userId = live.current.currentUser?.id;
        try {
            const response = await live.current.fetchWithAuth(API_BASE + '/social/messages/chat/' + friendId, { signal: controller.signal });
            if (!response.ok) throw new Error();
            const data: ChatMessage[] = await response.json();
            if (controller.signal.aborted || live.current.currentUser?.id !== userId || live.current.activeFriend?.id !== friendId) return;
            setMessages(previous => [...new Map([...data, ...previous.filter(message => (message.sender_id === friendId || message.receiver_id === friendId) && !data.some(item => item.id === message.id))].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id));
            scrollToBottom();
            void fetchUnreadCount();
        } catch { if (!controller.signal.aborted) setChatError('Không thể tải hội thoại. Hãy thử mở lại.'); }
    };
    useEffect(() => {
        if (!currentUser) return;
        const userId = currentUser.id;
        const token = localStorage.getItem('mugen_token');
        const socket = io(API_BASE.replace(/\/api\/?$/, ''), { auth: token ? { token } : {}, withCredentials: true, reconnectionDelayMax: 10000 });
        socketRef.current = socket;
        seenMessages.current.clear(); setMessages([]); setUnreadCount(0);
        const reconcile = () => {
            if (document.hidden) return;
            void fetchUnreadCount();
            if (live.current.isOpen && live.current.activeFriend) void fetchMessages(live.current.activeFriend.id);
        };
        socket.on('connect', reconcile);
        socket.on('receive_message', (message: ChatMessage) => {
            if (live.current.currentUser?.id !== userId || seenMessages.current.has(message.id)) return;
            seenMessages.current.add(message.id);
            if (seenMessages.current.size > 500) seenMessages.current.delete(seenMessages.current.values().next().value!);
            const friend = live.current.activeFriend;
            const visible = live.current.isOpen && !document.hidden && friend && (friend.id === message.sender_id || friend.id === message.receiver_id);
            if (visible) {
                setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message]);
                scrollToBottom();
                if (message.receiver_id === userId) void markRead(message.sender_id);
            } else if (message.receiver_id === userId) setUnreadCount(count => count + 1);
        });
        socket.on('messages_read', (data: { userId: number; friendId: number }) => {
            if (data.userId === userId) void fetchUnreadCount();
            else if (data.friendId === userId) setMessages(previous => previous.map(message => message.receiver_id === data.userId ? { ...message, is_read: true } : message));
        });
        // HTTP is a slow fallback only; healthy sockets generate no polling requests.
        let timer = 0;
        const fallback = () => {
            if (!socket.connected) reconcile();
            timer = window.setTimeout(fallback, 60000 + Math.random() * 15000);
        };
        void fetchUnreadCount();
        timer = window.setTimeout(fallback, 60000 + Math.random() * 15000);
        document.addEventListener('visibilitychange', reconcile);
        window.addEventListener('online', reconcile);
        return () => {
            socket.disconnect(); socketRef.current = null; historyRequest.current?.abort();
            window.clearTimeout(timer); cancelAnimationFrame(scrollFrame.current);
            document.removeEventListener('visibilitychange', reconcile); window.removeEventListener('online', reconcile);
        };
    }, [API_BASE, currentUser?.id]);
    useEffect(() => { if (isOpen) { void fetchFriends(); void fetchUnreadCount(); } }, [isOpen, currentUser?.id]);
    useEffect(() => {
        if (isOpen && activeFriend) { setMessages([]); setChatError(''); void fetchMessages(activeFriend.id); }
        else historyRequest.current?.abort();
    }, [activeFriend?.id, isOpen]);
    const handleOpenChat = () => setIsOpen(open => !open);
    const handleSelectFriend = (friend: User) => { setActiveFriend(friend); setMessages([]); };
    const handleBackToFriends = () => { setActiveFriend(null); setMessages([]); void fetchFriends(); void fetchUnreadCount(); };
    const handleSendMessage = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (!inputText.trim() || !activeFriend || sending) return;
        const text = inputText.trim(), friendId = activeFriend.id;
        const senderId = currentUser?.id;
        setSending(true); setChatError('');
        try {
            const response = await fetchWithAuth(API_BASE + '/social/messages/send', { method: 'POST', body: JSON.stringify({ receiverId: friendId, messageText: text }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gửi tin nhắn thất bại.');
            if (live.current.currentUser?.id === senderId && live.current.activeFriend?.id === friendId) {
                setMessages(previous => previous.some(message => message.id === data.message.id) ? previous : [...previous, data.message]);
                setInputText(value => value.trim() === text ? '' : value); scrollToBottom();
            }
        } catch (error) { setChatError(error instanceof Error ? error.message : 'Gửi tin nhắn thất bại. Nội dung vẫn được giữ lại.'); }
        finally { setSending(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const filteredFriends = friends.filter(f =>
        f.displayname.toLowerCase().includes(searchFriendQuery.toLowerCase()) ||
        f.username.toLowerCase().includes(searchFriendQuery.toLowerCase())
    );

    if (!currentUser) return null;
    return (
        <div className="mugen-chat-widget">
            <style>{`
                .mugen-chat-widget {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9999;
                    font-family: var(--font-sans);
                }
                .chat-bubble-btn {
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    background: var(--text-main);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--bg-card);
                    cursor: pointer;
                    transition: var(--transition-smooth);
                    position: relative;
                }
                .chat-bubble-btn:hover {
                    opacity: 0.92;
                    transform: scale(1.06);
                }
                .chat-bubble-btn svg {
                    width: 26px;
                    height: 26px;
                    fill: currentColor;
                }
                .chat-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #ff3b30;
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    min-width: 18px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .chat-box {
                    position: absolute;
                    bottom: 72px;
                    right: 0;
                    width: 360px;
                    height: 480px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    box-shadow: var(--shadow-lg);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: var(--transition-smooth);
                    animation: slideUpChat 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                @keyframes slideUpChat {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .chat-header {
                    background: var(--indigo-blue);
                    color: white;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--border-color);
                }
                .chat-header-user {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .chat-header-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--bg-base);
                    overflow: hidden;
                    border: 1.5px solid white;
                }
                .chat-header-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .chat-header-title {
                    font-size: 0.95rem;
                    font-weight: 600;
                }
                .chat-header-subtitle {
                    font-size: 0.75rem;
                    opacity: 0.8;
                }
                .chat-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .chat-header-btn {
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                .chat-header-btn:hover {
                    background: rgba(255,255,255,0.1);
                }
                .chat-header-btn svg {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                }
                .chat-search-bar {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-base);
                }
                .chat-search-input {
                    width: 100%;
                    padding: 6px 10px;
                    border-radius: var(--border-radius-sm);
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-main);
                    font-size: 0.85rem;
                    outline: none;
                }
                .chat-search-input:focus {
                    border-color: var(--text-main);
                }
                .chat-body {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-base);
                }
                .chat-friend-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .chat-friend-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .chat-friend-item:hover {
                    background: var(--bg-card-hover);
                }
                .friend-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #eee;
                    border: 1px solid var(--border-color);
                }
                .friend-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .friend-info {
                    flex: 1;
                }
                .friend-name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-main);
                }
                .friend-status {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .chat-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    color: var(--text-muted);
                    flex: 1;
                }
                .chat-empty-state svg {
                    width: 48px;
                    height: 48px;
                    fill: var(--text-muted);
                    margin-bottom: 12px;
                }
                .chat-empty-state p {
                    font-size: 0.85rem;
                }
                .chat-messages-container {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .chat-msg-row {
                    display: flex;
                    flex-direction: column;
                    max-width: 75%;
                }
                .chat-msg-row.sent {
                    align-self: flex-end;
                    align-items: flex-end;
                }
                .chat-msg-row.received {
                    align-self: flex-start;
                    align-items: flex-start;
                }
                .chat-msg-bubble {
                    padding: 8px 12px;
                    border-radius: 12px;
                    font-size: 0.88rem;
                    line-height: 1.4;
                    word-break: break-word;
                    box-shadow: var(--shadow-sm);
                }
                .chat-msg-row.sent .chat-msg-bubble {
                    background: var(--text-main);
                    color: var(--bg-card);
                    border-bottom-right-radius: 2px;
                }
                .chat-msg-row.received .chat-msg-bubble {
                    background: var(--bg-card);
                    color: var(--text-main);
                    border: 1px solid var(--border-color);
                    border-bottom-left-radius: 2px;
                }
                .chat-msg-time {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    margin-top: 2px;
                    padding: 0 4px;
                }
                .chat-input-area {
                    padding: 10px 12px;
                    background: var(--bg-card);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .chat-textarea {
                    flex: 1;
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 8px 16px;
                    resize: none;
                    height: 36px;
                    font-size: 0.85rem;
                    outline: none;
                    background: var(--bg-base);
                    color: var(--text-main);
                    line-height: 1.2;
                }
                .chat-textarea:focus {
                    border-color: var(--text-main);
                }
                .chat-send-btn {
                    background: var(--text-main);
                    border: none;
                    color: var(--bg-card);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                }
                .chat-send-btn:hover {
                    opacity: 0.9;
                    transform: scale(1.05);
                }
                .chat-send-btn svg {
                    width: 18px;
                    height: 18px;
                    fill: currentColor;
                }
            `}</style>

            {/* Bubble Button */}
            <button className="chat-bubble-btn" onClick={handleOpenChat} title="Nhắn tin với bạn bè">
                <svg viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
                {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
            </button>

            {/* Chat Box */}
            {isOpen && (
                <div className="chat-box">
                    {/* Active Friend Chat View */}
                    {activeFriend ? (
                        <>
                            <div className="chat-header">
                                <div className="chat-header-user">
                                    <button className="chat-header-btn" onClick={handleBackToFriends} title="Quay lại">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                                        </svg>
                                    </button>
                                    <div className="chat-header-avatar">
                                        <img 
                                            src={activeFriend.avatarSeed && (activeFriend.avatarSeed.startsWith('http') || activeFriend.avatarSeed.startsWith('/uploads') || activeFriend.avatarSeed.startsWith('data:')) 
                                                ? activeFriend.avatarSeed 
                                                : `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeFriend.avatarSeed || 'Default'}`} 
                                            alt={activeFriend.displayname} 
                                        />
                                    </div>
                                    <div>
                                        <div className="chat-header-title">{activeFriend.displayname}</div>
                                        <div className="chat-header-subtitle">Bạn bè (Cấp {getTierName(activeFriend.level)})</div>
                                    </div>
                                </div>
                                <div className="chat-header-actions">
                                    <button className="chat-header-btn" onClick={() => setIsOpen(false)} title="Đóng">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="chat-body">
                                <div className="chat-messages-container">
                                    {messages.length > 0 ? (
                                        messages.map((msg) => {
                                            const isSentByMe = msg.sender_id === currentUser.id;
                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    className={`chat-msg-row ${isSentByMe ? 'sent' : 'received'}`}
                                                >
                                                    <div className="chat-msg-bubble">
                                                        {msg.message_text}
                                                    </div>
                                                    <span className="chat-msg-time">{msg.date}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="chat-empty-state">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                            </svg>
                                            <p>Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!</p>
                                        </div>
                                    )}
                                    <div ref={messageEndRef} />
                                </div>
                            </div>

                            {chatError && <p role="alert" style={{ padding: '8px 14px', color: 'var(--sakura-pink)', fontSize: '.8rem' }}>{chatError}</p>}
                            <form className="chat-input-area" onSubmit={handleSendMessage} aria-busy={sending}>
                                <input
                                    type="text"
                                    className="chat-textarea"
                                    placeholder="Nhập tin nhắn..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button type="submit" className="chat-send-btn" title="Gửi" aria-label={sending ? 'Đang gửi' : 'Gửi tin nhắn'} disabled={sending || !inputText.trim()}>
                                    <svg viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Friends List View */
                        <>
                            <div className="chat-header">
                                <div className="chat-header-title">Trò chuyện bạn bè</div>
                                <button className="chat-header-btn" onClick={() => setIsOpen(false)} title="Đóng">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Search bar inside friends list */}
                            <div className="chat-search-bar">
                                <input
                                    type="text"
                                    className="chat-search-input"
                                    placeholder="Tìm kiếm bạn bè..."
                                    value={searchFriendQuery}
                                    onChange={(e) => setSearchFriendQuery(e.target.value)}
                                />
                            </div>

                            <div className="chat-body">
                                {filteredFriends.length > 0 ? (
                                    <ul className="chat-friend-list">
                                        {filteredFriends.map((friend) => (
                                            <li 
                                                key={friend.id} 
                                                className="chat-friend-item"
                                                onClick={() => handleSelectFriend(friend)}
                                            >
                                                <div className="friend-avatar">
                                                    <img 
                                                        src={friend.avatarSeed && (friend.avatarSeed.startsWith('http') || friend.avatarSeed.startsWith('/uploads') || friend.avatarSeed.startsWith('data:')) 
                                                            ? friend.avatarSeed 
                                                            : `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.avatarSeed || 'Default'}`} 
                                                        alt={friend.displayname} 
                                                    />
                                                </div>
                                                <div className="friend-info">
                                                    <div className="friend-name">{friend.displayname}</div>
                                                    <div className="friend-status">{friend.bio || "Thành viên MugenBunko"}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="chat-empty-state">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                        </svg>
                                        <p>
                                            {searchFriendQuery 
                                                ? "Không tìm thấy bạn bè nào khớp." 
                                                : "Chưa có bạn bè. Hãy vào trang Profile để tìm kiếm và kết bạn nhé!"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
