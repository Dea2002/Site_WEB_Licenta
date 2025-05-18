import React, { useState, useEffect, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import { isAfter, parseISO } from "date-fns";
import "./OwnerRequests.css";

interface ReservationRequest {
    _id: string;
    client: string;
    apartament: string;
    numberOfRooms: number;
    checkIn: string;
    checkOut: string;
    clientData: {
        fullName: string;
        email: string;
        faculty: string;
        medie: string;
        medie_valid: string;
        // alte campuri dupa nevoie
    };
    apartamentData: {
        location: string;
    };
}

const OwnerRequests: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [successMessage, setSuccessMessage] = useState<string>(""); // Pentru mesaje de succes
    const [requests, setRequests] = useState<ReservationRequest[]>([]);

    useEffect(() => {
        api
            .get(`/owner/list_reservation_requests/${user!._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((response) => {
                setRequests(response.data);
            })
            .catch((error) => {
                console.error("Eroare la preluarea cererilor de rezervare:", error);
            });
    }, [user, token]);

    const accept = async (id: string) => {
        try {
            await api
                .post(
                    `/reservation_request/${id}/accept`,
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                )
                .then(() => {
                    setSuccessMessage("Cererea a fost acceptata!");
                    setRequests(requests.filter((request) => request._id !== id));
                    setTimeout(() => setSuccessMessage(""), 3000);
                });
        } catch (err: any) {
            console.error(err);
        }
    };

    const decline = async (id: string) => {
        try {
            await api
                .post(
                    `/reservation_request/${id}/decline`,
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                )
                .then(() => {
                    setSuccessMessage("Cererea a fost stearsa!");
                    setRequests(requests.filter((request) => request._id !== id));
                    setTimeout(() => setSuccessMessage(""), 3000);
                });
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <div className="owner-requests-container">
            <h1>Cereri de rezervare</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {requests.length > 0 ? (
                <ul className="requests-list">
                    {requests.map((req) => {
                        const validUntilDate = parseISO(req.clientData.medie_valid);
                        const isValid = isAfter(validUntilDate, new Date());
                        return (
                            <li key={req._id} className="request-item">
                                <p>
                                    <strong>Nume client:</strong> {req.clientData.fullName}
                                </p>
                                <p>
                                    <strong>Facultatea:</strong> {req.clientData.faculty}
                                </p>
                                <p>
                                    <strong>Media:</strong> {req.clientData.medie}, <span className={isValid ? "text-green" : "text-red"}>{isValid ? " validata" : " nevalidata"}</span>
                                </p>
                                <p>
                                    <strong>Locatia apartamentului:</strong>{" "}
                                    {req.apartamentData.location}
                                </p>
                                <p>
                                    <strong>Numarul de camere:</strong>{" "}
                                    {req.numberOfRooms}
                                </p>
                                <p>
                                    <strong>Check-In:</strong>{" "}
                                    {new Date(req.checkIn).toLocaleDateString()}
                                </p>
                                <p>
                                    <strong>Check-Out:</strong>{" "}
                                    {new Date(req.checkOut).toLocaleDateString()}
                                </p>
                                <button onClick={() => accept(req._id)}>Accepta</button>
                                <button onClick={() => decline(req._id)}>Respinge</button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p>Nu exista cereri de rezervare.</p>
            )}
        </div>
    );
};

export default OwnerRequests;
