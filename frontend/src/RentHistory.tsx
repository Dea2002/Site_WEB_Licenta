import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import "./RentHistory.css";


interface RentalRequest {
    id: string;
    apartmentLocation: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

interface CurrentRental {
    id: string;
    apartmentLocation: string;
    startedAt: string;
    endsAt: string;
    monthlyRent: number;
}

interface RentalHistoryItem {
    id: string;
    apartmentLocation: string;
    checkIn: string;
    checkOut: string;
    totalPaid: number;
}

const RentHistory: React.FC = () => {
    const { user, token } = useContext(AuthContext);
    const [currentRequest, setCurrentRequest] = useState<RentalRequest | null>(null);
    const [currentRental, setCurrentRental] = useState<CurrentRental | null>(null);
    const [rentalHistory, setRentalHistory] = useState<RentalHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !token) return;

        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [reqRes, rentRes, historyRes] = await Promise.all([
                    axios.get<RentalRequest>(
                        `http://localhost:5000/users/${user._id}/current_request`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                    axios.get<CurrentRental>(
                        `http://localhost:5000/users/${user._id}/current_rental`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                    axios.get<RentalHistoryItem[]>(
                        `http://localhost:5000/users/${user._id}/rental_history`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                ]);

                setCurrentRequest(reqRes.data || null);
                setCurrentRental(rentRes.data || null);
                setRentalHistory(historyRes.data || []);
            } catch (err: any) {
                console.error("Dashboard load error", err);
                setError("A apărut o eroare la încărcarea dashboard-ului.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, token]);

    if (loading) {
        return <div className="dashboard-loading">Se încarcă datele...</div>;
    }
    if (error) {
        return <div className="dashboard-error">{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Dashboard Utilizator</h1>

            <section className="dashboard-section">
                <h2>Cerere Curentă de Chirii</h2>
                {currentRequest ? (
                    <div className="card">
                        <p><strong>ID Cerere:</strong> {currentRequest.id}</p>
                        <p><strong>Locație:</strong> {currentRequest.apartmentLocation}</p>
                        <p><strong>Check-in:</strong> {currentRequest.checkIn}</p>
                        <p><strong>Check-out:</strong> {currentRequest.checkOut}</p>
                        <p><strong>Status:</strong> {currentRequest.status}</p>
                    </div>
                ) : (
                    <p>Nu există nicio cerere de rezervare activă.</p>
                )}
            </section>

            <section className="dashboard-section">
                <h2>Chirie Actuală</h2>
                {currentRental ? (
                    <div className="card">
                        <p><strong>ID Chirii:</strong> {currentRental.id}</p>
                        <p><strong>Locație:</strong> {currentRental.apartmentLocation}</p>
                        <p><strong>Început:</strong> {currentRental.startedAt}</p>
                        <p><strong>Sfârșit:</strong> {currentRental.endsAt}</p>
                        <p><strong>Chirie Lună:</strong> {currentRental.monthlyRent} RON</p>
                    </div>
                ) : (
                    <p>Nu există nicio chirie activă.</p>
                )}
            </section>

            <section className="dashboard-section">
                <h2>Istoric Chiriilor</h2>
                {rentalHistory.length > 0 ? (
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Locație</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Total Plătit (RON)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rentalHistory.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.apartmentLocation}</td>
                                    <td>{item.checkIn}</td>
                                    <td>{item.checkOut}</td>
                                    <td>{item.totalPaid.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Nu există istoric de chirii.</p>
                )}
            </section>
        </div>
    );
};


export default RentHistory;