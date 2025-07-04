import React, { useState, useContext, useEffect } from "react";
import { api } from '../api';
import { AuthContext } from "../authenticate/AuthContext";
import "./FacultyAssociations.css";

interface DeclinePopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    requestId: string | null;
    isSubmitting: boolean;
    error?: string | null;
}

// componenta pentru pop-up-ul de respingere a cererii
const DeclineReasonPopup: React.FC<DeclinePopupProps> = ({ isOpen, onClose, onSubmit, requestId, isSubmitting, error }) => {
    const [reason, setReason] = useState(""); // stare cu motivul respingerii

    useEffect(() => {
        if (isOpen) {
            setReason("");
        }
    }, [isOpen, requestId]);

    if (!isOpen || !requestId) return null; // daca nu vreau sa afisez pop-up-ul sau daca nu am motiv, nu afisez

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert("Va rugam introduceti un motiv pentru respingere.");
            return;
        }
        onSubmit(reason); // apelez functia din componenta parinte pentru a trimite motivul respingerii
    };

    return (
        <div className="popup-overlay">
            <div className="popup-content decline-popup">
                {/* titlul pop-up-ului */}
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
                        {/* butonul de trimitere */}
                        <button type="submit" disabled={isSubmitting || !reason.trim()} className="popup-button-submit"> {/* dezactivez daca nu am motiv introdus sau daca s-a trimis submit */}
                            {isSubmitting ? "Se trimite..." : "Trimite Motiv"} {/* textul butonului */}
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

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("ro-RO", {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return "Data invalida";
        }
    };

    const fetchAssociationRequests = async () => {
        if (!token || !faculty?._id) { // verific daca sunt autentificat
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
            setRequests(response.data); // stochez cererile primite de la backend
        } catch (err: any) {
            console.error("Eroare la fetch cereri de asociere:", err);
        }
    };

    useEffect(() => {
        fetchAssociationRequests();
    }, []);

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
        setCurrentRequestIdForDecline(id); // seteaza id-ul cererii curente pentru respingere
        setDeclineSubmitError(null);
        setShowDeclinePopup(true); // afiseaza pop-up-ul pentru respingere
    };

    const submitDeclineReason = async (reason: string) => {
        if (!currentRequestIdForDecline) return; // daca nu am id-ul cererii, nu pot respinge

        setIsSubmittingDecline(true);
        setDeclineSubmitError(null);
        try {
            await api.post(
                `/faculty/association/${currentRequestIdForDecline}/reject`,
                { reason: reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccessMessage("Cererea a fost respinsa cu succes!");

            // actualizez lista de cereri, fara a da refresh la pagina
            setRequests(prevRequests => prevRequests.filter((request) => request._id !== currentRequestIdForDecline));
            setShowDeclinePopup(false); // inchid pop-up-ul
            setCurrentRequestIdForDecline(null); // resetez id-ul curent pentru respingere
            setTimeout(() => setSuccessMessage(""), 3000); // sterg mesajul de succes dupa 3 secunde
        } catch (err: any) {
            console.error("Eroare la respingerea cererii:", err);
            setDeclineSubmitError(err.response?.data?.message || "Nu s-a putut respinge cererea.");
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
                                    <th>Actiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request) => (
                                    <tr key={request._id}>
                                        <td>{request.numeStudent}</td>
                                        <td>{request.emailStudent}</td>
                                        <td>{formatDate(request.requestDate)}</td>
                                        <td>{request.numar_matricol}</td>
                                        <td>
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
                            setDeclineSubmitError(null);
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