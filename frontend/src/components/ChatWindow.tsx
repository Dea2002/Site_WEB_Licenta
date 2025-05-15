import { FC, useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { api, socket } from '../api';
import { format } from 'date-fns';

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

    useEffect(() => {
        console.log('🔄 Loading history for', conversationId);
        socket.emit('join', conversationId);

        api.get<Message[]>(`/messages/${conversationId}?limit=100`)
            .then(res => {
                console.log('📨 History response:', res.data);
                setMessages(res.data);
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

    const send = () => {
        if (!text.trim()) return;
        socket.emit('message:send', {
            conversationId,
            senderId: userId,
            text
        });
        setText('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') send();
    };

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
    };

    return (
        <div>
            <div style={{ height: 300, overflowY: 'auto', border: '1px solid #ccc' }}>
                {messages.map(m => (
                    <div key={m._id} style={{ padding: '4px' }}>
                        <strong>{m.senderId}</strong> [{format(new Date(m.createdAt), 'HH:mm')}]:
                        &nbsp;{m.text}
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
