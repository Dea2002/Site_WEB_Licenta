import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext, User } from '../../AuthContext'; // Importam User
import { api } from '../../api';
import './profile_student.css'; // Stiluri
import jwt_decode from 'jwt-decode';
import { parseISO, isAfter, format } from "date-fns";
import { useNavigate } from "react-router-dom";

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
    // Stari pentru campurile formularului, initializate cu datele userului
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
    const initialMedie = initialFormStateRef.current.medie;

    // Adauga alte campuri pe care vrei sa le permiti editarii (ex: email - desi e mai complicat)
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token, login } = useContext(AuthContext); // Avem nevoie de token pt request si login pt update context
    const navigate = useNavigate();

    useEffect(() => {
        // Cand "user" din context se schimba (dupa login), reconstruim formData
        if (!user) return;
        console.log("User updated:", user);
        const newState: ProfileFormState = {
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
        };
        setProfilFormState(newState);
        initialFormStateRef.current = newState;
    }, [user]);

    // Functie pentru submiterea formularului
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        let medieEdited = false;
        let medieRange = "";
        // validarea mediei introduse
        if (profileFormState.medie !== initialMedie) {
            const medieNum = parseFloat(profileFormState.medie!.replace(',', '.'));
            if (isNaN(medieNum) || medieNum < 5.0 || medieNum > 10.0) {
                setError("Medie invalida. Trebuie sa fie intre 5.0 si 10.0.");
                return;
            }

            if (!profileFormState.numar_matricol) {
                setError("Numar matricol gol, va rugam completati acest camp.");
                return;
            }

            medieEdited = true;
            if (medieNum >= 9.5) {
                medieRange = "Categoria 1: (9.50 - 10.00)";
            } else if (medieNum >= 9.0) {
                medieRange = "Categoria 2: (9.00 - 9.49)";
            } else if (medieNum >= 8.5) {
                medieRange = "Categoria 3: (8.50 - 8.99)";
            } else if (medieNum >= 5.0) {
                medieRange = "Categoria 4: (5.00 - 8.49)";
            }
        }

        // Daca user a completat vreun camp de parola, atunci trebuie sa le validezi
        const { currentPassword, newPassword, confirmNewPassword, ...rest } = profileFormState;
        const wantsToChangePassword = currentPassword || newPassword || confirmNewPassword;

        if (wantsToChangePassword) {
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                setError("Completeaza toate campurile pentru schimbarea parolei.");
                return;
            }
            if (newPassword !== confirmNewPassword) {
                setError("Parola noua si confirmarea nu coincid.");
                return;
            }
            if (newPassword.length < 6) {
                setError("Parola noua trebuie sa aiba cel putin 6 caractere.");
                return;
            }
        }

        setIsLoading(true);
        let updatedData = {}
        // 1. Construiesti payload-ul exact din form state
        // const updatedData: ProfileFormState = { ...profileFormState };
        if (profileFormState.medie !== initialMedie) {
            updatedData = {
                ...rest,
                password: newPassword,
                medie: medieRange,
                medieEdited: medieEdited
            };

        } else {
            updatedData = {
                ...rest, password: newPassword
            }
        }

        try {
            // 2. Trimiti toate datele catre backend
            const response = await api.patch(
                `/users/edit_profile`,
                { userId: user._id, ...updatedData },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newToken = response.data.token;
            const decoded = jwt_decode<User & { iat: number; exp: number }>(newToken);
            login(newToken, decoded);
            setMessage("Profil actualizat cu succes!");

            // resetam „dirty” pentru a putea detecta viitoare schimbari
            // initialFormStateRef.current = { ...profileFormState };
            setTimeout(() => navigate("/home"), 3000);
        } catch (err: any) {
            console.error("Eroare la actualizare:", err);
            setError(err.response?.data?.message || "A aparut o eroare la actualizare.");
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
            // @ts-ignore – ca sa poţi indexa generic
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
                        disabled={!canEditMedie} // daca nu e valabila, nu poate fi editata
                    />
                    {!canEditMedie && (
                        <small>Medie valabila pana la {format(validUntil, "dd/MM/yyyy")}</small>
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
                    <label htmlFor="currentPassword">Parola curenta:</label>
                    <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={profileFormState.currentPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="newPassword">Parola noua:</label>
                    <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={profileFormState.newPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmNewPassword">Confirma parola noua:</label>
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
                    {isLoading ? 'Se salveaza...' : 'Salveaza Modificarile'}
                </button>
            </form>
        </div>
    );
};

export default EditProfile;