// frontend/src/OwnerRequests.tsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import Bara_nav_OwnerDashboard from "./Bara_nav_OwnerDashboard";
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

    // const handleAccept = async (reservationId: string) => {
    //     try {
    //         await axios.post(
    //             `http://localhost:5000/create_reservation_request/${reservationId}/accept`,
    //             {},
    //             { headers: { Authorization: `Bearer ${token}` } },
    //         );
    //         // Elimina cererea acceptata din lista
    //         setRequests((prevRequests) => prevRequests.filter((req) => req._id !== reservationId));
    //     } catch (error) {
    //         console.error("Eroare la acceptarea cererii:", error);
    //     }
    // };

    // const handleDecline = async (reservationId: string) => {
    //     try {
    //         await axios.post(
    //             `http://localhost:5000/create_reservation_request/${reservationId}/decline`,
    //             {},
    //             { headers: { Authorization: `Bearer ${token}` } },
    //         );
    //         // Elimina cererea respinsa din lista
    //         setRequests((prevRequests) => prevRequests.filter((req) => req._id !== reservationId));
    //     } catch (error) {
    //         console.error("Eroare la respingerea cererii:", error);
    //     }
    // };

    // functii de test pentru accept/decline
    const accept = async (id: string) => {
        try {
            await axios
                .post(
                    `http://localhost:5000/reservation_request/${id}/accept`,
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
            console.log(err);
        }
    };

    const decline = async (id: string) => {
        try {
            await axios
                .post(
                    `http://localhost:5000/reservation_request/${id}/decline`,
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
            console.log(err);
        }
    };

    return (
        <>
            <Bara_nav_OwnerDashboard />
            <div className="owner-requests-container">
                <h1>Cereri de rezervare</h1>
                {successMessage && <div className="success-message">{successMessage}</div>}
                {requests.length > 0 ? (
                    <ul className="requests-list">
                        {requests.map((req) => (
                            <li key={req._id} className="request-item">
                                <p>
                                    <strong>Nume client:</strong> {req.clientData.fullName}
                                </p>
                                <p>
                                    <strong>Locatia apartamentului:</strong>{" "}
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
                                <button onClick={() => accept(req._id)}>Accepta</button>
                                <button onClick={() => decline(req._id)}>Respinge</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Nu exista cereri de rezervare.</p>
                )}
            </div>
        </>
    );
};

export default OwnerRequests;
