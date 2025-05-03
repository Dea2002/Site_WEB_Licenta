import React, { useState, useContext, useEffect } from 'react';
import { AuthContext, User } from '../../AuthContext'; // Importăm User
import axios from 'axios'; // Pentru request PATCH/PUT
import './profile_student.css'; // Stiluri
import jwt_decode from 'jwt-decode';

interface EditProfileProps {
    user: User; // Primim datele curente ale userului
}

const EditProfile: React.FC<EditProfileProps> = ({ user }) => {
    // Stări pentru câmpurile formularului, initializate cu datele userului
    const [fullName, setFullName] = useState(user.fullName);
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
    // Adaugă alte câmpuri pe care vrei să le permiți editării (ex: email - deși e mai complicat)
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token, login } = useContext(AuthContext); // Avem nevoie de token pt request și login pt update context

    // Funcție pentru submiterea formularului
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        const updatedData = {
            fullName,
            phoneNumber,
            //! Adaugă alte câmpuri aici
        };

        try {
            // Presupunem un endpoint /users/me sau /users/:id pentru update
            // Folosim PATCH pentru actualizări parțiale
            const response = await axios.patch(
                `http://localhost:5000/users/me`, // Sau `/users/${user.userId}`
                updatedData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // Daca backend-ul returneaza noul token (optional, dar bun daca se schimba ceva in payload)
            if (response.data.token) {
                const { token } = response.data;
                const decoded = jwt_decode<User & { iat: number; exp: number }>(token);
                login(response.data.token, decoded); // Actualizeaza contextul cu noul token/user data
                setMessage('Profil actualizat cu succes!');
            } else {
                // Daca nu vine token nou, ar trebui sa re-fetch user data sau sa actualizam manual contextul
                // Aici doar afisam mesaj, dar ideal ar fi sa actualizam si user-ul din context
                setMessage('Profil actualizat. Reîmprospătați pagina pentru a vedea toate modificările.');
                // TODO: Implementează o modalitate de a actualiza user-ul din context fără token nou
            }

        } catch (err: any) {
            console.error("Eroare la actualizarea profilului:", err);
            setError(err.response?.data?.message || 'A apărut o eroare la actualizare.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="profile-section-content">
            <h2>Editare Profil</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={user.email} disabled />
                    <small>Emailul nu poate fi modificat.</small>
                </div>
                <div className="form-group">
                    <label htmlFor="fullName">Nume complet:</label>
                    <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phoneNumber">Număr de telefon:</label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                {/* Adaugă aici alte câmpuri editabile */}

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Se salvează...' : 'Salvează Modificările'}
                </button>
            </form>
        </div>
    );
};

export default EditProfile;