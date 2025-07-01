import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api';
import { AuthContext } from './authenticate/AuthContext';

interface NotificationsContextType {
    unreadCount: number;
    refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
    unreadCount: 0,
    refresh: () => { },
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnread = useCallback(async () => {
        if (!isAuthenticated || !token) {
            setUnreadCount(0);
            return;
        }
        try {
            const { data } = await api.get<{ unread: number }>(
                '/notifications/unread-count',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnreadCount(data.unread);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, [isAuthenticated, token]);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchUnread();

            const id = setInterval(fetchUnread, 60000);
            return () => clearInterval(id);
        }
        setUnreadCount(0);
    }, [isAuthenticated, token, fetchUnread]);

    const refresh = useCallback(() => {
        fetchUnread();
    }, [fetchUnread]);

    return (
        <NotificationsContext.Provider value={{ unreadCount, refresh }}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationsContext);
