import React, { useState, useEffect, useContext } from 'react';
import { api } from '../../api';
import { AuthContext } from '../../AuthContext';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import './profile_student.css';

interface RentHistoryProps {
    userId: string;
}

// Interfata similara cu cea din CurrentRent, poate fi partajata

interface AptInfo {
    location: string;
    price: number;
    numberOfRooms: number;
}

interface CurrentRentRequest {
    _id: string;
    apartment: AptInfo;
    checkIn: string;
    checkOut: string;
    rooms: number;
    createdAt: string;
}

interface HistoryEntry {
    _id: string;
    apartment: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    createdAt: string;
}

const RentHistory: React.FC<RentHistoryProps> = () => {
    const { token } = useContext(AuthContext);
    const [currentRentRequests, setCurrentRent] = useState<CurrentRentRequest[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loadingCurrent, setLoadingCurrent] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [errorCurrent, setErrorCurrent] = useState<string | null>(null);
    const [errorHistory, setErrorHistory] = useState<string | null>(null);

    // Stare noua pentru operatiunea de anulare
    const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        // Fetch current rent
        api.get<CurrentRentRequest[]>(`/users/current_request`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(({ data }) => {
                setCurrentRent(data);
            })
            .catch(err => {
                if (err.response?.status === 404) {
                    setCurrentRent([]);
                } else {
                    setErrorCurrent(
                        err.response?.data?.message || 'Eroare la incarcarea cererii curente.'
                    );
                }
            })
            .finally(() => setLoadingCurrent(false));

        // Fetch history
        api.get<HistoryEntry[]>(`/users/reservations_history`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(({ data }) => setHistory(data))
            .catch(err => {
                setErrorHistory(
                    err.response?.data?.message || 'Eroare la incarcarea istoricului.'
                );
            })
            .finally(() => setLoadingHistory(false));
    }, [token]);

    const handleCancelRequest = async (requestId: string) => {
        if (!window.confirm("Esti sigur ca vrei sa anulezi aceasta cerere de chirie?")) {
            return;
        }
        setCancelingRequestId(requestId);
        setCancelError(null);
        try {
            await api.delete(`/users/reservation-request/${requestId}`, { // Schimba la endpoint-ul tau corect
                headers: { Authorization: `Bearer ${token}` }
            });
            // Actualizeaza lista de cereri curente
            setCurrentRent(prevRequests => prevRequests.filter(req => req._id !== requestId));
            alert("Cererea a fost anulata cu succes!");
            // Optional, poti re-face fetch la istoric daca cererile anulate apar acolo
            // fetchHistory(); 
        } catch (err: any) {
            console.error("Eroare la anularea cererii:", err);
            setCancelError(err.response?.data?.message || "Nu s-a putut anula cererea.");
            // Afiseaza eroarea langa buton sau global
        } finally {
            setCancelingRequestId(null);
        }
    };

    return (
        <div className="profile-section-content">
            <h2>Cereri Chirii Curente</h2>
            {cancelError && <p className="error-message global-error">{cancelError}</p>}
            {loadingCurrent ? (
                <p>Se incarca…</p>
            ) : errorCurrent ? (
                <p className="error-message">{errorCurrent}</p>
            ) : currentRentRequests.length > 0 ? (
                <ul className="rent-history-list">
                    {currentRentRequests.map(crr => {
                        const ci = parseISO(crr.checkIn);
                        const co = parseISO(crr.checkOut);
                        const nights = differenceInCalendarDays(co, ci) + 1;
                        const isBeingCanceled = cancelingRequestId === crr._id;
                        return (
                            <li key={crr._id} className="rent-history-item">
                                {/* <div className="current-rent-card"> */}
                                <p>
                                    <strong>Locatie:</strong> {crr.apartment.location}
                                </p>
                                <p>
                                    <strong>Perioada:</strong>{' '}
                                    {format(ci, 'dd-MM-yyyy')} - {format(co, 'dd-MM-yyyy')} ({nights}{' '}
                                    nopti)
                                </p>
                                <p>
                                    <strong>Camere:</strong> {crr.rooms}
                                </p>
                                <p>
                                    <strong>Pret total:</strong>{' '}
                                    {(crr.apartment.price * nights * crr.rooms).toFixed(2)} RON
                                </p>
                                <div className="request-actions">
                                    {/* Permite anularea doar daca statusul e 'pending_approval' sau similar */}
                                    {/* Exemplu: if (crr.status === 'pending_approval') */}
                                    <button
                                        onClick={() => handleCancelRequest(crr._id)}
                                        disabled={isBeingCanceled}
                                        className="cancel-request-button"
                                    >
                                        {isBeingCanceled ? "Se anuleaza..." : "Anuleaza Cererea"}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>

            ) : (
                <p>Nu aveti nicio cerere de chirie activa.</p>
            )}

            <hr className='reservation-history-separator-line' />

            <h2>Istoricul Chiriilor</h2>
            {loadingHistory ? (
                <p>Se incarca…</p>
            ) : errorHistory ? (
                <p className="error-message">{errorHistory}</p>
            ) : history.length > 0 ? (
                <ul className="rent-history-list">
                    {history.map(h => {
                        const ci = parseISO(h.checkIn);
                        const co = parseISO(h.checkOut);
                        const nights = differenceInCalendarDays(co, ci) + 1;
                        return (
                            <li key={h._id} className="rent-history-item">
                                <p>
                                    <strong>Apartament:</strong> {h.apartment}
                                </p>
                                <p>
                                    <strong>Perioada:</strong> {format(ci, 'dd-MM-yyyy')} –{' '}
                                    {format(co, 'dd-MM-yyyy')} ({nights} nopti)
                                </p>
                                <p>
                                    <strong>Camere:</strong> {h.rooms}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p>Nu exista istoric de chirii.</p>
            )}
        </div>
    );
};

export default RentHistory;