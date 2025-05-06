import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext, Faculty } from '../../AuthContext'; // Importăm User
import axios from 'axios'; // Pentru request PATCH/PUT
import './profile_faculty.css'; // Stiluri
import jwt_decode from 'jwt-decode';
import { parseISO, isAfter, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
interface EditProfileProps {
    faculty: Faculty; // Primim datele curente ale userului
}

interface ProfileFormState {
    abreviere: string;
    emailSecretariat: string;
    fullName: string;
    medie_valid: string;
    numeRector: string;
    phoneNumber: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

const EditProfile: React.FC<EditProfileProps> = ({ faculty }) => {
    // Stări pentru câmpurile formularului, initializate cu datele userului
    const [profileFormState, setProfilFormState] = useState<ProfileFormState>({
        fullName: faculty.fullName,
        abreviere: faculty.abreviere,
        numeRector: faculty.numeRector,
        emailSecretariat: faculty.emailSecretariat,
        phoneNumber: faculty.phoneNumber,
        medie_valid: faculty.medie_valid,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });
    const initialFormStateRef = useRef<ProfileFormState>(profileFormState);
    const initialDate = initialFormStateRef.current.medie_valid;

    // Adaugă alte câmpuri pe care vrei să le permiți editării (ex: email - deși e mai complicat)
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token, loginFaculty } = useContext(AuthContext); // Avem nevoie de token pt request și login pt update context
    const navigate = useNavigate();

    useEffect(() => {
        // Când "faculty" din context se schimbă (după login), reconstruim formData
        if (!faculty) return;
        const newState: ProfileFormState = {
            fullName: faculty.fullName,
            abreviere: faculty.abreviere,
            numeRector: faculty.numeRector,
            emailSecretariat: faculty.emailSecretariat,
            phoneNumber: faculty.phoneNumber,
            medie_valid: faculty.medie_valid,
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        };
        setProfilFormState(newState);
        initialFormStateRef.current = newState;
    }, [faculty]);

    // Funcție pentru submiterea formularului
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        const { currentPassword, newPassword, confirmNewPassword, ...rest } = profileFormState;
        const wantsToChangePassword = currentPassword || newPassword || confirmNewPassword;

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
        const updatedData = {
            ...rest,
            password: newPassword,
        };

        try {
            const response = await axios.patch(
                `http://localhost:5000/faculty/edit_profile`,
                { userId: faculty._id, ...updatedData },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newToken = response.data.token;
            const decoded = jwt_decode<Faculty & { iat: number; exp: number }>(newToken);
            loginFaculty(newToken, decoded);
            setMessage("Profil actualizat cu succes!");

            setTimeout(() => navigate("/faculty_dashboard"), 3000);
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

    const handleDateChange = (date: Date | null, event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (date) {
            setProfilFormState((prevState) => ({
                ...prevState,
                medie_valid: date.toISOString(),
            }));
        }
    }

    // parseISO va lua string-ul ISO („yyyy-MM-dd” etc.) și-l transformă în Date

    const semestruDate = parseISO(profileFormState.medie_valid!);
    // doar dacă azi > semestruDate putem edita
    const canEdit = isAfter(new Date(), initialDate);
    // compară câmp cu câmp
    const isDirty = Object.entries(profileFormState).some(
        ([key, value]) =>
            // @ts-ignore – ca să poţi indexa generic
            value !== initialFormStateRef.current[key]
    );

    return (
        <div className="profile-section-content">
            <h2>Editare Profil Facultate</h2>
            <form onSubmit={handleSubmit} className="edit-profile-form">

                <div className="form-group">
                    <label htmlFor="fullName"> Denumirea completa:</label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={profileFormState.fullName}
                        onChange={handleChange}
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="abreviere"> Abrevierea facultatii:</label>
                    <input
                        type="text"
                        id="abreviere"
                        name="abreviere"
                        value={profileFormState.abreviere}
                        onChange={handleChange}
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="numeRector"> Nume rector:</label>
                    <input
                        type="text"
                        id="numeRector"
                        name="numeRector"
                        value={profileFormState.numeRector}
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="emailSecretariat"> Email secretariat:</label>
                    <input
                        type="text"
                        id="emailSecretariat"
                        name="emailSecretariat"
                        value={profileFormState.emailSecretariat}
                        onChange={handleChange}
                        disabled={isLoading}
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
                    <label htmlFor="medie_valid">Termen valabilitate medie:</label>
                    <DatePicker
                        selected={parseISO(profileFormState.medie_valid)}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        className="form-control"
                        disabled={!canEdit}
                        // nu permite azi sau zile trecute – minDate e mâine
                        minDate={addDays(new Date(), 1)}
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