import React, { FC, useContext } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from './ChatWindow';
import { AuthContext } from '../AuthContext';  // presupunem că ai un hook care-ți dă user-ul curent

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
