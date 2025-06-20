import React, { useState, useContext, useRef } from 'react';
import { AuthContext, User } from '../../AuthContext';
import { api } from '../../api';
import './profile_owner.css';
import jwt_decode from 'jwt-decode';

interface EditProfileProps {
    user: User;
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

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token, login } = useContext(AuthContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        const updatedData = {


        };

        try {
            const response = await api.patch(
                `/users/me`,
                updatedData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.token) {
                const { token } = response.data;
                const decoded = jwt_decode<User & { iat: number; exp: number }>(token);
                login(response.data.token, decoded);
                setMessage('Profil actualizat cu succes!');
            } else {
                setMessage('Profil actualizat. Reimprospatati pagina pentru a vedea toate modificarile.');
            }

        } catch (err: any) {
            console.error("Eroare la actualizarea profilului:", err);
            setError(err.response?.data?.message || 'A aparut o eroare la actualizare.');
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

    const isDirty = Object.entries(profileFormState).some(
        ([key, value]) =>
            // @ts-ignore – ca sa poti indexa generic
            value !== initialFormStateRef.current[key]
    );
    return (
        <div className="profile-section-content">
            <h2>Editare Profil</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileFormState.email}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="fullName">Nume complet:</label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={profileFormState.fullName}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phoneNumber">Numar de telefon:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={profileFormState.phoneNumber}
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </div>

                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading || !isDirty}
                >
                    {isLoading ? 'Se salveaza...' : 'Salveaza Modificarile'}
                </button>
            </form>
        </div>
    );
};

export default EditProfile;