import React, { useState, useEffect, useContext } from "react";
import { api } from './api';
import { AuthContext } from "./authenticate/AuthContext";
import { isAfter, parseISO } from "date-fns";
import "./OwnerRequests.css";

interface ReservationRequest {
    _id: string;
    client: string;
    apartament: string;
    numberOfRooms: number;
    numberOfNights: number;
    checkIn: string;
    checkOut: string;
    priceRent: number;
    priceUtilities: number;
    discount: number;
    clientData: {
        fullName: string;
        email: string;
        faculty: string;
        medie: string;
        medie_valid: string;
    };
    apartamentData: {
        location: string;
    };
}

interface DeclinePopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    requestId: string | null;
    isSubmitting: boolean;
    error?: string | null;
}

const DeclineReasonPopup: React.FC<DeclinePopupProps> = ({ isOpen, onClose, onSubmit, requestId, isSubmitting, error }) => {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (isOpen) {
            setReason("");
        }
    }, [isOpen, requestId]);

    if (!isOpen || !requestId) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
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

const OwnerRequests: React.FC = () => {
    const { token, user } = useContext(AuthContext);
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [requests, setRequests] = useState<ReservationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showDeclinePopup, setShowDeclinePopup] = useState<boolean>(false);
    const [currentRequestIdForDecline, setCurrentRequestIdForDecline] = useState<string | null>(null);
    const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);
    const [declineSubmitError, setDeclineSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?._id || !token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        api.get(`/owner/list_reservation_requests/${user._id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => {
                setRequests(response.data);
            })
            .catch((error) => {
                console.error("Eroare la preluarea cererilor de rezervare:", error);
                setError(error.response?.data?.message || "Nu s-au putut incarca cererile.");
            }).finally(() => {
                setLoading(false);
            });
    }, [user, token]);

    const accept = async (id: string) => {
        try {
            await api.post(`/reservation_request/${id}/accept`,
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
            console.error("Eroare la acceptarea cererii:", err);
            setError(err.response?.data?.message || "Nu s-a putut accepta cererea.");
        }
    };

    const handleDeclineClick = (id: string) => {
        setCurrentRequestIdForDecline(id);
        setDeclineSubmitError(null);
        setShowDeclinePopup(true);
    };

    const submitDeclineReason = async (reason: string) => {
        if (!currentRequestIdForDecline) return;

        setIsSubmittingDecline(true);
        setDeclineSubmitError(null);
        try {
            await api.post(
                `/reservation_request/${currentRequestIdForDecline}/decline`,
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

    if (loading) return <div className="owner-requests-container"><p>Se incarca cererile...</p></div>;
    if (error && requests.length === 0) return <div className="owner-requests-container"><p className="error-message">{error}</p></div>;

    return (
        <div className="owner-requests-container">
            <h1>Cereri de rezervare</h1>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && !showDeclinePopup && <div className="error-message">{error}</div>}

            {requests.length > 0 ? (
                <ul className="requests-list">
                    {requests.map((req) => {
                        const totalPrice = (req.priceRent * ((100 - req.discount) / 100) * req.numberOfRooms + req.priceUtilities) * req.numberOfNights;
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
                                <p>
                                    <strong>Pret: </strong> {totalPrice.toFixed(2)} RON
                                </p>
                                <div className="request-item-actions">
                                    <button onClick={() => accept(req._id)} className="button-accept">Accepta</button>
                                    <button onClick={() => handleDeclineClick(req._id)} className="button-decline">Respinge</button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                !error && <p>Nu exista cereri de rezervare.</p>
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
    );
};

export default OwnerRequests;
