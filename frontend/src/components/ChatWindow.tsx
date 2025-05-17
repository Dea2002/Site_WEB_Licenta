import { FC, useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { api, socket } from '../api';
import { format, parseISO } from 'date-fns';

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
        console.log('🔄 Loading history for', conversationId);
        socket.emit('join', conversationId);

        api.get<Message[]>(`/messages/${conversationId}?limit=100`)
            .then(res => {
                console.log('📨 History response:', res.data);
                setMessages(res.data);
                preloadNames(res.data);
            })
            .catch(err => {
                console.error('❌ Error loading history:', err);
            });

        const handler = (msg: Message) => {
            console.log('🆕 New WS message:', msg);
            if (msg.conversationId === conversationId) {
                setMessages(prev => [...prev, msg]);
            }
        };
        socket.on('message:new', handler);
        return () => { socket.off('message:new', handler); };
    }, [conversationId]);

    function preloadNames(newMsgs: Message[]) {
        const unknownIds = Array.from(new Set(
            newMsgs
                .map(m => m.senderId)
                .filter(id => !userNames[id])
        ));
        if (unknownIds.length === 0) return;

        // apelăm batch-ul de useri (trebuie să ai un endpoint de genul GET /users/batch?ids=...)
        api.get<{ _id: string; fullName: string }[]>('/users/batch', {
            params: { ids: unknownIds.join(',') }
        }).then(res => {
            const map = { ...userNames };
            res.data.forEach(u => {
                map[u._id] = u.fullName;
            });
            setUserNames(map);
        }).catch(err => console.error('nu am putut încărca nume useri:', err));
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

    // ------- grupăm mesajele după data (yyyy-MM-dd) -------
    const grouped: Record<string, Message[]> = messages.reduce((acc, m) => {
        const day = format(parseISO(m.createdAt), 'yyyy-MM-dd');
        (acc[day] = acc[day] || []).push(m);
        return acc;
    }, {} as Record<string, Message[]>);

    // păstrăm ordinea zilelor
    const sortedDays = Object.keys(grouped).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div>
            <div style={{ height: 300, overflowY: 'auto', border: '1px solid #ccc' }}>
                {sortedDays.map(day => (
                    <div key={day}>
                        {/* header cu data */}
                        <div style={{
                            textAlign: 'center',
                            margin: '8px 0',
                            fontWeight: 'bold'
                        }}>
                            {format(parseISO(day), 'dd MMMM yyyy')}
                        </div>
                        {grouped[day].map(m => (
                            <div key={m._id} style={{ padding: '4px' }}>
                                <strong>{userNames[m.senderId] ?? m.senderId}</strong>{' '}
                                [{format(parseISO(m.createdAt), 'HH:mm')}]:&nbsp;{m.text}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <input
                style={{ width: '80%' }}
                value={text}
                onChange={onChange}
                onKeyDown={onKeyDown}
            />
            <button onClick={send}>Trimite</button>
        </div>
    );
};

export default ChatWindow;
