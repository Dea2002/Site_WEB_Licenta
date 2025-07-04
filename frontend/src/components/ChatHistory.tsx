import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../authenticate/AuthContext';
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

    useEffect(() => {
        if (!user?._id || !token) return;
        setLoading(true);
        api
            .get<Conversation[]>(`/conversations/${user._id}`)
            .then(res => setConversations(res.data))
            .catch(err => {
                console.error('Error loading conversations:', err);
                setError('Nu am putut incarca conversatiile.');
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    useEffect(() => {
        const otherIds = Array.from(
            new Set(
                conversations
                    .flatMap(conv => conv.participants)
                    .filter(id => id !== user!._id)
            )
        );
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
                console.error('Nu am putut incarca nume useri:', err);
            });
    }, [conversations, userNames, user]);

    if (loading) return <p className="chats-loading">Se incarca conversatiile…</p>;
    if (error) return <p className="chats-error">{error}</p>;

    return (
        <div className="chats-container">
            <h1>Conversatiile mele</h1>
            {conversations.length === 0 ? (
                <p>Nu ai nicio conversatie activa.</p>
            ) : (
                <ul className="chats-list">
                    {conversations.map(conv => {
                        const participantsArray = Array.isArray(conv.participants) ? conv.participants : [];
                        const title =
                            conv.title ||
                            participantsArray
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
                                        {conv.lastMessageAt && formatDistanceToNow(new Date(conv.lastMessageAt), {
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