import React, { useContext, useState } from "react";
import { AuthContext } from "./AuthContext";
import axios from "axios";
import "./profile.css";
import { useNavigate } from "react-router-dom";
import { parseISO, format, isAfter } from "date-fns";

const Profile: React.FC = () => {
    const { user, setUser, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // Initializeaza starea formularului cu datele utilizatorului
    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        password: "",
        phoneNumber: user?.phoneNumber || "",
        medie_valid: format(user!.medie_valid, "yyyy-MM-dd")
        ,
    });

    // Mesaj pentru feedback-ul utilizatorului
    const [message, setMessage] = useState("");

    // Handle pentru schimbarea valorilor din formular
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const canEditSemester = isAfter(new Date(), user!.medie_valid);

    // Handle pentru trimiterea formularului
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Trimite cererea de actualizare a utilizatorului la backend
            const response = await axios.put(
                `http://localhost:5000/update-user/${user?._id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            // Actualizeaza contextul cu datele actualizate ale utilizatorului
            setUser(response.data);

            // Afiseaza mesajul de succes
            setMessage("Profil actualizat cu succes!");
        } catch (error: any) {
            console.error("Eroare la actualizarea profilului:", error);
            // Afiseaza mesajul de eroare
            setMessage(error.response?.data?.message || "Eroare la actualizarea profilului.");
        }
    };

    // Handle pentru revenirea la pagina de Acasa
    const handleReturn = () => {
        navigate("/");
    };

    return (
        <div className="profile-container">
            <h2>Profil {user?.role === "student" || user?.role === "proprietar" ? "Utilizator" : "Facultate"}</h2>

            {/* Afiseaza mesajele de feedback */}
            {message && <p className="message">{message}</p>}

            {/* Formularul de actualizare a profilului */}
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
                    //required
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
                    //required
                    />
                </div>

                <label htmlFor="medie_valid">Data terminare semestru:</label>
                <input
                    type="date"
                    id="medie_valid"
                    name="medie_valid"
                    value={formData.medie_valid}
                    onChange={handleChange}
                    disabled={!canEditSemester}
                    min={format(new Date(), "yyyy-MM-dd")}
                />
                {!canEditSemester && (
                    <small className="hint">Acest camp va fi editabil dupa {format(parseISO(formData.medie_valid), "dd.MM.yyyy")}</small>
                )}

                {/* Parola */}
                <div className="form-group">
                    <label htmlFor="password">Parola:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Lasa gol daca nu vrei sa schimbi parola"
                    />
                </div>

                {/* Numar de Telefon */}
                <div className="form-group">
                    <label htmlFor="phoneNumber">Numar de Telefon:</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                    //required
                    />
                </div>

                {/* Butonul de actualizare */}
                <button type="submit" className="update-button">
                    Actualizeaza Profil
                </button>
            </form>

            {/* Butonul de revenire la Acasa */}
            <button onClick={handleReturn} className="return-button">
                Revenire Acasa
            </button>
        </div>
    );
};

export default Profile;
