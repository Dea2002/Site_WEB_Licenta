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
        if (!isAuthenticated || !token) { // Verificăm si token explicit
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
            // Poti alege să resetezi la 0 sau să păstrezi valoarea veche in caz de eroare
            // setUnreadCount(0);
        }
    }, [isAuthenticated, token]);

    // la mount si cand tokenul se schimbă
    useEffect(() => {
        fetchUnread();
        // eventual polling la 60s:
        const id = setInterval(fetchUnread, 60000);
        return () => clearInterval(id);
    }, [isAuthenticated, token]);

    // useEffect(() => {
    //     fetchUnread(); // Fetch la mount si la schimbarea auth/token

    //     // Polling - porneste doar dacă e autentificat
    //     let intervalId: NodeJS.Timeout | null = null;
    //     if (isAuthenticated) {
    //         intervalId = setInterval(fetchUnread, 60000);
    //     }

    //     // Cleanup: opreste intervalul la unmount sau cand se schimbă starea de autentificare
    //     return () => {
    //         if (intervalId) {
    //             clearInterval(intervalId);
    //         }
    //     };
    // }, [fetchUnread, isAuthenticated]);

    // Functia refresh poate fi simplificată pentru a refolosi fetchUnread
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
