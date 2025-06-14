import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api';
import { AuthContext } from './AuthContext';

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

    const fetchUnread = useCallback(async () => { // Folosim useCallback pentru stabilitate
        if (!isAuthenticated || !token) { // Verificam si token explicit
            setUnreadCount(0); // Resetam explicit daca nu e autentificat sau nu are token
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
            // setUnreadCount(0);
        }
    }, [isAuthenticated, token]);

    // la mount si cand tokenul se schimba
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchUnread();
            // eventual polling la 60s:
            const id = setInterval(fetchUnread, 60000);
            return () => clearInterval(id);
        }
        setUnreadCount(0); // Resetam la 0 daca nu e autentificat
    }, [isAuthenticated, token, fetchUnread]);

    // Functia refresh poate fi simplificata pentru a refolosi fetchUnread
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
