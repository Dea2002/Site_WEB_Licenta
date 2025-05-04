import React, { useState, useContext, useRef } from 'react';
import { AuthContext, User } from '../../AuthContext'; // Importăm User
import axios from 'axios'; // Pentru request PATCH/PUT
import './profile_faculty.css'; // Stiluri
import jwt_decode from 'jwt-decode';
import { parseISO, isAfter } from "date-fns";

interface EditProfileProps {
    user: User; // Primim datele curente ale userului
}

interface ProfileFormState {
    fullName: string;
    email: string;
    phoneNumber: string;
    faculty?: string;
    faculty_valid?: boolean;
    numar_matricol?: string;
    anUniversitar?: string;
    medie?: string;
    medie_valid?: string;
};

const EditProfile: React.FC<EditProfileProps> = ({ user }) => {
    // Stări pentru câmpurile formularului, initializate cu datele userului
    const [profileFormState, setProfilFormState] = useState<ProfileFormState>({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        faculty: user.faculty,
        faculty_valid: user.faculty_valid,
        numar_matricol: user.numar_matricol,
        anUniversitar: user.anUniversitar,
        medie: user.medie,
        medie_valid: user.medie_valid,
    });
    const initialFormStateRef = useRef<ProfileFormState>(profileFormState);

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

        const updatedData: ProfileFormState = { ...profileFormState };

        try {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfilFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));

        setError("");
    }

    // parseISO va lua string-ul ISO („yyyy-MM-dd” etc.) și-l transformă în Date
    const semestruDate = parseISO(profileFormState.medie_valid!);
    // doar dacă azi > semestruDate putem edita
    const canEdit = isAfter(new Date(), semestruDate);
    // compară câmp cu câmp
    const isDirty = Object.entries(profileFormState).some(
        ([key, value]) =>
            // @ts-ignore – ca să poţi indexa generic
            value !== initialFormStateRef.current[key]
    );

    return (
        <div className="profile-section-content">
            <h2>Editare Profil</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                    <label htmlFor="phoneNumber">Număr de telefon:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={profileFormState.phoneNumber}
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </div><div className="form-group">
                    <label htmlFor="medie_valid">Termen valabilitate medie:</label>
                    <input
                        type="date"
                        id="medie_valid"
                        name="medie_valid"
                        value={profileFormState.medie_valid ? profileFormState.medie_valid!.substring(0, 10) : ''}
                        onChange={handleChange}
                        disabled={!canEdit}
                    />
                    {!canEdit && (
                        <small>Termenul de valabilitate al mediei nu a fost depasit inca.</small>
                    )}
                </div>

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading || !isDirty}
                >
                    {isLoading ? 'Se salvează...' : 'Salvează Modificările'}
                </button>
            </form>
        </div>
    );
};

export default EditProfile;