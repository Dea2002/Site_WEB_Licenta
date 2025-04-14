import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
import "./ReservationHistory.css";

interface ReservationHistory {
    _id: string;
    client: string;
    apartament: string;
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
        axios
            .get(`http://localhost:5000/owner/reservation_history/${user!._id}`, {
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
            <Bara_nav_OwnerDashboard />
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
                                    <strong>Check-In:</strong>{" "}
                                    {new Date(item.checkIn).toLocaleDateString()}
                                </p>
                                <p>
                                    <strong>Check-Out:</strong>{" "}
                                    {new Date(item.checkOut).toLocaleDateString()}
                                </p>
                                {/* <p>
                                    <strong>ID rezervare:</strong> {item._id}
                                </p>
                                <p>
                                    <strong>Check-In:</strong>{" "}
                                    {new Date(item.checkIn).toLocaleDateString()}
                                </p>
                                <p>
                                    <strong>Check-Out:</strong>{" "}
                                    {new Date(item.checkOut).toLocaleDateString()}
                                </p> */}
                                {/* Afiseaza si alte informatii relevante */}
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
