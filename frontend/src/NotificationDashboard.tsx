import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { parseISO, format } from 'date-fns';
import "./NotificationDashboard.css";
import { useNotifications } from './NotificationContext';
interface Notification {
    _id: string;
    message: string;
    receiver: string;
    sender: string;       // fie ObjectId string, fie 'system'
    isRead: boolean;
    date: string;         // ISO string
}

const NotificationDashboard: React.FC = () => {
    const { user, faculty, token } = useContext(AuthContext);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { refresh: refreshUnread } = useNotifications(); // refresh notifications

    const fetchNotifications = async () => {
        if (!token) {
            if (!user?._id && !faculty?._id) {
                setNotifications([]);
                setError('Nu eşti autentificat.');
                return;
            }
        }
        try {
            const resp = await axios.get<Notification[]>(
                'http://localhost:5000/notifications',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(resp.data);

        } catch (err: any) {
            console.error('Eroare la fetch notificări:', err);
            setError('Nu am putut încărca notificările.');
        }
    };

    useEffect(() => {
        setNotifications([]);
        setError(null);
        fetchNotifications();
    }, [token, user?._id, faculty?._id]);

    // Mark as read handler
    const handleMarkAsRead = async (id: string) => {
        try {
            await axios.put(
                `http://localhost:5000/notifications/${id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchNotifications();
            refreshUnread();
        } catch (err) {
            console.error('Eroare la marcarea citirii:', err);
        }
    };

    // Delete handler
    const handleDelete = async (id: string) => {
        try {
            await axios.delete(
                `http://localhost:5000/notifications/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await fetchNotifications();
            refreshUnread();
        } catch (err) {
            console.error('Eroare la ștergerea notificării:', err);
        }
    };

    const formatDate = (iso: string) =>
        format(parseISO(iso), 'dd.MM.yyyy HH:mm');

    return (
        <>
            <div className="notification-dashboard">
                <h1>Toate Notificările</h1>

                {error && <p className="error">{error}</p>}

                {!error && (
                    notifications.length === 0
                        ? <p>Nu ai notificări.</p>
                        : (
                            <table className="notif-table">
                                <thead>
                                    <tr>
                                        <th>Message</th>
                                        <th>Sender</th>
                                        <th>Data</th>
                                        <th>Status</th>
                                        <th>Actiuni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notifications.map(n => (
                                        <tr key={n._id} className={n.isRead ? 'read' : 'unread'}>
                                            <td>{n.message}</td>
                                            <td>{n.sender}</td>
                                            <td>{formatDate(n.date)}</td>
                                            <td>{n.isRead ? 'Citit' : 'Necitit'}</td>
                                            <td className="actions-cell">
                                                {!n.isRead && (
                                                    <button
                                                        className="btn-action btn-mark"
                                                        onClick={() => handleMarkAsRead(n._id)}
                                                    >
                                                        Marchează ca și citit
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-action btn-delete"
                                                    onClick={() => handleDelete(n._id)}
                                                >
                                                    Șterge
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                )}
            </div>
        </>
    );
};

export default NotificationDashboard;