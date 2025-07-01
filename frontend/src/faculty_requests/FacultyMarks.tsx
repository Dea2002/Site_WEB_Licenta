import React, { useState, useContext, useEffect } from "react";
import { api } from '../api';
import { AuthContext } from "../authenticate/AuthContext";
import "./FacultyMarks.css";

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

    //starile componentei
    const [requests, setRequests] = useState<MarkRequest[]>([]);
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

    const fetchMarkRequests = async () => {
        if (!token || !faculty?._id) { // verific daca sunt autentificat
            setError("Utilizator neautentificat sau date lipsa.");
            return;
        }

        try {
            const response = await api.get<MarkRequest[]>(
                `/faculty/get_mark_requests/${faculty!._id}`
            );

            setRequests(response.data); // stochez cererile primite de la backend
        } catch (err: any) {
            console.error("Eroare la fetch cereri de asociere:", err);
        }
    };

    // se apeleaza o singura data, doar cand accesez pagina
    useEffect(() => {
        fetchMarkRequests();
    }, []);

    const handleApprove = async (requestId: string) => {
        if (!token) return;
        try {

            await api.put(
                `/faculty/mark/${requestId}/approve`,
                { header: { Authorization: `Bearer ${token}` } }
            );

            // dispare cererea din lista fara a da refresh la pagina
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
                `/faculty/mark/${currentRequestIdForDecline}/reject`,
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
        <div className="faculty-marks-container">
            <h1>Cereri de Actualizare Medii Studenti</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <p className="error-message">{error}</p>}

            {!error && (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        <p>Nu exista cereri de validare a mediei in asteptare.</p>
                    ) : (
                        <table> {/* tabel */}
                            <thead> {/* cap de tabel */}
                                <tr> {/* titluri coloane */}
                                    <th>Nume Student</th>
                                    <th>Email Student</th>
                                    <th>Numar Matricol</th>
                                    <th>Anul Universitar</th>
                                    <th>Medie</th>
                                    <th>Data Cererii</th>
                                    <th>Actiuni</th>
                                </tr>
                            </thead>
                            <tbody> {/* corpul tabelului */}
                                {requests.map((request) => ( // iterez prin cererile de actualizare medii
                                    <tr key={request._id}> {/* rand pentru fiecare cerere */}
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
                        onClose={() => { // functiile apelate la inchiderea pop-up-ului
                            setShowDeclinePopup(false);
                            setCurrentRequestIdForDecline(null);
                            setDeclineSubmitError(null);
                        }}
                        onSubmit={submitDeclineReason} // functia care trimite motivul respingerii
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