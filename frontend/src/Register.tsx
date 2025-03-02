// frontend/src/Register.tsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Bara_navigatie from "./Bara_navigatie";

interface RegisterFormState {
    email: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    password: string;
    confirmPassword: string;
    faculty: string;
}

const Register: React.FC = () => {
    const [formState, setFormState] = useState<RegisterFormState>({
        email: "",
        fullName: "",
        phoneNumber: "",
        gender: "",
        password: "",
        confirmPassword: "",
        faculty: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { email, fullName, phoneNumber, gender, password, confirmPassword, faculty } =
            formState;

        // Validare client-side
        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }

        if (!email || !fullName || !phoneNumber || !gender) {
            setError("Toate campurile sunt obligatorii");
            return;
        }

        try {
            await axios.post("http://localhost:5000/auth/register", {
                email,
                fullName,
                phoneNumber,
                gender,
                password,
                faculty,
            });
            setSuccess("Inregistrare reusita! Te poti loga acum.");
            setTimeout(() => navigate("/login"), 2000); // Redirectioneaza dupa 2 secunde
        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la inregistrare. Poate utilizatorul exista deja.");
            }
        }
    };

    return (
        <div>
            <Bara_navigatie />
            <h1>inregistrare</h1>
            <form onSubmit={handleSubmit} className="register-form">
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Nume complet:</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formState.fullName}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Numar de telefon:</label>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={formState.phoneNumber}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{10}" // Exemplu de validare pentru 10 cifre
                        title="Introduceti un numar de telefon valid (10 cifre)"
                    />
                </div>
                <div>
                    <label>Gen:</label>
                    <select name="gender" value={formState.gender} onChange={handleChange} required>
                        <option value="">Selecteaza genul</option>
                        <option value="male">Masculin</option>
                        <option value="female">Feminin</option>
                    </select>
                </div>
                <div>
                    <label>Parola:</label>
                    <input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        title="Parola trebuie sa aiba cel putin 6 caractere"
                    />
                </div>
                <div>
                    <label>Confirma Parola:</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formState.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Facultatea:</label>
                    <input
                        type="text"
                        name="faculty"
                        value={formState.faculty}
                        onChange={handleChange}
                        required
                    />
                </div>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Inregistreaza-te</button>
            </form>
            <p>
                Ai deja un cont? <Link to="/login">Autentifica-te</Link>
            </p>
        </div>
    );
};

export default Register;
