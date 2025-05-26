import React, { useState, useContext, useEffect } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./FacultyAssociations.css";



interface DeclinePopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    requestId: string | null; // Pentru a sti la ce cerere se refera
    isSubmitting: boolean;
    error?: string | null;
}

const DeclineReasonPopup: React.FC<DeclinePopupProps> = ({ isOpen, onClose, onSubmit, requestId, isSubmitting, error }) => {
    const [reason, setReason] = useState("");

    useEffect(() => {
        // Reseteaza motivul cand popup-ul se redeschide pentru o noua cerere
        if (isOpen) {
            setReason("");
        }
    }, [isOpen, requestId]);

    if (!isOpen || !requestId) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            // Poti adauga o validare/eroare locala aici daca doresti
            alert("Va rugam introduceti un motiv pentru respingere.");
            return;
        }
        onSubmit(reason);
    };

    return (
        <div className="popup-overlay">
            <div className="popup-content decline-popup">
                <h3>Motivul Respingerii Cererii</h3>
                {error && <p className="error-message popup-error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Introduceti motivul respingerii aici..."
                        rows={5}
                        required
                        disabled={isSubmitting}
                    />
                    <div className="popup-actions">
                        <button type="submit" disabled={isSubmitting || !reason.trim()} className="popup-button-submit">
                            {isSubmitting ? "Se trimite..." : "Trimite Motiv"}
                        </button>
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="popup-button-cancel">
                            Anuleaza
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

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
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [showDeclinePopup, setShowDeclinePopup] = useState<boolean>(false);
    const [currentRequestIdForDecline, setCurrentRequestIdForDecline] = useState<string | null>(null);
    const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);
    const [declineSubmitError, setDeclineSubmitError] = useState<string | null>(null);

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

    const handleDeclineClick = (id: string) => {
        setCurrentRequestIdForDecline(id);
        setDeclineSubmitError(null); // Reseteaza eroarea anterioara
        setShowDeclinePopup(true);
    };

    const submitDeclineReason = async (reason: string) => {
        if (!currentRequestIdForDecline) return;

        setIsSubmittingDecline(true);
        setDeclineSubmitError(null);
        try {
            await api.post(
                `/faculty/association/${currentRequestIdForDecline}/reject`,
                { reason: reason }, // Trimitem motivul in body
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccessMessage("Cererea a fost respinsa cu succes!");
            setRequests(prevRequests => prevRequests.filter((request) => request._id !== currentRequestIdForDecline));
            setShowDeclinePopup(false);
            setCurrentRequestIdForDecline(null);
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            console.error("Eroare la respingerea cererii:", err);
            setDeclineSubmitError(err.response?.data?.message || "Nu s-a putut respinge cererea.");
            // Nu inchidem popup-ul la eroare, pentru ca utilizatorul sa poata reincerca sau corecta
        } finally {
            setIsSubmittingDecline(false);
        }
    };

    return (
        <div className="faculty-associations-container">
            <h1>Cereri de Asociere Studenti</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}

            {error && !showDeclinePopup && <p className="error-message">{error}</p>}

            {!error && (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        !error && <p>Nu exista cereri de asociere in asteptare.</p>
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
                                            <div className="request-item-actions">
                                                <button onClick={() => handleApprove(request._id)} className="button-accept"> Aproba </button>
                                                <button onClick={() => handleDeclineClick(request._id)} className="button-decline"> Respinge </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <DeclineReasonPopup
                        isOpen={showDeclinePopup}
                        onClose={() => {
                            setShowDeclinePopup(false);
                            setCurrentRequestIdForDecline(null);
                            setDeclineSubmitError(null); // Sterge eroarea la inchiderea manuala
                        }}
                        onSubmit={submitDeclineReason}
                        requestId={currentRequestIdForDecline}
                        isSubmitting={isSubmittingDecline}
                        error={declineSubmitError}
                    />
                </div>
            )}
        </div>
    );
};

export default FacultyAssociations;