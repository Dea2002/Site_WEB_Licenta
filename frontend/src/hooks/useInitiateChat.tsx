import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export const useInitiatePrivateChat = () => {
    const [isLoadingPrivate, setIsLoadingPrivate] = useState<boolean>(false);
    const navigate = useNavigate();

    const initiatePrivateChat = useCallback(async (recipientId: string) => {

        setIsLoadingPrivate(true);
        try {
            const response = await api.post('/conversations/initiatePrivate', {

                recipientId: recipientId,

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
                apartmentId,
                withOwner
            });

            if (!response.data) {
                throw new Error('failed to initiate group chat');
            }

            navigate(`/chat/${response.data._id.toString()}`);

        } catch (error) {
            console.error(`Error initiating group chat:`, error);
        } finally {
            setIsLoadingGroup(false);
        }
    }, [navigate]);

    return { isLoadingGroup, initiateGroupChat };
};