import React, { useState, useContext, useEffect } from "react";
import { api } from './api';
import { AuthContext } from "./AuthContext";
import "./FacultyMarks.css";


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


interface StudentInfo {
    fullName: string;
    email: string;
    numar_matricol: string;
    anUniversitar: string;
    medie: string;
}
interface MarkRequest {
    _id: string;
    numeStudent: string;
    emailStudent: string;
    anUniversitar: string;
    numar_matricol: string;
    studentId: string;
    medie: string;
    faculty: string;
    facultyId: string;
    requestDate: string;
    studentInfo: StudentInfo;
}

const FacultyMarks: React.FC = () => {

    const [requests, setRequests] = useState<MarkRequest[]>([]);
    const { faculty, token } = useContext(AuthContext);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string>(""); // Pentru mesaje de succes
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
    const fetchMarkRequests = async () => {
        if (!token || !faculty?._id) {
            setError("Utilizator neautentificat sau date lipsa.");
            return;
        }

        try {
            const response = await api.get<MarkRequest[]>(
                `/faculty/get_mark_requests/${faculty!._id}`
            );

            setRequests(response.data);
        } catch (err: any) {
            console.error("Eroare la fetch cereri de asociere:", err);
        }
    };

    useState(() => {
        fetchMarkRequests();
    }), [];

    const handleApprove = async (requestId: string) => {
        if (!token) return;
        try {

            await api.put(
                `/faculty/mark/${requestId}/approve`,
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
                `/faculty/mark/${currentRequestIdForDecline}/reject`,
                { reason: reason },
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
        } finally {
            setIsSubmittingDecline(false);
        }
    };

    return (
        <div className="faculty-marks-container">
            <h1>Cereri de Actualizare Medii Studenti</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <p className="error-message">{error}</p>}

            {!error && (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        <p>Nu exista cereri de validare a mediei in asteptare.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nume Student</th>
                                    <th>Email Student</th>
                                    <th>Numar Matricol</th>
                                    <th>Anul Universitar</th>
                                    <th>Medie</th>
                                    <th>Data Cererii</th>
                                    <th>Actiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request) => (
                                    <tr key={request._id}>
                                        <td>{request.studentInfo.fullName}</td>
                                        <td>{request.studentInfo.email}</td>
                                        <td>{request.studentInfo.numar_matricol ? request.studentInfo.numar_matricol : "Neinregistrat"}</td>
                                        <td>{request.studentInfo.anUniversitar}</td>
                                        <td>{request.studentInfo.medie}</td>
                                        <td>{formatDate(request.requestDate)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => handleApprove(request._id)} className="approve-button"> Aproba </button>
                                                <button onClick={() => handleDeclineClick(request._id)} className="reject-button"> Respinge </button>
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

export default FacultyMarks;