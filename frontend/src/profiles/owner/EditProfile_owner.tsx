import React, { useState, useContext } from 'react';
import { AuthContext, User } from '../../AuthContext'; // Importăm User
import axios from 'axios'; // Pentru request PATCH/PUT
import './profile_owner.css'; // Stiluri
import jwt_decode from 'jwt-decode';

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfilFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));

        setError("");
    }


    return (
        <div className="profile-section-content">
            <h2>Editare Profil</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={profileFormState.email}
                        onChange={handleChange}
                    // disabled
                    />
                    {/* <small>Emailul nu poate fi modificat.</small> */}
                </div>
                <div className="form-group">
                    <label htmlFor="fullName">Nume complet:</label>
                    <input
                        type="text"
                        id="fullName"
                        value={profileFormState.fullName}
                        onChange={handleChange}
                        required
                    // disabled
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phoneNumber">Număr de telefon:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        value={profileFormState.phoneNumber}
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </div>

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