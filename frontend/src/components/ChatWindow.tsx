import { FC, useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { api, socket } from '../api';
import { format, parseISO } from 'date-fns';
import './ChatWindow.css'; // <--- Adauga importul CSS

interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
}

interface ChatWindowProps {
    conversationId: string;
    userId: string;
}

const ChatWindow: FC<ChatWindowProps> = ({ conversationId, userId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState<string>('');
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        socket.emit('join', conversationId);

        api.get<Message[]>(`/messages/${conversationId}?limit=100`)
            .then(res => {
                setMessages(res.data);
                console.log("preload din handler de new message");

                preloadNames(res.data);
            })
            .catch(err => {
                console.error('Error loading history:', err);
            });

        const handler = (msg: Message) => {
            if (msg.conversationId === conversationId) {
                setMessages(prev => [...prev, msg]);
                console.log("preload din handler de new message");

                preloadNames(messages);
            }
        };
        socket.on('message:new', handler);
        return () => { socket.off('message:new', handler); };
    }, [conversationId]);

    useEffect(() => {
        // Scroll to bottom when new messages arrive or messages are loaded
        const messageContainer = document.querySelector('.chat-messages');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }, [messages]);

    function preloadNames(newMsgs: Message[]) {
        console.log("fac preload");
        console.log("mesajele din argument: ", newMsgs);
        const unknownIds = Array.from(new Set(
            newMsgs
                .map(m => m.senderId)
                .filter(id => id && !userNames[id]) // Adaugat check pentru id
        ));
        console.log("unknown: ", unknownIds);
        if (unknownIds.length === 0) return;

        api.get<{ _id: string; fullName: string }[]>('/users/batch', {
            params: { ids: unknownIds.join(',') }
        }).then(res => {
            const map = { ...userNames };
            res.data.forEach(u => {
                map[u._id] = u.fullName;
            });
            setUserNames(map);
            console.log("usernames: ", userNames);
        }).catch(err => console.error('nu am putut incarca nume useri:', err));
    }

    const send = () => {
        if (!text.trim()) return;
        socket.emit('message:send', {
            conversationId,
            senderId: userId,
            text
        });
        setText('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') send(); };
    const onChange = (e: ChangeEvent<HTMLInputElement>) => { setText(e.target.value); };

    const grouped: Record<string, Message[]> = messages.reduce((acc, m) => {
        const day = format(parseISO(m.createdAt), 'yyyy-MM-dd');
        (acc[day] = acc[day] || []).push(m);
        return acc;
    }, {} as Record<string, Message[]>);

    const sortedDays = Object.keys(grouped).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div className="chat-window">
            <div className="chat-messages">
                {sortedDays.map(day => (
                    <div key={day} className="message-day-group">
                        <div className="date-separator">
                            <span>{format(parseISO(day), 'dd MMMM yyyy')}</span>
                        </div>
                        {grouped[day].map(m => {
                            const isMyMessage = m.senderId === userId;
                            return (
                                <div
                                    key={m._id}
                                    className={`message-item ${isMyMessage ? 'my-message' : 'other-message'}`}
                                >
                                    <div className="message-content">
                                        {!isMyMessage && (
                                            <div className="message-sender">
                                                {userNames[m.senderId] ?? m.senderId.substring(0, 8)}
                                            </div>
                                        )}
                                        <div className="message-text">{m.text}</div>
                                        <div className="message-timestamp">
                                            {format(parseISO(m.createdAt), 'HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="chat-input-area">
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Scrie un mesaj..."
                    value={text}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
                <button className="send-button" onClick={send}>
                    {/* Poti folosi un SVG icon aici pentru un look mai modern */}
                    Trimite
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;