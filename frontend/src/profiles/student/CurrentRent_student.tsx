import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import React, { useState, useEffect, useContext } from 'react';
import { useInitiatePrivateChat, useInitiateGroupChat } from "../../hooks/useInitiateChat";
import { AuthContext } from '../../AuthContext';
import './profile_student.css';
import { api } from '../../api';

interface CurrentRentProps {
    userId: string;
}

interface RentDetails {
    _id: string;
    apartment: {
        numberOfNights: number;
        _id: string;
        location: string;
        price: number;
        image?: string;
        numberOfRooms: number;
        ownerId: string;
        utilities: {
            TVPrice: number;
            electricityPrice: number;
            gasPrice: number;
            waterPrice: number;
            internetPrice: number;
        }
    };
    checkIn: string;
    checkOut: string;
    rooms: number;
    createdAt: string;
    finalPrice: number;
    discount: number;
    priceUtilities: number;
    numberOfRooms: number;
}

interface UserBrief {
    _id: string;
    fullName: string;
}

const CurrentRent: React.FC<CurrentRentProps> = ({ userId }) => {
    const [rentData, setRentData] = useState<RentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useContext(AuthContext);
    const [activeRenters, setActiveRenters] = useState<UserBrief[]>([]);
    const [isRentersLoading, setIsRentersLoading] = useState(false);
    const [rentersError, setRentersError] = useState<string | null>(null);
    const { isLoadingPrivate, initiatePrivateChat } = useInitiatePrivateChat();
    const { isLoadingGroup, initiateGroupChat } = useInitiateGroupChat();

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
                const { data } = await api.get<RentDetails>(
                    `/users/current-rent/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setRentData(data);
            } catch (err: any) {
                console.error('Error fetching current rent:', err);
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

    useEffect(() => {
        const fetchActiveRenters = async () => {
            if (!rentData) return;
            setIsRentersLoading(true);
            setRentersError(null);

            try {
                const { data } = await api.get<UserBrief[]>(
                    `/apartments/active-renters/${rentData.apartment._id}`,
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
            await api.post(
                `/apartments/cancel-rent/${rentData._id}`,
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
            await api.post(
                `/apartments/cleaning-request`,
                { apartmentId: rentData.apartment._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Cerere trimisa proprietarului.');
        } catch {
            alert('Eroare la trimiterea cererii.');
        }
    };

    if (isLoading || error || !rentData) {
        return (
            <div className="profile-section-content">
                <h2>Chiria Actuala</h2>
                {isLoading && <p>Se incarca...</p>}

                {error && <p className="error-message">{error}</p>}

                {!rentData && <p>Nu exista o chirie activa inregistrata.</p>}

            </div>
        );
    }

    const pricePerRoom = rentData.apartment.price;
    const numberOfRooms = rentData.numberOfRooms;
    const checkInDate = parseISO(rentData.checkIn);
    const checkOutDate = parseISO(rentData.checkOut);
    const nights = differenceInCalendarDays(checkOutDate, checkInDate);
    const totalNights = nights + 1;
    const totalPrice = pricePerRoom * totalNights * numberOfRooms;
    const showMonthlyEstimate = totalNights > 30;
    const monthlyEstimate = pricePerRoom * 30 * numberOfRooms;

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

                <p>
                    <strong>Pret: </strong>{rentData.finalPrice} RON
                </p>

                <div className="rent-actions">
                    <button onClick={handleCancel} className="btn-cancel">Anuleaza chiria</button>
                    <button onClick={handleCleaningRequest} className="btn-cleaning">Cerere firma curatatorie</button>
                </div>

                <div className="chat-section">
                    <h3>Chat</h3>

                    <button
                        className="btn-chat-owner"
                        onClick={() => initiatePrivateChat(rentData!.apartment.ownerId)}
                        disabled={isLoadingPrivate}
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
                                    onClick={() => { initiatePrivateChat(u._id); }}
                                    disabled={isLoadingPrivate}
                                >
                                    {u.fullName}
                                </button>
                            ))
                        }
                    </div>

                    <button
                        className="btn-chat-group"
                        onClick={() => initiateGroupChat(rentData!.apartment._id, true)}
                        disabled={isLoadingGroup}
                    >
                        Chat grup cu proprietar
                    </button>
                    <button
                        className="btn-chat-group"
                        onClick={() => initiateGroupChat(rentData!.apartment._id, false)}
                        disabled={isLoadingGroup}
                    >
                        Chat grup fara proprietar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CurrentRent;