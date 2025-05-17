import React, { useState, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./FacultyAssociations.css";

interface AssociationRequest {
    _id: string;
    numeStudent: string;
    emailStudent: string;
    numar_matricol: string;
    requestDate: string;
}

const FacultyAssociations: React.FC = () => {

    const [requests, setRequests] = useState<AssociationRequest[]>([]);
    const { faculty, token } = useContext(AuthContext);
    const [error, setError] = useState<string | null>(null);

    // Functie pentru a formata data (optional)
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("ro-RO", {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return "Data invalida";
        }
    };

    // functie pentru a face fetch la cereri
    const fetchAssociationRequests = async () => {
        if (!token || !faculty?._id) {
            setError("Utilizator neautentificat sau date lipsa.");
            return;
        }

        try {
            const response = await api.get<AssociationRequest[]>(
                `/faculty/get_association_requests/${faculty!._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setRequests(response.data);
        } catch (err: any) {
            console.error("Eroare la fetch cereri de asociere:", err);
        }
    };

    useState(() => {
        fetchAssociationRequests();
    }), [];

    const handleApprove = async (requestId: string) => {
        if (!token) return;
        try {
            await api.put(
                `/faculty/association/${requestId}/approve`,
                { header: { Authorization: `Bearer ${token}` } }
            );

            setRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));

        } catch (err: any) {
            console.error("Eroare la aprobarea cererii: ", err);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!token) return;
        try {
            await api.put(
                `/faculty/association/${requestId}/reject`,
                { header: { Authorization: `Bearer ${token}` } }
            );

            setRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));

            // sau pot apela direct
            //fetchAssociationRequests();

        } catch (err: any) {
            console.error("Eroare la respingerea cererii: ", err);
        }
    };

    return (
        <div className="faculty-associations-container">
            <h1>Cereri de Asociere Studenti</h1>


            {error && <p className="error-message">{error}</p>}

            {!error && (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        <p>Nu exista cereri de asociere in asteptare.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nume Student</th>
                                    <th>Email Student</th>
                                    <th>Data Cererii</th>
                                    <th>Numar Matricol</th>
                                    {/* Statusul a fost eliminat din lipsa datelor */}
                                    <th>Actiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Mapam peste cererile primite (presupuse a fi pending) */}
                                {requests.map((request) => (
                                    <tr key={request._id}>
                                        {/* Afisam datele conform interfetei */}
                                        <td>{request.numeStudent}</td>
                                        <td>{request.emailStudent}</td>
                                        <td>{formatDate(request.requestDate)}</td>
                                        <td>{request.numar_matricol}</td>
                                        <td>
                                            {/* Afisam butoanele mereu, deoarece presupunem ca toate cererile listate sunt pending */}
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleApprove(request._id)} // Trimitem doar ID-ul cererii
                                                    className="approve-button"
                                                >
                                                    Aproba
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request._id)}
                                                    className="reject-button"

                                                >
                                                    Respinge
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default FacultyAssociations;