import React, { useContext, useState } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import "./profile_student.css";
import { parseISO, format, isAfter } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProfileData {
    phoneNumber: string;
    password: string;
    medie: string;
    anUniversitate: string;
}

const Profile_student: React.FC = () => {
    const { user, token, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // Initializează formData și parsează medie_valid (string ISO) în yyyy-MM-dd
    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        password: "",
        phoneNumber: user?.phoneNumber || "",
        medie_valid: user?.medie_valid
            ? format(parseISO(user.medie_valid), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
    });

    const [message, setMessage] = useState("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Permite edit doar dacă azi > semestruDate
    const semestruDate = parseISO(formData.medie_valid);
    const canEditSemester = isAfter(new Date(), semestruDate);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.put(
                `http://localhost:5000/update-user/${user?._id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Actualizează contextul cu noul user
            setUser(response.data);

            setMessage("Profil actualizat cu succes!");
        } catch (error: any) {
            console.error("Eroare la actualizarea profilului:", error);
            setMessage(
                error.response?.data?.message || "Eroare la actualizarea profilului."
            );
        }
    };

    const handleReturn = () => {
        navigate("/");
    };

    return (
        <div className="profile-container">
            <h2>
                Profil{" "}
                {user?.role === "student" || user?.role === "proprietar"
                    ? "Utilizator"
                    : "Facultate"}
            </h2>

            {message && <p className="message">{message}</p>}

            <form onSubmit={handleSubmit} className="profile-form">
                {/* Nume complet */}
                <div className="form-group">
                    <label htmlFor="fullName">Nume Complet:</label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                    />
                </div>

                {/* Email */}
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                {/* Data terminare semestru */}
                <div className="form-group">
                    <label htmlFor="medie_valid">Data terminare semestru:</label>
                    <input
                        type="date"
                        id="medie_valid"
                        name="medie_valid"
                        value={formData.medie_valid}
                        onChange={handleChange}
                        disabled={!canEditSemester}
                    />
                    {!canEditSemester && (
                        <small className="hint">
                            Editabil după {format(semestruDate, "dd.MM.yyyy")}.
                        </small>
                    )}
                </div>

                {/* Parola */}
                <div className="form-group">
                    <label htmlFor="password">Parola:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Lasă gol dacă nu vrei să schimbi parola"
                    />
                </div>

                {/* Număr de Telefon */}
                <div className="form-group">
                    <label htmlFor="phoneNumber">Număr de Telefon:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                    />
                </div>

                <button type="submit" className="update-button">
                    Actualizează Profil
                </button>
            </form>

            <button onClick={handleReturn} className="return-button">
                Revenire Acasă
            </button>
        </div>
    );
};

export default Profile_student;
