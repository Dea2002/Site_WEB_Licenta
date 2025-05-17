import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import './profile_student.css';
import { api } from '../../api';
interface CurrentRentProps {
    userId: string;
}

interface RentDetails {
    _id: string;
    apartment: {
        _id: string;
        location: string;
        price: number;
        image?: string;
        numberOfRooms: number;
        ownerId: string;
    };
    checkIn: string;   // ISO date
    checkOut: string;  // ISO date
    rooms: number;
    createdAt: string;
}
interface UserBrief {
    _id: string;
    fullName: string;
}

const CurrentRent: React.FC<CurrentRentProps> = ({ userId }) => {
    const [rentData, setRentData] = useState<RentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token, user } = useContext(AuthContext);
    const [activeRenters, setActiveRenters] = useState<UserBrief[]>([]);
    const [isRentersLoading, setIsRentersLoading] = useState(false);
    const [rentersError, setRentersError] = useState<string | null>(null);
    const navigate = useNavigate();
    useEffect(() => {
        const fetchCurrentRent = async () => {
            setIsLoading(true);
            setError(null);

            if (!token) {
                setError('Utilizator neautentificat.');
                setRentData(null);
                setIsLoading(false);
                return;
            }

            try {
                console.log('Fetching current rent for user:', userId);
                console.log('Token:', token);
                const { data } = await axios.get<RentDetails>(
                    `http://localhost:5000/users/current-rent/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setRentData(data);
            } catch (err: any) {
                console.error('Error fetching current rent:', err);
                // Daca serverul raspunde cu 404, putem trata mesajul specific
                if (err.response?.status === 404) {
                    setRentData(null);
                } else {
                    setError(err.response?.data?.message || 'Eroare la incarcarea chiriei curente.');
                    setRentData(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentRent();
    }, [userId, token]);

    // cand avem rentData, incarcam colegii activi
    useEffect(() => {
        const fetchActiveRenters = async () => {
            if (!rentData) return;
            setIsRentersLoading(true);
            setRentersError(null);

            try {
                const { data } = await axios.get<UserBrief[]>(
                    `http://localhost:5000/apartments/active-renters/${rentData.apartment._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setActiveRenters(data);
            } catch (err: any) {
                setRentersError('Nu am putut incarca colegii activi.');
            } finally {
                setIsRentersLoading(false);
            }
        };
        fetchActiveRenters();
    }, [rentData, token]);

    const handleCancel = async () => {
        if (!rentData) return;
        try {
            await axios.post(
                `http://localhost:5000/apartments/cancel-rent/${rentData._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Chiria a fost anulata.');
            setRentData(null);
        } catch {
            alert('Eroare la anularea chiriei.');
        }
    };

    const handleCleaningRequest = async () => {
        if (!rentData) return;
        try {
            await axios.post(
                `http://localhost:5000/apartments/cleaning-request`,
                { apartmentId: rentData.apartment._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Cerere trimisa proprietarului.');
        } catch {
            alert('Eroare la trimiterea cererii.');
        }
    };

    // === Render logic la inceput, ca sa fie clar ===
    if (isLoading) {
        return (
            <div className="profile-section-content">
                <h2>Chiria Actuala</h2>
                <p>Se incarca...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-section-content">
                <h2>Chiria Actuala</h2>
                <p className="error-message">{error}</p>
            </div>
        );
    }

    if (!rentData) {
        return (
            <div className="profile-section-content">
                <h2>Chiria Actuala</h2>
                <p>Nu exista o chirie activa inregistrata.</p>
            </div>
        );
    }
    const pricePerRoom = rentData.apartment.price;
    const numberOfRooms = rentData.rooms;
    const checkInDate = parseISO(rentData.checkIn);
    const checkOutDate = parseISO(rentData.checkOut);
    const nights = differenceInCalendarDays(checkOutDate, checkInDate);
    const totalNights = nights + 1;
    const totalPrice = pricePerRoom * totalNights * numberOfRooms;
    // Daca e mai mult de 30 nopti, pregateste si o estimare pentru 30 nopti (o luna)
    const showMonthlyEstimate = totalNights > 30;
    const monthlyEstimate = pricePerRoom * 30 * numberOfRooms;


    async function openChatWith(otherUserId: string) {
        const { data: conversation } = await api.post<{
            _id: string;
            participants: string[];
            isGroup: boolean;
            createdAt: string;
            lastMessageAt: string;
        }>('/conversations', {
            participants: [user!._id, otherUserId],
        });
        navigate(`/chat/${conversation._id}`);
    }

    // handler-ul pentru grup chat
    async function openApartmentChat(withOwner: boolean) {
        if (!rentData) return;
        const apartmentId = rentData.apartment._id;
        // strangem ID-urile curente: proprietar + chiriasi
        const participantIds = [
            user!._id,
            ...(withOwner ? [rentData.apartment.ownerId] : []),
            ...activeRenters.map(r => r._id)
        ];
        console.log('with owner:', withOwner);
        try {
            const { data: conversation } = await api.post<{
                _id: string;
                apartmentId: string;
                participants: string[];
                isGroup: boolean;
            }>(`http://localhost:5000/conversations/apartment/${apartmentId}?includeOwner=${withOwner}`,
                {
                    participants: participantIds,
                    ownerId: rentData.apartment.ownerId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            navigate(`/chat/${conversation._id}`);
        } catch (err) {
            console.error(err);
            alert('Nu am putut accesa chat-ul de grup.');
        }
    }

    // === Afisam datele chiriei curente ===

    return (
        <div className="profile-section-content">
            <h2>Chiria Actuala</h2>

            <div className="current-rent-card">
                <p>
                    <strong>Locatie apartament:</strong> {rentData.apartment.location}
                </p>
                <p>
                    <strong>Pret total pentru {totalNights} nopti:</strong>{' '}
                    {totalPrice.toFixed(2)} RON
                    {showMonthlyEstimate && (
                        <>
                            <br />
                            <strong>Estimare cost lunar (30 nopti):</strong>{' '}
                            {monthlyEstimate.toFixed(2)} RON
                        </>
                    )}
                </p>
                <p>
                    <strong>Camere rezervate:</strong> {rentData.rooms}
                </p>
                <p>
                    <strong>Perioada:</strong> ({totalNights} nopti)
                    <br />
                    &emsp;&emsp;checkIn: {format(parseISO(rentData.checkIn), 'dd-MM-yyyy')}
                    <br />
                    &emsp;&emsp;checkOut: {format(parseISO(rentData.checkOut), 'dd-MM-yyyy')}

                </p>

                {/* --- Butoane actiuni --- */}

                <div className="rent-actions">
                    <button onClick={handleCancel} className="btn-cancel">Anuleaza chirie</button>
                    <button onClick={handleCleaningRequest} className="btn-cleaning">Cerere firma curatatorie</button>
                </div>

                {/* --- Sectiunea de chat --- */}

                <div className="chat-section">
                    <h3>Chat</h3>

                    {/* Chat cu proprietarul */}
                    <button
                        className="btn-chat-owner"
                        onClick={() => navigate(`/chat/${rentData!.apartment.ownerId}`)}
                    >
                        Proprietar
                    </button>

                    <h4>Chat cu colegii de apartament:</h4>
                    {isRentersLoading && <p>Se incarca colegii…</p>}
                    {rentersError && <p className="error-message">{rentersError}</p>}
                    {!isRentersLoading && activeRenters.length === 0 && (
                        <p>Niciun coleg activ.</p>
                    )}

                    <div className="colleagues-chat-list">
                        {activeRenters
                            // excludem utilizatorul curent
                            .filter(u => u._id !== userId)
                            .map(u => (
                                <button
                                    key={u._id}
                                    className="btn-chat-colleague"
                                    onClick={() => {
                                        openChatWith(u._id);
                                    }}
                                >
                                    {u.fullName}
                                </button>
                            ))
                        }
                    </div>

                    {/* butonul de grup chat */}
                    <button
                        className="btn-chat-group"
                        onClick={() => openApartmentChat(true)}
                    >
                        Chat grup cu proprietar
                    </button>
                    <button
                        className="btn-chat-group"
                        onClick={() => openApartmentChat(false)}
                    >
                        Chat grup fara proprietar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CurrentRent;