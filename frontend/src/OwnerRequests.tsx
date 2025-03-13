// frontend/src/OwnerRequests.tsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_navigatie from "./Bara_navigatie";
import "./OwnerRequests.css";

interface ReservationRequest {
    _id: string;
    client: string;
    apartament: string;
    checkIn: string;
    checkOut: string;
    clientData: {
        fullName: string;
        email: string;

        // alte câmpuri după nevoie
    };
    apartamentData: {
        location: string;
    };
}

const OwnerRequests: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [requests, setRequests] = useState<ReservationRequest[]>([]);

    useEffect(() => {
        axios
            .get(`http://localhost:5000/owner/list_reservation_requests/${user!._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((response) => {
                setRequests(response.data);
                console.log(response.data);
            })
            .catch((error) => {
                console.error("Eroare la preluarea cererilor de rezervare:", error);
            });
    }, [user, token]);

    return (
        <>
            <Bara_navigatie />
            <div className="owner-requests-container">
                <h1>Cereri de rezervare</h1>
                {requests.length > 0 ? (
                    <ul className="requests-list">
                        {requests.map((req) => (
                            <li key={req._id} className="request-item">
                                <p>
                                    <strong>Nume client:</strong> {req.clientData.fullName}
                                </p>
                                <p>
                                    <strong>Locația apartamentului:</strong>{" "}
                                    {req.apartamentData.location}
                                </p>
                                <p>
                                    <strong>Check-In:</strong>{" "}
                                    {new Date(req.checkIn).toLocaleDateString()}
                                </p>
                                <p>
                                    <strong>Check-Out:</strong>{" "}
                                    {new Date(req.checkOut).toLocaleDateString()}
                                </p>
                                {/* Adaugă alte detalii relevante, de exemplu informații despre client sau apartament */}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Nu există cereri de rezervare.</p>
                )}
            </div>
        </>
    );
};

export default OwnerRequests;
