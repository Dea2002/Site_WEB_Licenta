import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
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

    const fetchUnread = async () => {
        if (!isAuthenticated) {
            setUnreadCount(0);
            return;
        }
        try {
            const { data } = await axios.get<{ unread: number }>(
                'http://localhost:5000/notifications/unread-count',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnreadCount(data.unread);
        } catch {
            // dacă dai error, poți lăsa 0 sau păstra ultima valoare
        }
    };

    // la mount și când tokenul se schimbă
    useEffect(() => {
        fetchUnread();
        // eventual polling la 60s:
        const id = setInterval(fetchUnread, 60000);
        return () => clearInterval(id);
    }, [token, isAuthenticated]);

    return (
        <NotificationsContext.Provider value={{ unreadCount, refresh: fetchUnread }}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationsContext);
