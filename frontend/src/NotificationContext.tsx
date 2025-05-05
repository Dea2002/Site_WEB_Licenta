import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
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

    const fetchUnread = useCallback(async () => { // Folosim useCallback pentru stabilitate
        if (!isAuthenticated || !token) { // Verificăm și token explicit
            setUnreadCount(0); // Resetăm explicit dacă nu e autentificat sau nu are token
            return;
        }
        try {
            const { data } = await axios.get<{ unread: number }>(
                'http://localhost:5000/notifications/unread-count',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnreadCount(data.unread);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
            // Poți alege să resetezi la 0 sau să păstrezi valoarea veche în caz de eroare
            // setUnreadCount(0);
        }
    }, [isAuthenticated, token]);

    // la mount și când tokenul se schimbă
    useEffect(() => {
        fetchUnread();
        // eventual polling la 60s:
        const id = setInterval(fetchUnread, 60000);
        return () => clearInterval(id);
    }, [isAuthenticated, token]);

    // useEffect(() => {
    //     fetchUnread(); // Fetch la mount și la schimbarea auth/token

    //     // Polling - pornește doar dacă e autentificat
    //     let intervalId: NodeJS.Timeout | null = null;
    //     if (isAuthenticated) {
    //         intervalId = setInterval(fetchUnread, 60000);
    //     }

    //     // Cleanup: oprește intervalul la unmount sau când se schimbă starea de autentificare
    //     return () => {
    //         if (intervalId) {
    //             clearInterval(intervalId);
    //         }
    //     };
    // }, [fetchUnread, isAuthenticated]);

    // Funcția refresh poate fi simplificată pentru a refolosi fetchUnread
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
