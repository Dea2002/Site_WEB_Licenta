import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import './profile_student.css';

interface CurrentRentProps {
    userId: string;
}

// Defineste o interfata pentru cum arata datele chiriei
interface RentDetails {
    _id: string;
    apartmentName: string; // Sau adresa, etc.
    startDate: string;
    endDate: string;
    rentAmount: number;
    // alte detalii relevante
}

const CurrentRent: React.FC<CurrentRentProps> = ({ userId }) => {
    const [rentData, setRentData] = useState<RentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        const fetchCurrentRent = async () => {
            setIsLoading(true);
            setError(null);
            if (!token) {
                setError("Utilizator neautentificat.");
                setIsLoading(false);
                return;
            }
            try {
                // Adaptează endpoint-ul la API-ul tău
                const response = await axios.get(`/api/rentals/current/${userId}`, { // Sau poate /api/users/me/current-rental
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRentData(response.data);
            } catch (err: any) {
                console.error("Error fetching current rent:", err);
                setError(err.response?.data?.message || "Nu s-au putut încărca datele chiriei curente.");
                setRentData(null); // Asigură-te că nu se afișează date vechi
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentRent();
    }, [userId, token]); // Rulează când userId sau token se schimbă

    return (
        <div className="profile-section-content">
            <h2>Chiria Actuală</h2>
            {isLoading && <p>Se încarcă...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && rentData && (
                <div>
                    <p><strong>Apartament:</strong> {rentData.apartmentName}</p>
                    <p><strong>Data început:</strong> {new Date(rentData.startDate).toLocaleDateString()}</p>
                    <p><strong>Data sfârșit:</strong> {new Date(rentData.endDate).toLocaleDateString()}</p>
                    <p><strong>Sumă chirie lunară:</strong> {rentData.rentAmount} RON</p>
                    {/* Afișează alte detalii */}
                </div>
            )}
            {!isLoading && !error && !rentData && (
                <p>Nu există o chirie activă înregistrată.</p>
            )}
        </div>
    );
};

export default CurrentRent;