import { FC, useContext } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from './ChatWindow';
import { AuthContext } from '../authenticate/AuthContext';

interface Params {
    [key: string]: string | undefined;
    conversationId: string;
}

const ChatPage: FC = () => {
    const { conversationId } = useParams<Params>();
    const { user } = useContext(AuthContext);

    if (!conversationId || !user) {
        return <p>Loading...</p>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            <h2>Chat</h2>
            <ChatWindow conversationId={conversationId} userId={user._id} />
        </div>
    );
};

export default ChatPage;
