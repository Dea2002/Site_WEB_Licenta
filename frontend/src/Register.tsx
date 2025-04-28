import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Bara_navigatie from "./Bara_navigatie";
import "./Register.css"; // Import a CSS file for styling (create if needed)

// Keep your existing student form state interface
interface RegisterFormState {
    email: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    password: string;
    confirmPassword: string;
    faculty: string;
}

// Define possible roles
type Role = "student" | "proprietar" | "facultate" | null;

const Register: React.FC = () => {
    // --- START: New State for Role Selection ---
    const [selectedRole, setSelectedRole] = useState<Role>(null); // Initially no role selected
    // --- END: New State ---

    // Existing student form state
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

    // Existing change handler for student form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        setError(""); // Clear errors on change
    };

    // Existing submit handler for student form
    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Clear previous errors
        setSuccess("");
        const { email, fullName, phoneNumber, gender, password, confirmPassword, faculty } =
            formState;

        if (password !== confirmPassword) {
            setError("Parolele nu se potrivesc");
            return;
        }
        if (!email || !fullName || !phoneNumber || !gender || !faculty) {
            // Added faculty check
            setError("Toate câmpurile sunt obligatorii pentru studenți");
            return;
        }
        if (password.length < 6) {
            setError("Parola trebuie să aibă cel puțin 6 caractere");
            return;
        }

        try {
            await axios.post("http://localhost:5000/auth/register", {
                // Assuming this endpoint is for students
                email,
                fullName,
                phoneNumber,
                gender,
                password,
                faculty,
                role: "student", // Explicitly send role if needed by backend
            });
            setSuccess("Inregistrare reusita! Vei fi redirectionat către pagina de login.");
            // Reset form state might be good here
            setFormState({
                email: "",
                fullName: "",
                phoneNumber: "",
                gender: "",
                password: "",
                confirmPassword: "",
                faculty: "",
            });
            setTimeout(() => navigate("/login"), 3000); // Redirect after 3 seconds
        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError("Eroare la înregistrare. Emailul ar putea fi deja folosit.");
            }
        }
    };

    // --- START: Function to render content based on role ---
    const renderContent = () => {
        // If no role is selected, show the role selection buttons
        if (!selectedRole) {
            return (
                <div className="role-selection-container">
                    <h2>Alege rolul pentru crearea contului:</h2>
                    <div className="role-buttons">
                        <button
                            className="role-button student"
                            onClick={() => setSelectedRole("student")}
                        >
                            Student
                        </button>
                        <button
                            className="role-button proprietar"
                            onClick={() => setSelectedRole("proprietar")}
                        >
                            Proprietar
                        </button>
                        <button
                            className="role-button facultate"
                            onClick={() => setSelectedRole("facultate")}
                        >
                            Facultate
                        </button>
                    </div>
                </div>
            );
        }

        // If student role is selected, show the student registration form
        if (selectedRole === "student") {
            return (
                <div className="register-container student-form">
                    {" "}
                    {/* Added class */}
                    <h1>Înregistrare Student</h1>
                    <form onSubmit={handleStudentSubmit} className="register-form">
                        {/* --- Student Form Fields (Existing) --- */}
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
                            <label>Număr de telefon:</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formState.phoneNumber}
                                onChange={handleChange}
                                required
                                pattern="[0-9]{10}"
                                title="Introduceți un număr de telefon valid (10 cifre)"
                            />
                        </div>
                        <div>
                            <label>Gen:</label>
                            <select
                                name="gender"
                                value={formState.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selectează genul</option>
                                <option value="male">Masculin</option>
                                <option value="female">Feminin</option>
                            </select>
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
                        <div>
                            <label>Parolă:</label>
                            <input
                                type="password"
                                name="password"
                                value={formState.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                title="Parola trebuie să aibă cel puțin 6 caractere"
                            />
                        </div>
                        <div>
                            <label>Confirmă Parola:</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formState.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {error && <p className="error">{error}</p>}
                        {success && <p className="success">{success}</p>}
                        <button type="submit">Înregistrează-te ca Student</button>
                        {/* Link back to role selection */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole(null)}
                            className="back-button"
                        >
                            Înapoi la selecția rolului
                        </button>
                    </form>
                </div>
            );
        }

        // If Proprietar role is selected, show placeholder
        if (selectedRole === "proprietar") {
            return (
                <div className="register-container owner-form">
                    {" "}
                    {/* Added class */}
                    <h1>Înregistrare Proprietar</h1>
                    <p>Formularul specific pentru proprietari va fi implementat aici.</p>
                    {/* Add owner form fields when ready */}
                    <button
                        type="button"
                        onClick={() => setSelectedRole(null)}
                        className="back-button"
                    >
                        Înapoi la selecția rolului
                    </button>
                </div>
            );
        }

        // If Facultate role is selected, show placeholder
        if (selectedRole === "facultate") {
            return (
                <div className="register-container faculty-form">
                    {" "}
                    {/* Added class */}
                    <h1>Înregistrare Facultate</h1>
                    <p>Formularul specific pentru facultăți va fi implementat aici.</p>
                    {/* Add faculty form fields when ready */}
                    <button
                        type="button"
                        onClick={() => setSelectedRole(null)}
                        className="back-button"
                    >
                        Înapoi la selecția rolului
                    </button>
                </div>
            );
        }

        // Should not happen, but return null as a fallback
        return null;
    };
    // --- END: Function to render content ---

    return (
        // Use a main container for overall page styling if needed
        <div className="register-page-container">
            <Bara_navigatie />
            {/* Conditionally render content based on selected role */}
            <div key={selectedRole || "selection"} className="content-area">
                {renderContent()}
            </div>

            {/* Keep the "Already have an account?" link, visible always or only when a form is shown */}
            {selectedRole && ( // Only show if a role is selected (form is visible)
                <p className="login-link-text">
                    Ai deja un cont?{" "}
                    <Link to="/login" className="custom-link">
                        Autentifică-te
                    </Link>
                </p>
            )}
        </div>
    );
};

export default Register;
