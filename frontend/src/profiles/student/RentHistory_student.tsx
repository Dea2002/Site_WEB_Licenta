import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import './profile_student.css';

interface RentHistoryProps {
    userId: string;
}

// Interfață similară cu cea din CurrentRent, poate fi partajată
interface RentDetails {
    _id: string;
    apartmentName: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    // alte detalii
}


const RentHistory: React.FC<RentHistoryProps> = ({ userId }) => {
    const [history, setHistory] = useState<RentDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useContext(AuthContext);


    useEffect(() => {
        const fetchRentHistory = async () => {
            setIsLoading(true);
            setError(null);
            if (!token) {
                setError("Utilizator neautentificat.");
                setIsLoading(false);
                return;
            }
            try {
                // Adaptează endpoint-ul la API-ul tău
                const response = await axios.get(`/api/rentals/history/${userId}`, { // Sau /api/users/me/rental-history
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(response.data || []); // Asigură-te că e un array
            } catch (err: any) {
                console.error("Error fetching rent history:", err);
                setError(err.response?.data?.message || "Nu s-a putut încărca istoricul chiriilor.");
                setHistory([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRentHistory();
    }, [userId, token]);

    return (
        <div className="profile-section-content">
            <h2>Istoric Chirii</h2>
            {isLoading && <p>Se încarcă...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && history.length > 0 && (
                <ul className="rent-history-list">
                    {history.map(rent => (
                        <li key={rent._id} className="rent-history-item">
                            <p><strong>Apartament:</strong> {rent.apartmentName}</p>
                            <p><strong>Perioada:</strong> {new Date(rent.startDate).toLocaleDateString()} - {new Date(rent.endDate).toLocaleDateString()}</p>
                            <p><strong>Chirie lunară:</strong> {rent.rentAmount} RON</p>
                        </li>
                    ))}
                </ul>
            )}
            {!isLoading && !error && history.length === 0 && (
                <p>Nu există istoric de chirii.</p>
            )}
        </div>
    );
};

export default RentHistory;