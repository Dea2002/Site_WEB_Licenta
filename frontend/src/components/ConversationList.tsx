import { FC, useState, useEffect } from 'react';
import { api } from '../api';

interface Conversation {
    _id: string;
    participants: string[];
}

interface ConversationListProps {
    userId: string;
    onSelect: (conversationId: string) => void;
}

const ConversationList: FC<ConversationListProps> = ({ userId, onSelect }) => {
    const [list, setList] = useState<Conversation[]>([]);

    useEffect(() => {
        api.get<Conversation[]>(`/conversations/${userId}`)
            .then(res => setList(res.data))
            .catch(console.error);
    }, [userId]);

    return (
        <ul>
            {list.map(c => (
                <li key={c._id}>
                    <button onClick={() => onSelect(c._id)}>
                        Conv {c._id.slice(-4)} ({c.participants.length})
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default ConversationList;
