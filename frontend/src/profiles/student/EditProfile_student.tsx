import React, { useState, useContext, useRef } from 'react';
import { AuthContext, User } from '../../AuthContext'; // Importăm User
import axios from 'axios'; // Pentru request PATCH/PUT
import './profile_student.css'; // Stiluri
import jwt_decode from 'jwt-decode';
import { parseISO, isAfter, format } from "date-fns";

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
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
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
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });
    const initialFormStateRef = useRef<ProfileFormState>(profileFormState);
    const initialMatricol = initialFormStateRef.current.numar_matricol;

    // Adaugă alte câmpuri pe care vrei să le permiți editării (ex: email - deși e mai complicat)
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token, login } = useContext(AuthContext); // Avem nevoie de token pt request și login pt update context

    // Funcție pentru submiterea formularului
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Dacă user a completat vreun câmp de parolă, atunci trebuie să le validezi
        const { currentPassword, newPassword, confirmNewPassword, ...rest } = profileFormState;
        const wantsToChangePassword =
            currentPassword || newPassword || confirmNewPassword;

        if (wantsToChangePassword) {
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                setError("Completează toate câmpurile pentru schimbarea parolei.");
                return;
            }
            if (newPassword !== confirmNewPassword) {
                setError("Parola nouă și confirmarea nu coincid.");
                return;
            }
            if (newPassword.length < 6) {
                setError("Parola nouă trebuie să aibă cel puțin 6 caractere.");
                return;
            }
        }

        setIsLoading(true);
        // 1. Construiești payload-ul exact din form state
        // const updatedData: ProfileFormState = { ...profileFormState };
        const updatedData = {
            ...rest,
            password: newPassword
        };

        try {
            // 2. Trimiți toate datele către backend
            const response = await axios.patch(
                `http://localhost:5000/users/edit_profile`,
                { userId: user._id, ...updatedData },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newToken = response.data.token;
            const decoded = jwt_decode<User & { iat: number; exp: number }>(newToken);
            login(newToken, decoded);
            setMessage("Profil actualizat cu succes!");

            // resetăm „dirty” pentru a putea detecta viitoare schimbări
            initialFormStateRef.current = { ...profileFormState };

        } catch (err: any) {
            console.error("Eroare la actualizare:", err);
            setError(err.response?.data?.message || "A apărut o eroare la actualizare.");
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

    const validUntil = parseISO(profileFormState.medie_valid!);
    const canEditMedie = isAfter(new Date(), validUntil);
    const formattedMedieValid = profileFormState.medie_valid
        ? format(parseISO(profileFormState.medie_valid), 'dd-MM-yyyy')
        : '';
    return (
        <div className="profile-section-content">
            <h2>Editare Profil Student</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileFormState.email}
                        onChange={handleChange}
                        disabled
                    />
                    <small>Emailul nu poate fi modificat.</small>
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
                        disabled
                    />
                </div>
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
                </div>
                <div className="form-group">
                    <label htmlFor="faculty">Facultatea:</label>
                    <input
                        type="text"
                        id="faculty"
                        name="faculty"
                        value={profileFormState.faculty}
                        onChange={handleChange}
                        disabled
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="faculty_valid">Facultatea asociata?:</label>
                    <input
                        type="text"
                        id="faculty_valid"
                        name="faculty_valid"
                        value={profileFormState.faculty_valid == true ? "Da" : "Nu"}
                        onChange={handleChange}
                        disabled
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="numar_matricol">Numar matricol:</label>
                    <input
                        type="text"
                        id="numar_matricol"
                        name="numar_matricol"
                        value={profileFormState.numar_matricol}
                        onChange={handleChange}
                        disabled={!!initialMatricol}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="anUniversitar">Anul universitar:</label>
                    <input
                        type="text"
                        id="anUniversitar"
                        name="anUniversitar"
                        value={profileFormState.anUniversitar}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="medie">Medie:</label>
                    <input
                        type="text"
                        id="medie"
                        name="medie"
                        value={profileFormState.medie}
                        onChange={handleChange}
                        disabled={!canEditMedie} // dacă nu e valabilă, nu poate fi editată
                    />
                    {!canEditMedie && (
                        <small>Medie valabilă până la {format(validUntil, "dd/MM/yyyy")}</small>
                    )}
                </div>
                <div className="form-group">
                    <label htmlFor="medie_valid">Termen valabilitate medie:</label>
                    <input
                        type="text"
                        id="medie_valid"
                        name="medie_valid"
                        value={formattedMedieValid}
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="currentPassword">Parola curentă:</label>
                    <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={profileFormState.currentPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="newPassword">Parola nouă:</label>
                    <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={profileFormState.newPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmNewPassword">Confirmă parola nouă:</label>
                    <input
                        type="password"
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        value={profileFormState.confirmNewPassword}
                        onChange={handleChange}
                    />
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