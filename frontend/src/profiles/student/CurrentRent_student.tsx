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
                // Adapteaza endpoint-ul la API-ul tau
                const response = await axios.get(`/api/rentals/current/${userId}`, { // Sau poate /api/users/me/current-rental
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRentData(response.data);
            } catch (err: any) {
                console.error("Error fetching current rent:", err);
                setError(err.response?.data?.message || "Nu s-au putut incarca datele chiriei curente.");
                setRentData(null); // Asigura-te ca nu se afiseaza date vechi
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentRent();
    }, [userId, token]); // Ruleaza cand userId sau token se schimba

    return (
        <div className="profile-section-content">
            <h2>Chiria Actuala</h2>
            {isLoading && <p>Se incarca...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && rentData && (
                <div>
                    <p><strong>Apartament:</strong> {rentData.apartmentName}</p>
                    <p><strong>Data inceput:</strong> {new Date(rentData.startDate).toLocaleDateString()}</p>
                    <p><strong>Data sfarsit:</strong> {new Date(rentData.endDate).toLocaleDateString()}</p>
                    <p><strong>Suma chirie lunara:</strong> {rentData.rentAmount} RON</p>
                    {/* Afiseaza alte detalii */}
                </div>
            )}
            {!isLoading && !error && !rentData && (
                <p>Nu exista o chirie activa inregistrata.</p>
            )}
        </div>
    );
};

export default CurrentRent;