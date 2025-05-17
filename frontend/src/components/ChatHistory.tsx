import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import './ChatHistory.css';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
    _id: string;
    title?: string;
    lastMessageText?: string;
    participants: string[];
    isGroup: boolean;
    lastMessageAt: string;
}

interface UserBrief {
    _id: string;
    fullName: string;
}

const ChatHistory: React.FC = () => {
    const { user, token } = useContext(AuthContext);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    // 1) Load user's conversations
    useEffect(() => {
        if (!user?._id || !token) return;
        setLoading(true);
        api
            .get<Conversation[]>(`/conversations/${user._id}`)
            .then(res => setConversations(res.data))
            .catch(err => {
                console.error('Error loading conversations:', err);
                setError('Nu am putut încărca conversațiile.');
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    // 2) Whenever conversations change, batch-fetch any unknown participant names
    useEffect(() => {
        // collect all participant IDs except current user
        const otherIds = Array.from(
            new Set(
                conversations
                    .flatMap(conv => conv.participants)
                    .filter(id => id !== user!._id)
            )
        );
        // filter out those we already know
        const unknown = otherIds.filter(id => !userNames[id]);
        if (unknown.length === 0) return;

        api
            .get<UserBrief[]>('/users/batch', { params: { ids: unknown.join(',') } })
            .then(res => {
                setUserNames(prev => {
                    const copy = { ...prev };
                    res.data.forEach(u => {
                        copy[u._id] = u.fullName;
                    });
                    return copy;
                });
            })
            .catch(err => {
                console.error('Nu am putut încărca nume useri:', err);
            });
    }, [conversations, userNames, user]);

    if (loading) return <p className="chats-loading">Se încarcă conversațiile…</p>;
    if (error) return <p className="chats-error">{error}</p>;

    return (
        <div className="chats-container">
            <h1>Conversațiile mele</h1>
            {conversations.length === 0 ? (
                <p>Nu ai nicio conversație activă.</p>
            ) : (
                <ul className="chats-list">
                    {conversations.map(conv => {
                        // dacă nu există titlu custom, compunem din ceilalți participanți
                        const title =
                            conv.title ||
                            conv.participants
                                .filter(id => id !== user!._id)
                                .map(id => userNames[id] || '…')
                                .join(', ');

                        return (
                            <li key={conv._id} className="chat-item">
                                <Link to={`/chat/${conv._id}`} className="chat-link">
                                    <div className="chat-meta">
                                        <div className="chat-title">{title}</div>
                                        {conv.lastMessageText && (
                                            <div className="chat-snippet">
                                                {conv.lastMessageText.length > 40
                                                    ? conv.lastMessageText.slice(0, 40) + '…'
                                                    : conv.lastMessageText}
                                            </div>
                                        )}
                                    </div>
                                    <div className="chat-time">
                                        {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                            addSuffix: true
                                        })}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default ChatHistory;
