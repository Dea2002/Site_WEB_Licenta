import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import './profile_student.css';

interface RentHistoryProps {
    userId: string;
}

// Interfata similara cu cea din CurrentRent, poate fi partajata
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
                // Adapteaza endpoint-ul la API-ul tau
                const response = await axios.get(`/api/rentals/history/${userId}`, { // Sau /api/users/me/rental-history
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(response.data || []); // Asigura-te ca e un array
            } catch (err: any) {
                console.error("Error fetching rent history:", err);
                setError(err.response?.data?.message || "Nu s-a putut incarca istoricul chiriilor.");
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
            {isLoading && <p>Se incarca...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && history.length > 0 && (
                <ul className="rent-history-list">
                    {history.map(rent => (
                        <li key={rent._id} className="rent-history-item">
                            <p><strong>Apartament:</strong> {rent.apartmentName}</p>
                            <p><strong>Perioada:</strong> {new Date(rent.startDate).toLocaleDateString()} - {new Date(rent.endDate).toLocaleDateString()}</p>
                            <p><strong>Chirie lunara:</strong> {rent.rentAmount} RON</p>
                        </li>
                    ))}
                </ul>
            )}
            {!isLoading && !error && history.length === 0 && (
                <p>Nu exista istoric de chirii.</p>
            )}
        </div>
    );
};

export default RentHistory;