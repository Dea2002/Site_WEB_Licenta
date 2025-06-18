import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// Hook-ul va returna starea de incarcare si functia pe care o putem apela
export const useInitiatePrivateChat = () => {
    const [isLoadingPrivate, setIsLoadingPrivate] = useState<boolean>(false);
    const navigate = useNavigate();

    // Folosim useCallback pentru a ne asigura ca functia nu se recreeaza la fiecare render
    // daca nu este necesar. Este o buna practica de performanta.
    const initiatePrivateChat = useCallback(async (recipientId: string) => {
        console.log("recipientId: ", recipientId);

        setIsLoadingPrivate(true);
        try {
            const response = await api.post('/conversations/initiatePrivate', {

                recipientId: recipientId, // ID-ul utilizatorului cu care dorim sa incepem chat-ul

            });

            if (!response.data) {
                throw new Error('failed to initiate private chat');
            }


            navigate(`/chat/${response.data._id.toString()}`);

        } catch (error) {
            console.error(`Error initiating private chat:`, error);
        } finally {
            setIsLoadingPrivate(false);
        }
    }, [navigate]);

    return { isLoadingPrivate, initiatePrivateChat };
};

export const useInitiateGroupChat = () => {
    const [isLoadingGroup, setIsLoadingGroup] = useState<boolean>(false);
    const navigate = useNavigate();

    const initiateGroupChat = useCallback(async (apartmentId: string, withOwner: boolean) => {
        setIsLoadingGroup(true);
        try {
            const response = await api.post('/conversations/initiateGroup', {
                body: {
                    apartmentId,
                    withOwner
                }
            });

            if (!response.data) {
                throw new Error('failed to initiate group chat');
            }

            navigate(`/chat/${response.data.conversationId}`);

        } catch (error) {
            console.error(`Error initiating group chat:`, error);
        } finally {
            setIsLoadingGroup(false);
        }
    }, [navigate]);

    return { isLoadingGroup, initiateGroupChat };
};