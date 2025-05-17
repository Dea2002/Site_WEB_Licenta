import React, { useState, useEffect, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./ReservationHistory.css";

interface ReservationHistory {
    _id: string;
    client: string;
    apartament: string;
    numberOfRooms: number;
    checkIn: string;
    checkOut: string;
    clientData: {
        fullName: string;
        email: string;

        // alte campuri dupa nevoie
    };
    apartamentData: {
        location: string;
    };
}

const ReservationHistory: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [history, setHistory] = useState<ReservationHistory[]>([]);

    useEffect(() => {
        api
            .get(`/owner/reservation_history/${user!._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((response) => {
                setHistory(response.data);
            })
            .catch((error) => {
                console.error("Eroare la preluarea istoricului rezervarilor:", error);
            });
    }, [user, token]);

    return (
        <>
            <div className="reservation-history-container">
                <h1>Istoric rezervari</h1>
                <div className="history-list">
                    {history.length > 0 ? (
                        history.map((item) => (
                            <div key={item._id} className="history-card">
                                <p>
                                    <strong>Nume client:</strong> {item.clientData.fullName}
                                </p>
                                <p>
                                    <strong>Locatia apartamentului:</strong>{" "}
                                    {item.apartamentData.location}
                                </p>
                                <p>
                                    <strong>Numarul de camere:</strong>{" "}
                                    {item.numberOfRooms}
                                </p>
                                <p>
                                    <strong>Check-In:</strong>{" "}
                                    {new Date(item.checkIn).toLocaleDateString()}
                                </p>
                                <p>
                                    <strong>Check-Out:</strong>{" "}
                                    {new Date(item.checkOut).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p>Nu exista rezervari in istoric.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReservationHistory;
